import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Feedback.css';

function say(text) {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.7;
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  }
}

export default function FeedbackLive() {
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
          <div style={{ fontSize: '2.2rem', opacity: 0.3, marginBottom: '14px' }}>Feedback</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '20px' }}>
            Run an analysis first to generate<br />personalised feedback and exercises.
          </p>
          <button className="btn-teal" onClick={() => navigate('/analyze')}>
            Go to Analyse
          </button>
        </div>
      </div>
    );
  }

  const errors = analysisResult.phoneme_errors || [];
  const feedbackItems = analysisResult.feedback || [];
  const substitutions = errors.filter(error => error.type === 'substitution').length;
  const omissions = errors.filter(error => error.type === 'omission').length;
  const insertions = errors.filter(error => error.type === 'insertion').length;
  const correctPhonemes = (analysisResult.all_phonemes || []).filter(item => item.err === 'Correct');
  const targetWords = analysisResult.target_word
    ? analysisResult.target_word.trim().split(/\s+/).filter(Boolean)
    : [];

  const practiceItems = feedbackItems.length > 0
    ? feedbackItems.map((item, index) => ({
        n: index + 1,
        title: `${item.phoneme_label} ${item.issue}`,
        desc: item.tip,
      }))
    : (analysisResult.recommendations || []).map((item, index) => ({
        n: index + 1,
        title: `Practice step ${index + 1}`,
        desc: item,
      }));

  const errorPhonemes = Array.from(new Set(feedbackItems.map(item => item.phoneme_label)));

  const ttsItems = [
    { word: analysisResult.target_word, ipa: 'Full phrase' },
    ...targetWords.map((word, index) => ({ word, ipa: `Word ${index + 1}` })),
    { word: `${analysisResult.target_word}. ${analysisResult.target_word}. ${analysisResult.target_word}.`, ipa: 'Slow repetition' },
  ];

  const summaryCopy = errors.length === 0
    ? `All expected phonemes in "${analysisResult.target_word}" were matched correctly. No substitutions, omissions, or insertions were detected in this attempt.`
    : `For "${analysisResult.target_word}", the model detected ${substitutions} substitution ${substitutions === 1 ? 'error' : 'errors'}, ${omissions} omission ${omissions === 1 ? 'error' : 'errors'}, and ${insertions} insertion ${insertions === 1 ? 'error' : 'errors'}.`;

  const strengthsCopy = correctPhonemes.length > 0
    ? `Stable matches were observed for ${correctPhonemes.map(item => item.ph).join(', ')}. Keep those productions consistent while practising the mismatched phonemes.`
    : 'This attempt needs a slower repeat with clearer articulation so the model can capture more of the expected phoneme sequence.';

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="page-label">Step 2</div>
        <h1 className="page-title">Corrective Feedback</h1>
        <p className="page-desc">
          Personalised exercises and practice cues for <strong>{analysisResult.patient}</strong> based on the NeuroSpeech model output.
        </p>
      </div>

      <div className="fb-layout">
        <div className="fb-left">
          <div className="fb-block fb-info">
            <div className="fb-head">
              <div className="fb-icon" style={{ background: 'var(--teal)' }}>AI</div>
              <div className="fb-title">Error Summary</div>
            </div>
            <p>{summaryCopy}</p>
          </div>

          <div className="fb-block fb-ok">
            <div className="fb-head">
              <div className="fb-icon" style={{ background: 'var(--green)' }}>OK</div>
              <div className="fb-title">Strengths Observed</div>
            </div>
            <p>{strengthsCopy}</p>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Practice Exercises</div>
            </div>
            <div className="card-body">
              <ul className="ex-list">
                {practiceItems.map(item => (
                  <li key={item.n} className="ex-item">
                    <div className="ex-num">{item.n}</div>
                    <div>
                      <div className="ex-title">{item.title}</div>
                      <div className="ex-desc">{item.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="fb-right">
          <div className="card">
            <div className="card-head">
              <div className="card-title">Listen and Repeat</div>
            </div>
            <div className="card-body">
              <p className="tts-hint">Tap each word to hear it individually, then practice the full phrase.</p>
              <div className="tts-list">
                {ttsItems.map(({ word, ipa }, index) => (
                  <div key={`${ipa}-${word}-${index}`} className="tts-item">
                    <div>
                      <span className="tts-word">{word}</span>
                      <span className="tts-ipa">{ipa}</span>
                    </div>
                    <button className="tts-play" onClick={() => say(word)}>
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      </svg>
                      Play
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Phoneme Practice</div>
            </div>
            <div className="card-body">
              {errorPhonemes.length > 0 ? (
                <ul className="ex-list">
                  {errorPhonemes.map((phoneme, index) => (
                    <li key={phoneme} className="ex-item">
                      <div className="ex-num">{index + 1}</div>
                      <div>
                        <div className="ex-title">Practice {phoneme}</div>
                        <div className="ex-desc">Repeat the highlighted error phoneme until it matches the target sound.</div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No error phonemes detected — keep practising the target word.</p>
              )}
            </div>
          </div>

          <div className="card acc-snapshot">
            <div className="card-head"><div className="card-title">Session Snapshot</div></div>
            <div className="card-body">
              <div className="snap-row">
                <span className="snap-label">Session Accuracy</span>
                <span className="snap-val" style={{ color: 'var(--teal)' }}>
                  {analysisResult.accuracy !== null ? `${analysisResult.accuracy}%` : 'N/A'}
                </span>
              </div>
              <div className="snap-row">
                <span className="snap-label">Phoneme Error Rate</span>
                <span className="snap-val" style={{ color: 'var(--red)' }}>
                  {analysisResult.per !== null ? `${analysisResult.per}%` : 'N/A'}
                </span>
              </div>
              <div className="snap-row">
                <span className="snap-label">Errors Detected</span>
                <span className="snap-val" style={{ color: 'var(--amber)' }}>{errors.length}</span>
              </div>
              <div className="snap-row">
                <span className="snap-label">Substitutions</span>
                <span className="snap-val">{substitutions}</span>
              </div>
              <div className="snap-row">
                <span className="snap-label">Omissions</span>
                <span className="snap-val">{omissions}</span>
              </div>
              <div className="snap-row" style={{ borderBottom: 'none' }}>
                <span className="snap-label">Detected Phonemes</span>
                <span className="snap-val">{(analysisResult.detected_phonemes || []).length}</span>
              </div>
            </div>
          </div>

          <button
            className="btn-teal"
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            onClick={() => navigate('/report')}
          >
            View Full Report
          </button>
        </div>
      </div>
    </div>
  );
}
