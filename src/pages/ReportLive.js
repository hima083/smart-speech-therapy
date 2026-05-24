import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Report.css';

export default function ReportLive() {
  const navigate = useNavigate();
  const { analysisResult } = useApp();

  if (!analysisResult) {
    return (
      <div className="page-wrapper">
        <div className="page-header">
          <div className="page-label">Step 3</div>
          <h1 className="page-title">Clinical Report</h1>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '56px 24px' }}>
          <div style={{ fontSize: '2.2rem', opacity: 0.3, marginBottom: '14px' }}>Report</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '20px' }}>
            Run an analysis first to generate the clinical report.
          </p>
          <button className="btn-teal" onClick={() => navigate('/analyze')}>Go to Analyse</button>
        </div>
      </div>
    );
  }

  const d = analysisResult;
  const substitutionCount = d.phoneme_errors.filter(error => error.type === 'substitution').length;
  const omissionCount = d.phoneme_errors.filter(error => error.type === 'omission').length;
  const insertionCount = d.phoneme_errors.filter(error => error.type === 'insertion').length;
  const correctMatches = d.all_phonemes.filter(item => item.err === 'Correct').map(item => item.ph);

  const summary =
    `${d.patient} completed a word-level pronunciation analysis for "${d.target_word}" on ${d.date}. ` +
    `The NeuroSpeech model detected ${d.detected_phonemes.length} phonemes against ${d.expected_phonemes.length || 0} expected phonemes. ` +
    `${d.accuracy !== null ? `Overall accuracy was ${d.accuracy}%` : 'Overall accuracy could not be calculated'} ` +
    `${d.per !== null ? `with a word-level phoneme error rate of ${d.per}%.` : 'because expected phonemes were unavailable.'} ` +
    `The attempt included ${substitutionCount} substitutions, ${omissionCount} omissions, and ${insertionCount} insertions. ` +
    `${correctMatches.length > 0 ? `Correct matches were observed for ${correctMatches.join(', ')}.` : 'No fully matched target phonemes were observed in this attempt.'}`;

  function errColor(acc) {
    return acc < 65 ? 'var(--red)' : acc < 80 ? 'var(--amber)' : 'var(--green)';
  }

  function copySum() {
    navigator.clipboard.writeText(summary).then(() => alert('Summary copied!'));
  }

  return (
    <div className="page-wrapper rpage">
      <div className="page-header">
        <div className="page-label">Step 3</div>
        <h1 className="page-title">Clinical Report</h1>
        <p className="page-desc">A complete pronunciation report ready to print or share with a supervising clinician.</p>
      </div>

      <div className="report-wrap no-print-actions">
        <div className="report-head">
          <div>
            <h2 className="report-h2">Speech Therapy Session Report</h2>
            <p className="report-sub">SpeechSense | {d.date}</p>
          </div>
          <div className="report-score-box">
            <div className="report-score-val">{d.accuracy !== null ? `${d.accuracy}%` : 'N/A'}</div>
            <div className="report-score-lbl">Word Accuracy</div>
          </div>
        </div>

        <div className="report-body">
          <div className="report-meta">
            <div><div className="rm-label">Patient</div><div className="rm-val">{d.patient}</div></div>
            <div><div className="rm-label">Age</div><div className="rm-val">{d.age ? `${d.age} yrs` : '-'}</div></div>
            <div><div className="rm-label">Session Type</div><div className="rm-val">{d.sessType}</div></div>
            <div><div className="rm-label">Therapist</div><div className="rm-val">{d.therapist || '-'}</div></div>
            <div><div className="rm-label">Target Word</div><div className="rm-val">{d.target_word}</div></div>
            <div><div className="rm-label">Error Rate (PER)</div><div className="rm-val">{d.per !== null ? `${d.per}%` : 'N/A'}</div></div>
          </div>

          <div className="report-section">
            <h3 className="rs-head">Clinical Summary</h3>
            <div className="r-summary">{summary}</div>
          </div>

          <div className="report-section">
            <h3 className="rs-head">Detected Phoneme Errors</h3>
            {d.phoneme_errors.length > 0 ? (
              <table className="r-table">
                <thead>
                  <tr>
                    <th>Word</th>
                    <th>Target Phoneme</th>
                    <th>Error Type</th>
                    <th>Produced</th>
                    <th>Tip</th>
                  </tr>
                </thead>
                <tbody>
                  {d.phoneme_errors.map((error, index) => (
                    <tr key={index}>
                      <td style={{ fontWeight: 600 }}>{error.word}</td>
                      <td><span className="ph-sym">{error.phoneme}</span></td>
                      <td>{error.type.charAt(0).toUpperCase() + error.type.slice(1)}</td>
                      <td style={{ fontFamily: 'monospace' }}>{error.produced}</td>
                      <td style={{ color: errColor(error.accuracy) }}>{error.tip_title || 'Retry with slower articulation'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="r-summary">
                No substitutions, omissions, or insertions were detected for this target word.
              </div>
            )}
          </div>

          <div className="report-section">
            <h3 className="rs-head">Expected vs Detected</h3>
            <table className="r-table">
              <thead>
                <tr>
                  <th>Expected</th>
                  <th>Detected</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {d.alignment.map((item, index) => (
                  <tr key={`${item.expected}-${item.detected}-${index}`}>
                    <td>{item.expected}</td>
                    <td>{item.detected}</td>
                    <td>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="report-section">
            <h3 className="rs-head">Therapeutic Recommendations</h3>
            <ol className="r-recs">
              {d.recommendations.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ol>
          </div>
        </div>

        <div className="report-actions no-print">
          <button className="btn-teal btn-sm" onClick={() => window.print()}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print / Save PDF
          </button>
          <button className="btn-sm" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text2)' }} onClick={copySum}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy Summary
          </button>
          <button className="btn-sm" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text2)' }} onClick={() => navigate('/analyze')}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Session
          </button>
        </div>
      </div>
    </div>
  );
}
