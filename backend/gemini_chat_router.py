import json
import os
from typing import List
from urllib import error, request

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

SYSTEM_PROMPT = """You are SpeechSense Assistant, a friendly, expert AI assistant embedded in a speech therapy platform for children with Speech Sound Disorders (SSDs).

You help:
- Parents and therapists understand phoneme-level errors (substitutions, omissions, insertions)
- Explain common SSD patterns like gliding (/r/->/w/), th-fronting (/th/->/f/), and fronting (/k/->/t/)
- Suggest targeted, age-appropriate practice exercises for specific phoneme errors
- Explain what Phoneme Error Rate (PER) means and how to improve it
- Guide users through the platform: Upload audio -> Analyse -> Feedback -> Report
- Answer questions about speech recognition, transcription, and how the AI detects errors

Tone: Friendly, encouraging, concise. Use simple language.
Format: Keep replies under 4 sentences unless a detailed explanation is asked for.
Never make clinical diagnoses. Always recommend consulting a certified SLP for formal assessment."""


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str
    history: List[ChatMessage] = Field(default_factory=list)


def _normalize_role(role: str) -> str:
    return "model" if role == "assistant" else "user"


def _build_contents(messages: List[ChatMessage]) -> List[dict]:
    contents = []
    for message in messages:
        text = message.content.strip()
        if not text:
            continue
        contents.append(
            {
                "role": _normalize_role(message.role),
                "parts": [{"text": text}],
            }
        )
    return contents


def _extract_answer(payload: dict) -> str:
    candidates = payload.get("candidates") or []
    if not candidates:
        prompt_feedback = payload.get("promptFeedback") or {}
        block_reason = prompt_feedback.get("blockReason")
        if block_reason:
            raise HTTPException(status_code=502, detail=f"Gemini blocked this request: {block_reason}.")
        raise HTTPException(status_code=502, detail="Gemini returned no response candidates.")

    parts = candidates[0].get("content", {}).get("parts") or []
    text = "".join(part.get("text", "") for part in parts).strip()
    if not text:
        raise HTTPException(status_code=502, detail="Gemini returned an empty response.")
    return text


def ask_gemini(history: List[ChatMessage]) -> str:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Gemini is not configured. Add GEMINI_API_KEY to backend/.env and restart the backend.",
        )

    payload = {
        "system_instruction": {
            "parts": [{"text": SYSTEM_PROMPT}],
        },
        "contents": _build_contents(history),
        "generationConfig": {
            "temperature": 0.6,
            "maxOutputTokens": 220,
        },
    }

    req = request.Request(
        url=f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=30) as response:
            return _extract_answer(json.loads(response.read().decode("utf-8")))
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="ignore")
        detail = "Gemini request failed."
        try:
            parsed = json.loads(raw)
            detail = parsed.get("error", {}).get("message") or detail
        except json.JSONDecodeError:
            if raw:
                detail = raw
        raise HTTPException(status_code=502, detail=detail) from exc
    except error.URLError as exc:
        raise HTTPException(status_code=502, detail=f"Unable to reach Gemini: {exc.reason}") from exc


@router.post("/api/chat")
async def chat(body: ChatRequest):
    question = body.question.strip()
    if not question:
        raise HTTPException(
            status_code=400,
            detail="Please ask a question about speech analysis, phoneme errors, or practice exercises.",
        )

    history = [message for message in body.history if message.content.strip()]
    if not history or history[-1].content.strip() != question:
        history.append(ChatMessage(role="user", content=question))

    return {"answer": ask_gemini(history)}
