# backend/app.py  (add these lines to your existing app.py)
# ─────────────────────────────────────────────────────────────────
# Add the chat router to your existing FastAPI app.
# Just add the two lines marked  ← ADD THIS  below.
# ─────────────────────────────────────────────────────────────────

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ← ADD THIS
from chat_router import router as chat_router             # ← ADD THIS

app = FastAPI(title="SpeechSense API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ← ADD THIS
app.include_router(chat_router)                          # ← ADD THIS

# ... rest of your existing app.py (Whisper endpoint etc.) stays the same
