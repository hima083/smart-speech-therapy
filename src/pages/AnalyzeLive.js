import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { analyzeSpeech } from '../lib/neurospeechApi';
import { ensureWavFile } from '../lib/audioUtils';
import './Analyze.css';

function formatPhonemeSequence(phones) {
  if (!phones || phones.length === 0) {
    return 'Unavailable';
  }

  return phones.map(phone => `/${phone}/`).join(' ');
}

export default function AnalyzeLive() {
  const navigate = useNavigate();
  const { setAnalysisResult, patientInfo, setPatientInfo } = useApp();

  const [audioURL, setAudioURL] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [targetWord, setTargetWord] = useState('');
  const [errorText, setErrorText] = useState('');
  const [status, setStatus] = useState({ text: 'Ready', cls: 'pill-grey' });

  const fileRef = useRef(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const dropRef = useRef(null);

  async function loadFile(file) {
    try {
      const nextFile = file instanceof File ? file : new File([file], 'recording.webm', { type: file.type || 'audio/webm' });
      const wavFile = await ensureWavFile(nextFile);
      setAudioFile(wavFile);
      setAudioURL(URL.createObjectURL(wavFile));
      setStatus({ text: 'Audio Loaded', cls: 'pill-ok' });
      setErrorText('');
    } catch (error) {
      console.error('Audio conversion failed:', error);
      setErrorText('Unable to process this audio file. Please upload a WAV/MP3/OGG file or record again.');
      setStatus({ text: 'Audio conversion failed', cls: 'pill-err' });
    }
  }

  function onFileChange(event) {
    if (event.target.files[0]) {
      loadFile(event.target.files[0]);
    }
  }

  function onDrop(event) {
    event.preventDefault();
    dropRef.current.classList.remove('over');
    if (event.dataTransfer.files[0]) {
      loadFile(event.dataTransfer.files[0]);
    }
  }

  async function toggleRecord() {
    if (!recording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunksRef.current = [];
        mediaRef.current = new MediaRecorder(stream);
        mediaRef.current.ondataavailable = event => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };
        mediaRef.current.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          await loadFile(blob);
          stream.getTracks().forEach(track => track.stop());
        };
        mediaRef.current.start();
        setRecording(true);
      } catch {
        alert('Microphone access denied.');
      }
    } else {
      mediaRef.current.stop();
      setRecording(false);
    }
  }

  async function runAnalysis() {
    if (!audioFile) {
      setStatus({ text: 'Add Audio', cls: 'pill-err' });
      setErrorText('Please upload or record an audio sample before running analysis.');
      return;
    }

    if (!targetWord.trim()) {
      setStatus({ text: 'Target Needed', cls: 'pill-err' });
      setErrorText('Please enter the target word for pronunciation comparison.');
      return;
    }

    setLoading(true);
    setErrorText('');
    setStatus({ text: 'Analysing...', cls: 'pill-warn' });

    try {
      const data = await analyzeSpeech({ audioFile, targetWord, patientInfo });
      setResult(data);
      setAnalysisResult(data);
      setStatus({ text: 'Complete', cls: 'pill-ok' });
    } catch (error) {
      setStatus({ text: 'Failed', cls: 'pill-err' });
      setErrorText(error.message);
    } finally {
      setLoading(false);
    }
  }

  function barColor(acc) {
    return acc >= 85 ? 'var(--green)' : acc >= 65 ? 'var(--amber)' : acc > 0 ? 'var(--blue)' : 'var(--red)';
  }

  function errStyle(err) {
    if (err === 'Correct') return { background: 'var(--green-l)', color: 'var(--green)' };
    if (err.includes('Substitution')) return { background: 'var(--red-l)', color: 'var(--red)' };
    if (err.includes('Insertion')) return { background: 'var(--blue-l)', color: 'var(--blue)' };
    return { background: 'var(--amber-l)', color: 'var(--amber)' };
  }

  function alignStatusTone(statusValue) {
    if (statusValue === 'correct') return { background: 'var(--green-l)', color: 'var(--green)' };
    if (statusValue === 'substitution') return { background: 'var(--red-l)', color: 'var(--red)' };
    if (statusValue === 'insertion') return { background: 'var(--blue-l)', color: 'var(--blue)' };
    return { background: 'var(--amber-l)', color: 'var(--amber)' };
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="page-label">Step 1</div>
        <h1 className="page-title">Upload and Analyse Speech</h1>
        <p className="page-desc">
          Enter a target word, upload or record audio, and run the pronunciation analysis.
        </p>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-head">
            <div className="card-title">
              <svg width="14" height="14" fill="none" stroke="var(--muted)" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Audio Input
            </div>
            <span className={`pill ${status.cls}`}>{status.text}</span>
          </div>

          <div className="card-body">
            <div
              className="drop-zone"
              ref={dropRef}
              onClick={() => fileRef.current.click()}
              onDragOver={event => {
                event.preventDefault();
                dropRef.current.classList.add('over');
              }}
              onDragLeave={() => dropRef.current.classList.remove('over')}
              onDrop={onDrop}
            >
              <input type="file" accept="audio/*" ref={fileRef} onChange={onFileChange} style={{ display: 'none' }} />
              <div className="dz-icon-wrap">
                <svg width="22" height="22" fill="none" stroke="var(--teal)" strokeWidth="1.8" viewBox="0 0 24 24">
                  <polyline points="16 16 12 12 8 16" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                </svg>
              </div>
              <h3>Drop your audio file here</h3>
              <p>or click to browse</p>
              <div className="fmt-chips">
                {['WAV', 'MP3', 'M4A', 'OGG', 'FLAC'].map(format => (
                  <span key={format} className="fmt-chip">{format}</span>
                ))}
              </div>
            </div>

            <button className={`rec-btn ${recording ? 'recording' : ''}`} onClick={toggleRecord}>
              <span className={`rec-emoji ${recording ? 'active' : ''}`} aria-hidden="true">
                {recording ? '🔴' : '🎙️'}
              </span>
              {recording ? 'Stop Recording' : 'Record Live Audio'}
            </button>

            {audioURL && (
              <div className="audio-preview">
                <p className="audio-label">Loaded Audio</p>
                <audio controls src={audioURL} style={{ width: '100%', height: '34px' }} />
              </div>
            )}

            <hr className="divider" />

            <div className="target-word-wrap">
              <label className="form-label">Target Word</label>
              <input
                className="form-input"
                placeholder="e.g. butterfly"
                value={targetWord}
                onChange={event => setTargetWord(event.target.value)}
              />
            </div>

            <label className="form-label" style={{ marginBottom: '10px', display: 'block' }}>
              Patient Details <span style={{ color: 'var(--light)', fontWeight: 300 }}>(optional)</span>
            </label>

            <div className="form-grid">
              <div>
                <label className="form-label">Name</label>
                <input
                  className="form-input"
                  placeholder="e.g. Arjun"
                  value={patientInfo.name}
                  onChange={event => setPatientInfo(prev => ({ ...prev, name: event.target.value }))}
                />
              </div>

              <div>
                <label className="form-label">Age</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="e.g. 7"
                  min="1"
                  max="18"
                  value={patientInfo.age}
                  onChange={event => setPatientInfo(prev => ({ ...prev, age: event.target.value }))}
                />
              </div>

              <div>
                <label className="form-label">Session Type</label>
                <select
                  className="form-select"
                  value={patientInfo.sessionType}
                  onChange={event => setPatientInfo(prev => ({ ...prev, sessionType: event.target.value }))}
                >
                  <option value="">Select...</option>
                  <option>Initial Assessment</option>
                  <option>Follow-up Session</option>
                  <option>Practice Drill</option>
                  <option>Diagnostic Evaluation</option>
                </select>
              </div>

              <div>
                <label className="form-label">Therapist</label>
                <input
                  className="form-input"
                  placeholder="e.g. Dr. Priya"
                  value={patientInfo.therapist}
                  onChange={event => setPatientInfo(prev => ({ ...prev, therapist: event.target.value }))}
                />
              </div>
            </div>

            {errorText && <div className="error-box">{errorText}</div>}

            <button className="run-btn" onClick={runAnalysis} disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" /> Analysing...
                </>
              ) : (
                <>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Run Pronunciation Analysis
                </>
              )}
            </button>
          </div>
        </div>

        <div className="results-col">
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <svg width="14" height="14" fill="none" stroke="var(--muted)" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Pronunciation Summary
              </div>
            </div>

            <div className="card-body">
              <div className="transcript-box">
                {result ? (
                  <div className="result-summary">
                    <div className="summary-line">
                      <span className="summary-grade">{result.summary.grade}</span>
                      {result.accuracy !== null && <span className="pill pill-info">{result.accuracy}% accuracy</span>}
                      {result.per !== null && <span className="pill pill-warn">{result.per}% PER</span>}
                    </div>
                    <p className="summary-copy">{result.summary.message}</p>
                    <div className="phoneme-stack">
                      <div>
                        <span className="mini-label">Target Word</span>
                        <strong>{result.target_word}</strong>
                      </div>
                      <div>
                        <span className="mini-label">Expected</span>
                        <code>{formatPhonemeSequence(result.expected_phonemes)}</code>
                      </div>
                      <div>
                        <span className="mini-label">Detected</span>
                        <code>{formatPhonemeSequence(result.detected_phonemes)}</code>
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="placeholder-text">
                    The target word, expected phonemes, and detected phonemes will appear here after analysis.
                  </span>
                )}
              </div>

              {result && (
                <div className="legend">
                  <div className="leg-item"><div className="leg-dot" style={{ background: '#ecfdf5', border: '1px solid #34d399' }} />Correct</div>
                  <div className="leg-item"><div className="leg-dot" style={{ background: '#fde8e8', border: '1px solid #fca5a5' }} />Substitution</div>
                  <div className="leg-item"><div className="leg-dot" style={{ background: '#fef3c7', border: '1px solid #fcd34d' }} />Omission</div>
                  <div className="leg-item"><div className="leg-dot" style={{ background: '#eff6ff', border: '1px solid #93c5fd' }} />Insertion</div>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <svg width="14" height="14" fill="none" stroke="var(--muted)" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
                Phoneme Breakdown
              </div>
              {result && result.per !== null && <span className="pill pill-ok">PER {result.per}%</span>}
            </div>

            <div className="card-body" style={{ padding: 0 }}>
              {result ? (
                <table className="ph-table">
                  <thead>
                    <tr>
                      <th>Expected</th>
                      <th>Detected</th>
                      <th>Status</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.all_phonemes.map((phoneme, index) => (
                      <tr key={`${phoneme.ph}-${index}`}>
                        <td><span className="ph-sym">{phoneme.ph}</span></td>
                        <td><span className="ph-sym">{result.alignment[index] ? result.alignment[index].detected : '(missed)'}</span></td>
                        <td><span className="err-badge" style={errStyle(phoneme.err)}>{phoneme.err}</span></td>
                        <td>
                          <div className="acc-row">
                            <div className="acc-bar-bg">
                              <div className="acc-bar-fill" style={{ width: `${phoneme.acc}%`, background: barColor(phoneme.acc) }} />
                            </div>
                            <span className="acc-pct">{phoneme.acc}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">Analysis</div>
                  <p>Phoneme breakdown appears<br />after running analysis.</p>
                </div>
              )}
            </div>
          </div>

          {result && result.alignment.length > 0 && (
            <div className="card">
              <div className="card-head">
                <div className="card-title">Alignment Details</div>
              </div>
              <div className="card-body">
                <div className="alignment-grid">
                  {result.alignment.map((item, index) => (
                    <div className="alignment-row" key={`${item.expected}-${item.detected}-${index}`}>
                      <span className="ph-sym">{item.expected}</span>
                      <span className="align-arrow">to</span>
                      <span className="ph-sym">{item.detected}</span>
                      <span className="err-badge" style={alignStatusTone(item.status)}>{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {result && (
            <button
              className="btn-teal"
              style={{ width: '100%', justifyContent: 'center', padding: '13px' }}
              onClick={() => navigate('/feedback')}
            >
              View Feedback and Exercises
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
