/* eslint-disable */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ensureWavFile } from '../lib/audioUtils';
import './Analyze.css';

/* ── Demo data (replace with real API call) ── */
function buildDemoResult(patient) {
  return {
    transcript: "The rabbit ran quickly through the forest and jumped over the log.",
    phoneme_errors: [
      { word: 'rabbit',  phoneme: '/r/',  type: 'substitution', produced: '/w/',  accuracy: 52 },
      { word: 'through', phoneme: '/θ/',  type: 'substitution', produced: '/f/',  accuracy: 61 },
      { word: 'forest',  phoneme: '/r/',  type: 'substitution', produced: '/w/',  accuracy: 52 },
      { word: 'jumped',  phoneme: '/dʒ/', type: 'omission',     produced: '—',    accuracy: 70 },
    ],
    all_phonemes: [
      { ph: '/r/',   acc: 52, err: 'Substitution (/w/)', words: 'rabbit, forest' },
      { ph: '/θ/',   acc: 61, err: 'Substitution (/f/)', words: 'through' },
      { ph: '/dʒ/',  acc: 70, err: 'Omission',           words: 'jumped' },
      { ph: '/s/',   acc: 95, err: 'Correct',            words: 'quickly' },
      { ph: '/k/',   acc: 93, err: 'Correct',            words: 'quickly' },
      { ph: '/l/',   acc: 89, err: 'Correct',            words: 'log' },
    ],
    accuracy: 87,
    per: 7.69,
    patient: patient.name || 'Anonymous',
    age: patient.age || '—',
    sessType: patient.sessionType || 'Assessment',
    therapist: patient.therapist || '—',
    date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
  };
}

/* ── Transcript with highlights ── */
function HighlightedTranscript({ transcript, errors }) {
  let parts = [{ text: transcript, type: 'plain' }];

  errors.forEach(err => {
    const next = [];
    parts.forEach(p => {
      if (p.type !== 'plain') { next.push(p); return; }
      const idx = p.text.indexOf(err.word);
      if (idx === -1) { next.push(p); return; }
      if (idx > 0) next.push({ text: p.text.slice(0, idx), type: 'plain' });
      next.push({ text: err.word, type: err.type, tip: err.type === 'substitution' ? `${err.phoneme} → ${err.produced}` : `${err.phoneme} ${err.type}` });
      const rest = p.text.slice(idx + err.word.length);
      if (rest) next.push({ text: rest, type: 'plain' });
    });
    parts = next;
  });

  return (
    <span>
      {parts.map((p, i) =>
        p.type === 'plain'
          ? <span key={i}>{p.text}</span>
          : <mark key={i} className={p.type} title={p.tip}>{p.text}</mark>
      )}
    </span>
  );
}

export default function Analyze() {
  const navigate = useNavigate();
  const { setAnalysisResult, patientInfo, setPatientInfo } = useApp();

  const [audioURL, setAudioURL]     = useState(null);
  const [audioFile, setAudioFile]   = useState(null);
  const [recording, setRecording]   = useState(false);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [status, setStatus]         = useState({ text: 'Ready', cls: 'pill-grey' });
  const [targetWord, setTargetWord] = useState('');
  const [apiError, setApiError]     = useState(null);

  const fileRef    = useRef(null);
  const mediaRef   = useRef(null);
  const chunksRef  = useRef([]);
  const dropRef    = useRef(null);

  /* ── File handling ── */
  async function loadFile(file) {
    try {
      const wavFile = await ensureWavFile(file);
      setAudioFile(wavFile);
      setAudioURL(URL.createObjectURL(wavFile));
      setStatus({ text: 'Audio Loaded', cls: 'pill-ok' });
      setApiError(null);
    } catch (error) {
      console.error('Audio conversion failed:', error);
      setApiError('Unable to process this audio file. Please upload a WAV/MP3/OGG file or record again.');
      setStatus({ text: 'Audio conversion failed', cls: 'pill-red' });
    }
  }

  function onFileChange(e) { if (e.target.files[0]) loadFile(e.target.files[0]); }

  function onDrop(e) {
    e.preventDefault();
    dropRef.current.classList.remove('over');
    if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
  }

  /* ── Recording ── */
  async function toggleRecord() {
    if (!recording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunksRef.current = [];
        mediaRef.current = new MediaRecorder(stream);
        mediaRef.current.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        mediaRef.current.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          await loadFile(blob);
          stream.getTracks().forEach(t => t.stop());
        };
        mediaRef.current.start();
        setRecording(true);
      } catch { alert('Microphone access denied.'); }
    } else {
      mediaRef.current.stop();
      setRecording(false);
    }
  }

  /* ── Analysis ── */
  async function runAnalysis() {
    if (!audioFile) {
      setApiError('Please upload or record audio before running analysis.');
      setStatus({ text: 'No audio', cls: 'pill-red' });
      return;
    }

    if (!targetWord.trim()) {
      setApiError('Please enter a target word for the model to analyse.');
      setStatus({ text: 'Target word required', cls: 'pill-red' });
      return;
    }

    setLoading(true);
    setStatus({ text: 'Analysing…', cls: 'pill-warn' });
    setApiError(null);

    try {
      const data = await analyzeSpeech({ audioFile, targetWord, patientInfo });
      setResult(data);
      setAnalysisResult(data);
      setStatus({ text: 'Complete', cls: 'pill-ok' });
    } catch (error) {
      setApiError(error.message || 'Analysis failed. Please try again.');
      setStatus({ text: 'Error', cls: 'pill-red' });
    } finally {
      setLoading(false);
    }
  }

  /* ── Bar colour helper ── */
  function barColor(acc) {
    return acc >= 85 ? 'var(--green)' : acc >= 65 ? 'var(--amber)' : 'var(--red)';
  }

  function errStyle(err) {
    if (err === 'Correct')            return { background: 'var(--green-l)', color: 'var(--green)' };
    if (err.includes('Substitution')) return { background: 'var(--red-l)',   color: 'var(--red)'   };
    return { background: 'var(--amber-l)', color: 'var(--amber)' };
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="page-label">Step 1</div>
        <h1 className="page-title">Upload &amp; Analyse Speech</h1>
        <p className="page-desc">Upload an audio file or record directly. The AI will transcribe and detect phoneme-level errors.</p>
      </div>

      <div className="two-col">

        {/* ── LEFT: Input ── */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">
              <svg width="14" height="14" fill="none" stroke="var(--muted)" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Audio Input
            </div>
            <span className={`pill ${status.cls}`}>{status.text}</span>
          </div>
          <div className="card-body">

            {/* Drop zone */}
            <div
              className="drop-zone"
              ref={dropRef}
              onClick={() => fileRef.current.click()}
              onDragOver={e => { e.preventDefault(); dropRef.current.classList.add('over'); }}
              onDragLeave={() => dropRef.current.classList.remove('over')}
              onDrop={onDrop}
            >
              <input type="file" accept="audio/*" ref={fileRef} onChange={onFileChange} style={{ display: 'none' }} />
              <div className="dz-icon-wrap">
                <svg width="22" height="22" fill="none" stroke="var(--teal)" strokeWidth="1.8" viewBox="0 0 24 24">
                  <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                </svg>
              </div>
              <h3>Drop your audio file here</h3>
              <p>or click to browse</p>
              <div className="fmt-chips">
                {['WAV','MP3','M4A','OGG','FLAC'].map(f => <span key={f} className="fmt-chip">{f}</span>)}
              </div>
            </div>

            {/* Record button */}
            <button
              className={`rec-btn ${recording ? 'recording' : ''}`}
              onClick={toggleRecord}
            >
              <span className={`rec-dot ${recording ? 'active' : ''}`} />
              {recording ? 'Stop Recording' : 'Record Live Audio'}
            </button>

            {/* Audio preview */}
            {audioURL && (
              <div className="audio-preview">
                <p className="audio-label">Loaded Audio</p>
                <audio controls src={audioURL} style={{ width: '100%', height: '34px' }} />
              </div>
            )}

            <hr className="divider" />

            {/* Patient info */}
            <label className="form-label" style={{ marginBottom: '10px', display: 'block' }}>
              Patient Details <span style={{ color: 'var(--light)', fontWeight: 300 }}>(optional)</span>
            </label>
            <div className="form-grid">
              <div>
                <label className="form-label">Name</label>
                <input className="form-input" placeholder="e.g. Arjun"
                  value={patientInfo.name}
                  onChange={e => setPatientInfo(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Age</label>
                <input className="form-input" type="number" placeholder="e.g. 7" min="1" max="18"
                  value={patientInfo.age}
                  onChange={e => setPatientInfo(p => ({ ...p, age: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Session Type</label>
                <select className="form-select"
                  value={patientInfo.sessionType}
                  onChange={e => setPatientInfo(p => ({ ...p, sessionType: e.target.value }))}>
                  <option value="">Select…</option>
                  <option>Initial Assessment</option>
                  <option>Follow-up Session</option>
                  <option>Practice Drill</option>
                  <option>Diagnostic Evaluation</option>
                </select>
              </div>
              <div>
                <label className="form-label">Therapist</label>
                <input className="form-input" placeholder="e.g. Dr. Priya"
                  value={patientInfo.therapist}
                  onChange={e => setPatientInfo(p => ({ ...p, therapist: e.target.value }))} />
              </div>
            </div>

            <div className="form-grid">
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Target Word</label>
                <input className="form-input" value={targetWord}
                  onChange={e => setTargetWord(e.target.value)}
                  placeholder="e.g. rabbit" />
              </div>
            </div>

            {apiError && (
              <div className="note-box" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>
                <svg width="14" height="14" fill="none" stroke="var(--red)" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {apiError}
              </div>
            )}

            {/* Run button */}
            <button className="run-btn" onClick={runAnalysis} disabled={loading}>
              {loading ? (
                <><span className="spinner" /> Analysing…</>
              ) : (
                <><svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg> Run Phoneme Analysis</>
              )}
            </button>

            <p className="api-hint">
              The backend loads the Hugging Face-hosted model automatically — no token is required in the browser.
            </p>
          </div>
        </div>

        {/* ── RIGHT: Results ── */}
        <div className="results-col">

          {/* Transcript */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <svg width="14" height="14" fill="none" stroke="var(--muted)" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                Transcript
              </div>
            </div>
            <div className="card-body">
              <div className="transcript-box">
                {result
                  ? <HighlightedTranscript transcript={result.transcript} errors={result.phoneme_errors} />
                  : <span className="placeholder-text">Transcription will appear here after analysis…</span>}
              </div>
              {result && (
                <div className="legend">
                  <div className="leg-item"><div className="leg-dot" style={{ background:'#fde8e8', border:'1px solid #fca5a5' }} />Substitution</div>
                  <div className="leg-item"><div className="leg-dot" style={{ background:'#fef3c7', border:'1px solid #fcd34d' }} />Omission</div>
                  <div className="leg-item"><div className="leg-dot" style={{ background:'#d1fae5', border:'1px solid #6ee7b7' }} />Insertion</div>
                </div>
              )}
            </div>
          </div>

          {/* Phoneme table */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <svg width="14" height="14" fill="none" stroke="var(--muted)" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
                </svg>
                Phoneme Errors
              </div>
              {result && <span className="pill pill-ok">PER {result.per}%</span>}
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {result ? (
                <table className="ph-table">
                  <thead>
                    <tr>
                      <th>Phoneme</th><th>Accuracy</th><th>Error Type</th><th>Word(s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.all_phonemes.map(p => (
                      <tr key={p.ph}>
                        <td><span className="ph-sym">{p.ph}</span></td>
                        <td>
                          <div className="acc-row">
                            <div className="acc-bar-bg">
                              <div className="acc-bar-fill" style={{ width: `${p.acc}%`, background: barColor(p.acc) }} />
                            </div>
                            <span className="acc-pct">{p.acc}%</span>
                          </div>
                        </td>
                        <td><span className="err-badge" style={errStyle(p.err)}>{p.err}</span></td>
                        <td className="word-cell">{p.words}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">🔬</div>
                  <p>Phoneme breakdown appears<br />after running analysis.</p>
                </div>
              )}
            </div>
          </div>

          {result && (
            <button className="btn-teal" style={{ width:'100%', justifyContent:'center', padding:'13px' }}
              onClick={() => navigate('/feedback')}>
              View Feedback &amp; Exercises →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
