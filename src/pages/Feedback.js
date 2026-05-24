import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Feedback.css';

const exercises = [
  {
    n: 1,
    title: '/r/ Tongue Placement Drill',
    desc: 'Curl the tongue tip slightly back without touching the palate. Say slowly: "red, run, rain, rabbit". Repeat 5× while watching in a mirror. The tongue must NOT touch the roof of the mouth.',
  },
  {
    n: 2,
    title: '/θ/ Tongue-Tip Visibility',
    desc: 'Place tongue tip lightly between front teeth and blow air gently. Practice: "think, this, the, through, three". Repeat 8× per word, focusing on the airflow through the teeth.',
  },
  {
    n: 3,
    title: 'Minimal Pair Contrast — /r/ vs /w/',
    desc: 'Read aloud the pairs: rain/wane · red/wed · race/waist · rip/whip. A clinician should mark correct productions. Aim for 80% accuracy before advancing.',
  },
  {
    n: 4,
    title: 'Carry-Over Sentence Practice',
    desc: 'Say naturally: "The rabbit ran through the forest." Record yourself, upload here, and compare PER across 3 attempts. Target: below 5% PER.',
  },
];

const ttsWords = [
  { word: 'rabbit',  ipa: '/ˈræbɪt/'  },
  { word: 'through', ipa: '/θruː/'    },
  { word: 'forest',  ipa: '/ˈfɒrɪst/' },
  { word: 'jumped',  ipa: '/dʒʌmpt/'  },
];

function say(word) {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.rate = 0.7; u.lang = 'en-US';
    speechSynthesis.speak(u);
  }
}

export default function Feedback() {
  const navigate = useNavigate();
  const { analysisResult } = useApp();

  if (!analysisResult) {
    return (
      <div className="page-wrapper">
        <div className="page-header">
          <div className="page-label">Step 2</div>
          <h1 className="page-title">Corrective Feedback</h1>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '56px 24px' }}>
          <div style={{ fontSize: '2.2rem', opacity: 0.3, marginBottom: '14px' }}>💬</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '20px' }}>
            Run an analysis first to generate<br />personalised feedback and exercises.
          </p>
          <button className="btn-teal" onClick={() => navigate('/analyze')}>
            Go to Analyse →
          </button>
        </div>
      </div>
    );
  }

  const errs = analysisResult.phoneme_errors;
  const subs = errs.filter(e => e.type === 'substitution').length;
  const omit = errs.filter(e => e.type === 'omission').length;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="page-label">Step 2</div>
        <h1 className="page-title">Corrective Feedback</h1>
        <p className="page-desc">
          Personalised exercises and TTS audio based on the detected phoneme errors for{' '}
          <strong>{analysisResult.patient}</strong>.
        </p>
      </div>

      <div className="fb-layout">

        {/* ── LEFT: Summaries + Exercises ── */}
        <div className="fb-left">

          {/* Error summary */}
          <div className="fb-block fb-info">
            <div className="fb-head">
              <div className="fb-icon" style={{ background: 'var(--teal)' }}>🔍</div>
              <div className="fb-title">Error Summary</div>
            </div>
            <p>
              <strong>{subs} substitution error{subs !== 1 ? 's' : ''}</strong> and{' '}
              <strong>{omit} omission error{omit !== 1 ? 's' : ''}</strong> detected.
              The most prominent pattern is <strong>/r/ → /w/ substitution</strong> (gliding) in{' '}
              <em>rabbit</em> and <em>forest</em>, and <strong>/θ/ → /f/ substitution</strong>{' '}
              (th-fronting) in <em>through</em>. A /dʒ/ omission occurred in <em>jumped</em>.
            </p>
          </div>

          {/* Strengths */}
          <div className="fb-block fb-ok">
            <div className="fb-head">
              <div className="fb-icon" style={{ background: 'var(--green)' }}>💪</div>
              <div className="fb-title">Strengths Observed</div>
            </div>
            <p>
              Excellent accuracy on <strong>/s/, /k/, and /l/ phonemes</strong> (89–95%).
              Stop consonants, sentence rhythm and phrasing are age-appropriate and consistent.
            </p>
          </div>

          {/* Practice exercises */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">📋 Practice Exercises</div>
            </div>
            <div className="card-body">
              <ul className="ex-list">
                {exercises.map(ex => (
                  <li key={ex.n} className="ex-item">
                    <div className="ex-num">{ex.n}</div>
                    <div>
                      <div className="ex-title">{ex.title}</div>
                      <div className="ex-desc">{ex.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── RIGHT: TTS + Nav ── */}
        <div className="fb-right">
          <div className="card">
            <div className="card-head">
              <div className="card-title">🔊 Listen &amp; Repeat (TTS)</div>
            </div>
            <div className="card-body">
              <p className="tts-hint">Tap to hear correct pronunciation:</p>
              <div className="tts-list">
                {ttsWords.map(({ word, ipa }) => (
                  <div key={word} className="tts-item">
                    <div>
                      <span className="tts-word">{word}</span>
                      <span className="tts-ipa">{ipa}</span>
                    </div>
                    <button className="tts-play" onClick={() => say(word)}>
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                      </svg>
                      Play
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Accuracy snapshot */}
          <div className="card acc-snapshot">
            <div className="card-head"><div className="card-title">📊 Session Snapshot</div></div>
            <div className="card-body">
              <div className="snap-row">
                <span className="snap-label">Session Accuracy</span>
                <span className="snap-val" style={{ color: 'var(--teal)' }}>{analysisResult.accuracy}%</span>
              </div>
              <div className="snap-row">
                <span className="snap-label">Phoneme Error Rate</span>
                <span className="snap-val" style={{ color: 'var(--red)' }}>{analysisResult.per}%</span>
              </div>
              <div className="snap-row">
                <span className="snap-label">Errors Detected</span>
                <span className="snap-val" style={{ color: 'var(--amber)' }}>{errs.length}</span>
              </div>
              <div className="snap-row">
                <span className="snap-label">Substitutions</span>
                <span className="snap-val">{subs}</span>
              </div>
              <div className="snap-row" style={{ borderBottom: 'none' }}>
                <span className="snap-label">Omissions</span>
                <span className="snap-val">{omit}</span>
              </div>
            </div>
          </div>

          <button
            className="btn-teal"
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            onClick={() => navigate('/report')}
          >
            View Full Report →
          </button>
        </div>
      </div>
    </div>
  );
}
