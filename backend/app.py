import io
import os
import re
import subprocess
from functools import lru_cache

from dotenv import load_dotenv
import librosa
import numpy as np
import pronouncing
import torch
import torch.nn as nn
import torchaudio
from fastapi import FastAPI, Body, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from huggingface_hub import hf_hub_download
from transformers import HubertModel, Wav2Vec2FeatureExtractor

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
try:
    from .gemini_chat_router import router as chat_router
except ImportError:
    from gemini_chat_router import router as chat_router


PHONEMES = sorted([
    "AA", "AE", "AH", "AO", "AW", "AY", "B", "CH", "D", "DH", "EH", "ER",
    "EY", "F", "G", "HH", "IH", "IY", "JH", "K", "L", "M", "N", "NG",
    "OW", "OY", "P", "R", "S", "SH", "T", "TH", "UH", "UW", "V", "W", "Y", "Z", "ZH",
])

PHONE_TO_INDEX = {phone: index for index, phone in enumerate(PHONEMES)}
PHONE_TO_INDEX["<blank>"] = len(PHONE_TO_INDEX)
INDEX_TO_PHONE = {index: phone for phone, index in PHONE_TO_INDEX.items()}
BLANK_INDEX = PHONE_TO_INDEX["<blank>"]
VOCAB_SIZE = len(PHONE_TO_INDEX)
SAMPLE_RATE = 16000

MODEL_REPO = os.getenv("HF_MODEL_REPO", "akshithawork1422/neurospace")
MODEL_FILE = os.getenv("HF_MODEL_FILE", "best_cmu_93.2pct.pt")
HUBERT_PATH = os.getenv("HF_HUBERT_MODEL", "facebook/hubert-large-ls960-ft")
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

FEEDBACK = {
    "AH": ("Short 'uh' sound", "Relax your mouth and say 'uh' like in 'cup'. Keep it short and soft."),
    "AE": ("Short 'a' sound", "Open your mouth wide and say 'a' like in 'cat'. Your jaw should drop down."),
    "AA": ("Open 'ah' sound", "Open your mouth wide and say 'ah' like at the doctor. Relax your tongue flat."),
    "AO": ("'aw' sound", "Round your lips slightly and say 'aw' like in 'ball'."),
    "AW": ("'ow' sound", "Start with an open mouth and round your lips as you finish, like in 'cow'."),
    "AY": ("Long 'i' sound", "Start with an open 'ah' and glide to 'ee', like in 'my'."),
    "B": ("'b' sound", "Press your lips together, then pop them apart with your voice on, like in 'ball'."),
    "CH": ("'ch' sound", "Press the tip of your tongue behind your top teeth and push air out, like in 'cheese'."),
    "D": ("'d' sound", "Tap the tip of your tongue behind your top teeth with your voice on, like in 'dog'."),
    "DH": ("'th' sound (voiced)", "Put your tongue gently between your teeth and buzz your voice, like in 'the'."),
    "EH": ("Short 'e' sound", "Smile slightly and say 'eh' like in 'bed'. Your mouth is slightly open."),
    "ER": ("'er' sound", "Curl your tongue back slightly and say 'er' like in 'bird'."),
    "EY": ("Long 'a' sound", "Start with 'eh' and glide your tongue up to 'ee', like in 'day'."),
    "F": ("'f' sound", "Touch your top teeth lightly to your bottom lip and blow air through, like in 'fish'."),
    "G": ("'g' sound", "Raise the back of your tongue to the roof of your mouth and pop it with voice, like in 'go'."),
    "HH": ("'h' sound", "Just breathe out gently with your mouth open, like you are fogging up a mirror."),
    "IH": ("Short 'i' sound", "Relax your lips slightly and say 'ih' like in 'sit'. It is shorter than 'ee'."),
    "IY": ("Long 'ee' sound", "Spread your lips into a smile and say 'ee' like in 'see'. Keep your tongue high."),
    "JH": ("'j' sound", "Press your tongue behind your top teeth and buzz your voice as you release, like in 'jump'."),
    "K": ("'k' sound", "Raise the back of your tongue and pop it without your voice, like in 'cat'."),
    "L": ("'l' sound", "Place the tip of your tongue behind your top teeth and hum your voice, like in 'lamp'."),
    "M": ("'m' sound", "Press your lips together and hum through your nose, like in 'moon'."),
    "N": ("'n' sound", "Touch the tip of your tongue behind your top teeth and hum through your nose, like in 'no'."),
    "NG": ("'ng' sound", "Raise the back of your tongue to the roof of your mouth and hum, like in 'sing'."),
    "OW": ("Long 'o' sound", "Start with your mouth open and round your lips as you finish, like in 'go'."),
    "OY": ("'oy' sound", "Start with rounded lips and glide to a smile, like in 'boy'."),
    "P": ("'p' sound", "Press your lips together and pop them apart without your voice, like in 'pop'."),
    "R": ("'r' sound", "Curl the tip of your tongue back slightly without touching anything, like in 'run'."),
    "S": ("'s' sound", "Put your teeth together and push air through, making a hissing sound, like in 'sun'."),
    "SH": ("'sh' sound", "Round your lips slightly and push air through to make a shushing sound, like in 'ship'."),
    "T": ("'t' sound", "Tap the tip of your tongue behind your top teeth and push air out without voice, like in 'top'."),
    "TH": ("'th' sound (soft)", "Stick your tongue gently between your teeth and blow air through without voice, like in 'think'."),
    "UH": ("Short 'oo' sound", "Round your lips slightly and say 'uh' like in 'book'. Keep it short."),
    "UW": ("Long 'oo' sound", "Round your lips into a circle and say 'oo' like in 'moon'. Push your lips forward."),
    "V": ("'v' sound", "Touch your top teeth to your bottom lip and buzz your voice through, like in 'van'."),
    "W": ("'w' sound", "Round your lips tightly and then open them as you say the sound, like in 'wet'."),
    "Y": ("'y' sound", "Spread your lips and let air flow freely, like in 'yes'. Your tongue stays low."),
    "Z": ("'z' sound", "Put your teeth together and buzz your voice through, like a bee, like in 'zoo'."),
    "ZH": ("'zh' sound", "Round your lips and buzz your voice, like in 'measure'."),
}


class HuBERTPhonemeModel(nn.Module):
    def __init__(self, hubert, vocab_size):
        super().__init__()
        self.hubert = hubert
        hidden_size = hubert.config.hidden_size
        self.hubert.feature_extractor._freeze_parameters()
        self.projection = nn.Sequential(
            nn.Linear(hidden_size, 512),
            nn.GELU(),
            nn.Dropout(0.1),
            nn.Linear(512, vocab_size),
        )

    def forward(self, input_values, attention_mask=None):
        hidden = self.hubert(input_values, attention_mask=attention_mask).last_hidden_state
        return self.projection(hidden)


def word_to_phonemes(word):
    words = re.findall(r"[a-zA-Z']+", word.lower())
    phonemes = []

    for raw_word in words:
        if not raw_word:
            continue
        phones_list = pronouncing.phones_for_word(raw_word)
        if not phones_list:
            return []
        phones = [phone.rstrip("012") for phone in phones_list[0].split()]
        cleaned = [phone for phone in phones if phone in PHONE_TO_INDEX]
        if not cleaned:
            return []
        phonemes.extend(cleaned)

    return phonemes


def levenshtein_alignment(expected, detected):
    rows = len(expected)
    cols = len(detected)
    matrix = np.zeros((rows + 1, cols + 1), dtype=int)

    for row in range(rows + 1):
        matrix[row][0] = row
    for col in range(cols + 1):
        matrix[0][col] = col

    for row in range(1, rows + 1):
        for col in range(1, cols + 1):
            cost = 0 if expected[row - 1] == detected[col - 1] else 1
            matrix[row][col] = min(
                matrix[row - 1][col] + 1,
                matrix[row][col - 1] + 1,
                matrix[row - 1][col - 1] + cost,
            )

    aligned_expected = []
    aligned_detected = []
    row = rows
    col = cols

    while row > 0 or col > 0:
        if row > 0 and col > 0 and matrix[row][col] == matrix[row - 1][col - 1] + (0 if expected[row - 1] == detected[col - 1] else 1):
            aligned_expected.append(expected[row - 1])
            aligned_detected.append(detected[col - 1])
            row -= 1
            col -= 1
        elif row > 0 and matrix[row][col] == matrix[row - 1][col] + 1:
            aligned_expected.append(expected[row - 1])
            aligned_detected.append("-")
            row -= 1
        else:
            aligned_expected.append("-")
            aligned_detected.append(detected[col - 1])
            col -= 1

    return list(reversed(aligned_expected)), list(reversed(aligned_detected)), int(matrix[rows][cols])


def load_with_pydub(data):
    try:
        from pydub import AudioSegment
    except ImportError as exc:
        raise RuntimeError("pydub is not installed") from exc

    audio_segment = AudioSegment.from_file(io.BytesIO(data))
    wav_io = io.BytesIO()
    audio_segment.export(wav_io, format="wav")
    wav_io.seek(0)
    waveform, sample_rate = torchaudio.load(wav_io)
    return waveform, sample_rate


def load_with_ffmpeg(data):
    ffmpeg_cmd = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        "pipe:0",
        "-ar",
        str(SAMPLE_RATE),
        "-ac",
        "1",
        "-f",
        "wav",
        "pipe:1",
    ]
    try:
        completed = subprocess.run(
            ffmpeg_cmd,
            input=data,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
        )
    except FileNotFoundError as exc:
        raise RuntimeError("ffmpeg is not installed or not found on PATH. Install ffmpeg and add it to your PATH.") from exc
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"ffmpeg failed to decode audio: {exc.stderr.decode('utf-8', errors='ignore')}" ) from exc

    return torchaudio.load(io.BytesIO(completed.stdout))


def load_audio_from_bytes(data):
    try:
        waveform, sample_rate = torchaudio.load(io.BytesIO(data))
        return waveform, sample_rate
    except Exception:
        pass

    try:
        samples, sample_rate = librosa.load(io.BytesIO(data), sr=None, mono=False)
        if isinstance(samples, np.ndarray) and samples.ndim == 1:
            samples = np.expand_dims(samples, axis=0)
        waveform = torch.tensor(samples, dtype=torch.float32)
        return waveform, sample_rate
    except Exception:
        pass

    try:
        return load_with_pydub(data)
    except Exception:
        pass

    try:
        return load_with_ffmpeg(data)
    except Exception as exc:
        raise RuntimeError("All audio decoding fallbacks failed") from exc


@lru_cache(maxsize=1)
def get_runtime():
    checkpoint_path = hf_hub_download(repo_id=MODEL_REPO, filename=MODEL_FILE)
    feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(HUBERT_PATH)
    hubert = HubertModel.from_pretrained(HUBERT_PATH)

    try:
        checkpoint = torch.load(checkpoint_path, map_location=DEVICE, weights_only=False)
    except TypeError:
        checkpoint = torch.load(checkpoint_path, map_location=DEVICE)

    if isinstance(checkpoint, dict) and "phone2idx" in checkpoint:
        phone2idx = checkpoint["phone2idx"]
        global PHONE_TO_INDEX, INDEX_TO_PHONE, BLANK_INDEX, VOCAB_SIZE
        PHONE_TO_INDEX = dict(phone2idx)
        INDEX_TO_PHONE = {index: phone for phone, index in PHONE_TO_INDEX.items()}
        BLANK_INDEX = PHONE_TO_INDEX.get("<blank>", len(PHONE_TO_INDEX))
        VOCAB_SIZE = len(PHONE_TO_INDEX)

    model = HuBERTPhonemeModel(hubert, VOCAB_SIZE).to(DEVICE)
    state_dict = checkpoint["model"] if isinstance(checkpoint, dict) and "model" in checkpoint else checkpoint
    model.load_state_dict(state_dict)
    model.eval()

    return feature_extractor, model


def generate_chat_response(question: str) -> str:
    q = question.strip().lower()
    if not q:
        return "Please ask a question about speech analysis, target words, phoneme errors, or the practice workflow."

    if any(term in q for term in ["hello", "hi", "hey", "good morning", "good afternoon"]):
        return "Hi! I can help with speech analysis, target words, phoneme errors, and the practice workflow. Ask me anything."

    if any(term in q for term in ["target word", "target phrase", "word", "phrase"]):
        return "The target word tells the system which expected phoneme sequence to compare against. Use a clear word or phrase, then upload or record audio for analysis."

    if any(term in q for term in ["audio", "upload", "record", "file", "wav", "mp3"]):
        return "Use the app's audio upload or record controls. The backend converts your audio to WAV and detects phonemes with HuBERT."

    if any(term in q for term in ["error", "phoneme", "substitution", "omission", "insertion", "per"]):
        return "The app detects phoneme substitutions, omissions, and insertions. Focus practice on the error phonemes shown in feedback to improve quickly."

    if any(term in q for term in ["feedback", "practice", "exercise", "tts", "listen", "repeat"]):
        return "After analysis, review the feedback page for the error phonemes and practice tips. Use the listen-and-repeat prompts to rehearse the sounds."

    if any(term in q for term in ["report", "clinical", "print", "download"]):
        return "The report page summarizes accuracy, phoneme errors, and recommendations so you can track progress and share results with a therapist."

    if any(term in q for term in ["model", "huggingface", "backend", "api", "hubert", "phoneme model"]):
        return "This app uses a local HuBERT phoneme model for speech analysis and a backend chat endpoint for guidance."

    return "I can help with speech analysis, target words, phoneme practice, and how to use the app. Please ask me about those areas."


def decode_audio(data):
    waveform, sample_rate = load_audio_from_bytes(data)

    if waveform.ndim > 1 and waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0)
    else:
        waveform = waveform.squeeze(0)

    if sample_rate != SAMPLE_RATE:
        waveform = torchaudio.functional.resample(waveform, sample_rate, SAMPLE_RATE)

    if waveform.shape[0] > 10 * SAMPLE_RATE:
        waveform = waveform[:10 * SAMPLE_RATE]

    feature_extractor, model = get_runtime()
    inputs = feature_extractor(waveform.numpy(), sampling_rate=SAMPLE_RATE, return_tensors="pt", padding=True)
    input_values = inputs.input_values.to(DEVICE)

    with torch.no_grad():
        logits = model(input_values)
        predictions = logits.argmax(dim=-1)[0].cpu().numpy()

    decoded = []
    previous = None
    for prediction in predictions:
        if prediction != BLANK_INDEX and prediction != previous:
            decoded.append(INDEX_TO_PHONE.get(int(prediction), "?"))
        previous = prediction

    return decoded


def wrap_phone(phone):
    return f"/{phone}/" if phone and phone != "-" else "-"


def status_from_alignment(expected_phone, detected_phone):
    if expected_phone == detected_phone:
        return "correct"
    if expected_phone == "-":
        return "insertion"
    if detected_phone == "-":
        return "omission"
    return "substitution"


def build_summary(accuracy, error_count):
    if accuracy >= 90:
        emoji = "star"
        grade = "Excellent"
        message = "Pronunciation is very close to the target word."
    elif accuracy >= 75:
        emoji = "thumbs-up"
        grade = "Good progress"
        message = "A few phonemes need refinement, but the overall production is strong."
    elif accuracy >= 50:
        emoji = "practice"
        grade = "Keep practicing"
        message = "Several phonemes are close, and targeted drills should help quickly."
    else:
        emoji = "retry"
        grade = "Try again"
        message = "The word needs a slower, more deliberate repetition."

    if error_count == 0:
        message = "All expected phonemes were detected correctly."

    return {
        "emoji": emoji,
        "grade": grade,
        "message": message,
    }


def build_recommendations(feedback_items, target_word):
    recommendations = []
    for item in feedback_items:
        recommendations.append(f"Practice {item['phoneme_label']} in isolation before repeating '{target_word}'.")
    recommendations.append(f"Repeat '{target_word}' three times slowly, then three times at natural speed.")
    recommendations.append("Record a fresh attempt after feedback and compare the phoneme alignment again.")
    return recommendations[:5]


app = FastAPI(title="SpeechSense NeuroSpeech API")
app.include_router(chat_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "model_repo": MODEL_REPO,
        "model_file": MODEL_FILE,
        "device": str(DEVICE),
    }


@app.post("/api/analyze")
async def analyze(audio: UploadFile = File(...), target_word: str = Form(...)):
    clean_target_word = target_word.strip()
    if not clean_target_word:
        raise HTTPException(status_code=400, detail="Target word is required.")

    payload = await audio.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Audio file is required.")

    try:
        detected = decode_audio(payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to decode audio: {exc}") from exc

    if not detected:
        raise HTTPException(status_code=422, detail="No phonemes were detected from the audio.")

    expected = word_to_phonemes(clean_target_word)
    if not expected:
        return JSONResponse({
            "target_word": clean_target_word,
            "expected_phonemes": [],
            "detected_phonemes": detected,
            "alignment": [],
            "phoneme_errors": [],
            "feedback": [],
            "all_phonemes": [],
            "accuracy": None,
            "per": None,
            "summary": {
                "emoji": "info",
                "grade": "Detected phonemes only",
                "message": f"Expected phonemes were not found for '{clean_target_word}'.",
            },
            "recommendations": [
                "Try a common English target word that exists in the pronunciation dictionary.",
                "Use upload audio or re-record slowly for clearer phoneme detection.",
            ],
        })

    aligned_expected, aligned_detected, edit_distance = levenshtein_alignment(expected, detected)
    error_items = []
    all_phonemes = []
    feedback_items = []
    seen_feedback = set()
    correct_count = 0

    for expected_phone, detected_phone in zip(aligned_expected, aligned_detected):
        status = status_from_alignment(expected_phone, detected_phone)

        if expected_phone == "-" and detected_phone != "-":
            all_phonemes.append({
                "ph": wrap_phone(detected_phone),
                "acc": 0,
                "err": "Insertion",
                "words": clean_target_word,
            })
            continue

        if status == "correct":
            correct_count += 1
            all_phonemes.append({
                "ph": wrap_phone(expected_phone),
                "acc": 100,
                "err": "Correct",
                "words": clean_target_word,
            })
            continue

        accuracy = 0
        if status == "substitution":
            error_label = f"Substitution ({wrap_phone(detected_phone)})"
        elif status == "omission":
            error_label = "Omission"
        else:
            error_label = "Insertion"

        all_phonemes.append({
            "ph": wrap_phone(expected_phone),
            "acc": accuracy,
            "err": error_label,
            "words": clean_target_word,
        })

        error_item = {
            "word": clean_target_word,
            "phoneme": wrap_phone(expected_phone),
            "type": status,
            "produced": wrap_phone(detected_phone) if detected_phone != "-" else "(missed)",
            "expected": expected_phone,
            "detected": detected_phone if detected_phone != "-" else None,
            "accuracy": accuracy,
        }

        if expected_phone in FEEDBACK:
            title, tip = FEEDBACK[expected_phone]
            error_item["tip_title"] = title
            error_item["tip"] = tip
            if expected_phone not in seen_feedback:
                seen_feedback.add(expected_phone)
                feedback_items.append({
                    "phoneme": expected_phone,
                    "phoneme_label": wrap_phone(expected_phone),
                    "title": title,
                    "tip": tip,
                    "issue": status,
                })

        error_items.append(error_item)

    alignment = []
    for expected_phone, detected_phone in zip(aligned_expected, aligned_detected):
        alignment.append({
            "expected": wrap_phone(expected_phone) if expected_phone != "-" else "(extra)",
            "detected": wrap_phone(detected_phone) if detected_phone != "-" else "(missed)",
            "status": status_from_alignment(expected_phone, detected_phone),
        })

    total_expected = max(len(expected), 1)
    accuracy = round((correct_count / total_expected) * 100, 2)
    per = round((edit_distance / total_expected) * 100, 2)

    return JSONResponse({
        "target_word": clean_target_word,
        "expected_phonemes": expected,
        "detected_phonemes": detected,
        "alignment": alignment,
        "phoneme_errors": error_items,
        "feedback": feedback_items,
        "all_phonemes": all_phonemes,
        "accuracy": accuracy,
        "per": per,
        "summary": build_summary(accuracy, len(error_items)),
        "recommendations": build_recommendations(feedback_items, clean_target_word),
    })
