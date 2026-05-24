import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchApi } from '../lib/neurospeechApi';
import { getLocalSpeechAssistantReply } from '../lib/localSpeechAssistant';
import './ChatbotWidget.css';

async function askBackend(question, history) {
  const response = await fetchApi('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || 'Unable to reach the chat assistant.');
  }

  const data = await response.json();
  return data.answer || 'Sorry, I could not generate a response.';
}

function speakText(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.92;
  utterance.pitch = 1.05;

  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((voice) => /female|zira|susan|samantha|karen/i.test(voice.name));
  if (preferred) {
    utterance.voice = preferred;
  }

  window.speechSynthesis.speak(utterance);
}

const INITIAL_MESSAGES = [
  {
    role: 'assistant',
    text: "Hi! I'm the SpeechSense Assistant. Ask me about phoneme errors, practice exercises, how to use the platform, or anything about your child's speech analysis.",
  },
];

const SUGGESTIONS = [
  'What is gliding?',
  'How to fix /r/ errors?',
  'What does PER mean?',
  'Exercises for /th/ sounds',
];

export default function GeminiChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [ttsOn, setTtsOn] = useState(true);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const recognizerRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => () => {
    recognizerRef.current?.stop?.();
    window.speechSynthesis?.cancel();
  }, []);

  const sendMessage = useCallback(async (rawText) => {
    const question = rawText.trim();
    if (!question || loading) return;

    const userMessage = { role: 'user', text: question };
    const history = [...messages, userMessage]
      .filter((message) => !(message.role === 'assistant' && message.text === INITIAL_MESSAGES[0].text))
      .map((message) => ({
        role: message.role,
        content: message.text,
      }));

    setMessages((previous) => [...previous, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const reply = await askBackend(question, history);
      setMessages((previous) => [...previous, { role: 'assistant', text: reply }]);
      if (ttsOn) {
        speakText(reply);
      }
    } catch (err) {
      const fallbackReply = `${getLocalSpeechAssistantReply(question)}\n\nNote: I'm using built-in help because the backend is unavailable or returned an error.`;
      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          text: fallbackReply,
        },
      ]);
      if (ttsOn) {
        speakText(fallbackReply);
      }
    } finally {
      setLoading(false);
    }
  }, [loading, messages, ttsOn]);

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(input);
  };

  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          text: 'Speech recognition is not supported in this browser. Try Chrome or Edge.',
        },
      ]);
      return;
    }

    if (recognizerRef.current) {
      recognizerRef.current.stop();
      return;
    }

    const recognizer = new SpeechRecognition();
    recognizerRef.current = recognizer;
    recognizer.lang = 'en-US';
    recognizer.interimResults = true;
    recognizer.maxAlternatives = 1;
    recognizer.continuous = false;

    recognizer.onstart = () => {
      setListening(true);
      inputRef.current?.focus();
    };

    recognizer.onresult = (event) => {
      let transcript = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript || '';
      }

      setInput(transcript.trimStart());
    };

    recognizer.onerror = (event) => {
      setListening(false);
      recognizerRef.current = null;

      const messagesByError = {
        'not-allowed': 'Microphone access denied. Please allow microphone permission.',
        'service-not-allowed': 'Microphone access denied. Please allow microphone permission.',
        'no-speech': "I didn't hear anything. Please speak clearly and try again.",
        network: 'Network error during speech recognition. Please try again.',
        'not-supported': 'Speech recognition is not supported in this browser.',
      };

      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          text: messagesByError[event.error] || 'Could not recognise speech. Please try again.',
        },
      ]);
    };

    recognizer.onend = () => {
      setListening(false);
      recognizerRef.current = null;
    };

    recognizer.start();
  };

  const clearChat = () => {
    recognizerRef.current?.stop();
    window.speechSynthesis?.cancel();
    setInput('');
    setMessages(INITIAL_MESSAGES);
  };

  return (
    <div className={`chatbot-widget ${open ? 'open' : ''}`}>
      <div className="chatbot-header" onClick={() => setOpen((previous) => !previous)}>
        <div className="cb-header-left">
          <div className="cb-avatar">AI</div>
          <div>
            <strong>SpeechSense Assistant</strong>
            <div className="chatbot-subtitle">
              {loading ? 'Typing...' : listening ? 'Listening...' : 'Ask about analysis, errors and practice'}
            </div>
          </div>
        </div>
        <div className="cb-header-right">
          {loading && <span className="cb-typing-dot" />}
          <button className="chatbot-toggle" aria-label="Toggle chat" type="button">
            {open ? '-' : '+'}
          </button>
        </div>
      </div>

      {open && (
        <div className="chatbot-body">
          <div className="cb-toolbar">
            <button
              className={`cb-tool-btn ${ttsOn ? 'active' : ''}`}
              onClick={() => {
                setTtsOn((previous) => !previous);
                window.speechSynthesis?.cancel();
              }}
              title={ttsOn ? 'Mute voice' : 'Enable voice'}
              type="button"
            >
              {ttsOn ? 'Voice On' : 'Voice Off'}
            </button>
            <button className="cb-tool-btn" onClick={clearChat} title="Clear chat" type="button">
              Clear
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`chatbot-message ${message.role}`}>
                {message.role === 'assistant' && <div className="cb-bot-icon">AI</div>}
                <div className="chatbot-bubble">
                  {message.text}
                  {message.role === 'assistant' && ttsOn && (
                    <button
                      className="cb-replay-btn"
                      onClick={() => speakText(message.text)}
                      title="Read aloud"
                      type="button"
                    >
                      Read
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="chatbot-message assistant">
                <div className="cb-bot-icon">AI</div>
                <div className="chatbot-bubble cb-loading">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {messages.length <= 2 && !loading && (
            <div className="cb-suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  className="cb-chip"
                  onClick={() => sendMessage(suggestion)}
                  type="button"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <form className="chatbot-input-row" onSubmit={handleSubmit}>
            <button
              type="button"
              className={`chatbot-mic-button ${listening ? 'listening' : ''}`}
              onClick={toggleListening}
              disabled={loading}
              aria-label="Voice input"
            >
              {listening ? 'Stop' : 'Speak'}
            </button>

            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={listening ? 'Listening... your words will appear here' : 'Ask me something...'}
              disabled={loading}
            />

            <button
              type="submit"
              className="cb-send-btn"
              disabled={loading || !input.trim()}
            >
              {loading ? (
                <span className="cb-spin" />
              ) : (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
