# SpeechSense — AI Speech Therapy Platform

A React web application for AI-powered speech sound disorder (SSD) therapy. Upload or record a child's speech, detect phoneme-level errors, receive corrective feedback, and generate a clinical report.

---

## Project Structure

```
speechsense/
├── public/
│   └── index.html               # HTML shell + Google Fonts
├── src/
│   ├── index.js                 # React entry point
│   ├── App.js                   # Router + AppProvider
│   ├── context/
│   │   └── AppContext.js        # Global state (analysis result, patient info)
│   ├── components/
│   │   ├── Navbar.js            # Sticky navigation bar
│   │   └── Navbar.css
│   ├── pages/
│   │   ├── Home.js              # Landing page
│   │   ├── Home.css
│   │   ├── Analyze.js           # Upload / Record / Run Analysis
│   │   ├── Analyze.css
│   │   ├── Feedback.js          # Corrective feedback + TTS exercises
│   │   ├── Feedback.css
│   │   ├── Report.js            # Printable clinical report
│   │   ├── Report.css
│   │   ├── ConnectModel.js      # Step-by-step backend setup guide
│   │   └── ConnectModel.css
│   └── styles/
│       └── global.css           # CSS variables, shared utilities
├── package.json
└── README.md
```

---

## Quick Start

### 1. Install and run the React app

```bash
cd speechsense
npm install
npm start
# Opens at http://localhost:3000
```

---

## Connecting Your .pct Model (Backend Setup)

### 2. Install Python packages

```bash
pip install fastapi uvicorn torch torchaudio transformers soundfile librosa python-multipart
```

### 3. Create backend folder

```
your-project/
├── backend/
│   ├── model.pct        ← your 1.2 GB trained model
│   └── app.py           ← FastAPI server
└── speechsense/         ← this React app
```

### 4. Create backend/app.py

```python
import torch, torchaudio, io
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI()

app.add_middleware(CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

MODEL_PATH = "model.pct"
checkpoint = torch.load(MODEL_PATH, map_location="cpu")
model = checkpoint.get("model") or checkpoint
model.eval()

@app.post("/api/analyze")
async def analyze(audio: UploadFile = File(...)):
    data = await audio.read()
    waveform, sr = torchaudio.load(io.BytesIO(data))
    if sr != 16000:
        waveform = torchaudio.functional.resample(waveform, sr, 16000)
    with torch.no_grad():
        output = model(waveform)
    return JSONResponse({
        "transcript":     output.get("transcript", ""),
        "phoneme_errors": output.get("errors", []),
        "all_phonemes":   output.get("all_phonemes", []),
        "accuracy":       output.get("accuracy", 0),
        "per":            output.get("per", 0),
    })
```

### 5. Start the backend

```bash
cd backend
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

> Loading a 1.2 GB model may take 15–30 seconds on first startup.

### 6. Wire up the React app

In `src/pages/Analyze.js`, find the comment `REPLACE THIS BLOCK` and replace the demo timeout with:

```js
const form = new FormData();
form.append('audio', audioFile);

const res  = await fetch('http://localhost:8000/api/analyze', { method: 'POST', body: form });
const data = await res.json();

setResult(data);
setAnalysisResult(data);
setStatus({ text: 'Complete', cls: 'pill-ok' });
setLoading(false);
```

---

## Expected API Response Format

```json
{
  "transcript": "The rabbit ran through the forest.",
  "phoneme_errors": [
    { "word": "rabbit", "phoneme": "/r/", "type": "substitution", "produced": "/w/", "accuracy": 52 }
  ],
  "all_phonemes": [
    { "ph": "/r/", "acc": 52, "err": "Substitution (/w/)", "words": "rabbit, forest" },
    { "ph": "/s/", "acc": 95, "err": "Correct", "words": "quickly" }
  ],
  "accuracy": 87,
  "per": 7.69
}
```

---

## Pages

| Route | Page | Purpose |
|---|---|---|
| `/` | Home | Introduction + how it works |
| `/analyze` | Analyze | Upload/record audio, run analysis |
| `/feedback` | Feedback | Exercises + TTS corrective audio |
| `/report` | Report | Printable clinical report |
| `/connect-model` | Connect Model | Backend integration guide |

---

## Tech Stack

- **Frontend**: React 18, React Router v6, CSS Modules
- **Backend**: FastAPI, PyTorch, torchaudio
- **Model**: Your trained `.pct` checkpoint
- **TTS**: Browser Web Speech API (SpeechSynthesis)
