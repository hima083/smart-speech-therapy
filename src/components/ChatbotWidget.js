// src/components/ChatbotWidget.js
// ─────────────────────────────────────────────────────────────────
// SpeechSense AI Chatbot
// Uses the backend /api/chat endpoint for chat replies.
// Keeps full conversation history for context-aware replies.
// Voice input  → Web Speech Recognition API
// Voice output → Web Speech Synthesis API
// ─────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getApiBaseUrl } from '../lib/neurospeechApi';
import './ChatbotWidget.css';

// ── System prompt — speech therapy expert context ────────────────
const SYSTEM_PROMPT = `You are SpeechSense Assistant, a warm, expert AI assistant built into a speech therapy platform for children with Speech Sound Disorders (SSDs).

You help:
- Parents and therapists understand phoneme-level errors (substitutions, omissions, insertions)
- Explain common SSD patterns like gliding (/r/→/w/), th-fronting (/θ/→/f/), fronting (/k/→/t/)
- Suggest targeted practice exercises for specific phoneme errors
- Explain what Phoneme Error Rate (PER) means and how to improve it
- Guide users through the platform: Upload audio → Analyse → Feedback → Report
- Answer questions about Whisper transcription and how the AI detects errors

Tone: Friendly, encouraging, concise. Use simple language — parents may not know technical terms.
Format: Keep replies under 4 sentences unless a detailed explanation is asked for.
Never: Make clinical diagnoses. Always recommend consulting a certified SLP for formal assessment.`;

// ── Backend chat helper ──────────────────────────────────────────
async function askBackend(question) {
  const response = await fetch(`${getApiBaseUrl()}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || 'Unable to reach the chat assistant.');
  }

  const data = await response.json();
  return data.answer || 'Sorry, I could not generate a response.';
}

// ── TTS helper ────────────────────────────────────────────────────
function speakText(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const utt  = new SpeechSynthesisUtterance(text);
  utt.lang   = 'en-US';
  utt.rate   = 0.92;
  utt.pitch  = 1.05;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v =>
    /female|zira|susan|samantha|karen/i.test(v.name)
  );
  if (preferred) utt.voice = preferred;
  window.speechSynthesis.speak(utt);
}

// ── Initial greeting ──────────────────────────────────────────────
const INITIAL = [
  {
    role: 'assistant',
    text: "Hi! I'm the SpeechSense Assistant 👋 Ask me about phoneme errors, practice exercises, how to use the platform, or anything about your child's speech analysis.",
  },
];

// ─────────────────────────────────────────────────────────────────
export default function ChatbotWidget() {
  const [open,      setOpen]      = useState(false);
  const [messages,  setMessages]  = useState(INITIAL);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [listening, setListening] = useState(false);
  const [ttsOn,     setTtsOn]     = useState(true);

  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const recognRef   = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // ── Send a message ──────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const question = text.trim();
    if (!question || loading) return;

    // Add user message immediately
    const userMsg = { role: 'user', text: question };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Build history in Claude format (exclude the initial greeting)
    const history = [...messages, userMsg]
      .filter(m => !(m.role === 'assistant' && m.text === INITIAL[0].text))
      .map(m => ({ role: m.role, content: m.text }));

    try {
      const reply = await askBackend(question);
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      if (ttsOn) speakText(reply);
    } catch (err) {
      const errText = `Sorry, I ran into an issue: ${err.message}`;
      setMessages(prev => [...prev, { role: 'assistant', text: errText }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, ttsOn]);

  // ── Form submit ─────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  // ── Voice input ─────────────────────────────────────────────────
  const toggleListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Speech recognition is not supported in this browser. Try Chrome or Edge.',
      }]);
      return;
    }

    // Already listening — stop
    if (recognRef.current) {
      recognRef.current.stop();
      return;
    }

    const recog = new SR();
    recognRef.current = recog;
    recog.lang             = 'en-US';
    recog.interimResults   = false;
    recog.maxAlternatives  = 1;
    recog.continuous       = false;

    recog.onstart = () => setListening(true);

    recog.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      sendMessage(transcript);
    };

    recog.onerror = (e) => {
      setListening(false);
      recognRef.current = null;
      const msgs = {
        'not-allowed':         'Microphone access denied. Please allow microphone permission.',
        'service-not-allowed': 'Microphone access denied. Please allow microphone permission.',
        'no-speech':           "I didn't hear anything. Please speak clearly and try again.",
        'network':             'Network error during speech recognition. Please try again.',
        'not-supported':       'Speech recognition is not supported in this browser.',
      };
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: msgs[e.error] || 'Could not recognise speech. Please try again.',
      }]);
    };

    recog.onend = () => {
      setListening(false);
      recognRef.current = null;
    };

    recog.start();
  };

  // ── Clear chat ───────────────────────────────────────────────────
  const clearChat = () => {
    window.speechSynthesis?.cancel();
    setMessages(INITIAL);
  };

  // ── Suggestion chips ─────────────────────────────────────────────
  const SUGGESTIONS = [
    'What is gliding?',
    'How to fix /r/ errors?',
    'What does PER mean?',
    'Exercises for /th/ sounds',
  ];

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className={`chatbot-widget ${open ? 'open' : ''}`}>

      {/* ── Header ── */}
      <div className="chatbot-header" onClick={() => setOpen(p => !p)}>
        <div className="cb-header-left">
          <div className="cb-avatar">💬</div>
          <div>
            <strong>SpeechSense Assistant</strong>
            <div className="chatbot-subtitle">
              {loading ? 'Typing…' : 'Ask about analysis, errors & practice'}
            </div>
          </div>
        </div>
        <div className="cb-header-right">
          {loading && <span className="cb-typing-dot" />}
          <button className="chatbot-toggle" aria-label="Toggle chat">
            {open ? '−' : '+'}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      {open && (
        <div className="chatbot-body">

          {/* Toolbar */}
          <div className="cb-toolbar">
            <button
              className={`cb-tool-btn ${ttsOn ? 'active' : ''}`}
              onClick={() => { setTtsOn(p => !p); window.speechSynthesis?.cancel(); }}
              title={ttsOn ? 'Mute voice' : 'Enable voice'}
            >
              {ttsOn ? '🔊 Voice On' : '🔇 Voice Off'}
            </button>
            <button className="cb-tool-btn" onClick={clearChat} title="Clear chat">
              🗑 Clear
            </button>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chatbot-message ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="cb-bot-icon">💬</div>
                )}
                <div className="chatbot-bubble">
                  {msg.text}
                  {msg.role === 'assistant' && ttsOn && (
                    <button
                      className="cb-replay-btn"
                      onClick={() => speakText(msg.text)}
                      title="Read aloud"
                    >
                      🔊
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Loading dots */}
            {loading && (
              <div className="chatbot-message assistant">
                <div className="cb-bot-icon">💬</div>
                <div className="chatbot-bubble cb-loading">
                  <span /><span /><span />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Suggestion chips (show only when few messages) */}
          {messages.length <= 2 && !loading && (
            <div className="cb-suggestions">
              {SUGGESTIONS.map(s => (
                <button key={s} className="cb-chip" onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <form className="chatbot-input-row" onSubmit={handleSubmit}>
            <button
              type="button"
              className={`chatbot-mic-button ${listening ? 'listening' : ''}`}
              onClick={toggleListening}
              disabled={loading}
              aria-label="Voice input"
            >
              {listening ? '🎙️ Stop' : '🎤 Speak'}
            </button>

            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask me something…"
              disabled={loading}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit(e)}
            />

            <button
              type="submit"
              className="cb-send-btn"
              disabled={loading || !input.trim()}
            >
              {loading ? (
                <span className="cb-spin" />
              ) : (
                <svg width="16" height="16" fill="none" stroke="currentColor"
                     strokeWidth="2.2" viewBox="0 0 24 24">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          </form>

        </div>
      )}
    </div>
  );
}
