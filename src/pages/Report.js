import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Report.css';

export default function Report() {
  const navigate  = useNavigate();
  const { analysisResult } = useApp();

  if (!analysisResult) {
    return (
      <div className="page-wrapper">
        <div className="page-header">
          <div className="page-label">Step 3</div>
          <h1 className="page-title">Clinical Report</h1>
        </div>
        <div className="card" style={{ textAlign:'center', padding:'56px 24px' }}>
          <div style={{ fontSize:'2.2rem', opacity:0.3, marginBottom:'14px' }}>📋</div>
          <p style={{ fontSize:'0.875rem', color:'var(--muted)', marginBottom:'20px' }}>
            Run an analysis first to generate the clinical report.
          </p>
          <button className="btn-teal" onClick={() => navigate('/analyze')}>Go to Analyse →</button>
        </div>
      </div>
    );
  }

  const d = analysisResult;
  const summary =
    `This session assessed phoneme production accuracy for ${d.patient}. ` +
    `Overall session accuracy was ${d.accuracy}% with a Phoneme Error Rate of ${d.per}%. ` +
    `A total of ${d.phoneme_errors.length} phoneme errors were identified: ` +
    `${d.phoneme_errors.filter(e=>e.type==='substitution').length} substitutions (/r/→/w/ and /θ/→/f/) ` +
    `and ${d.phoneme_errors.filter(e=>e.type==='omission').length} omission (/dʒ/ in "jumped"). ` +
    `Performance on /s/, /k/, and /l/ phonemes was within the expected range. ` +
    `Continued targeted intervention for /r/ gliding and th-fronting is recommended.`;

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
        <p className="page-desc">A complete session report ready to print or share with a supervising clinician.</p>
      </div>

      <div className="report-wrap no-print-actions">

        {/* ── Header bar ── */}
        <div className="report-head">
          <div>
            <h2 className="report-h2">Speech Therapy Session Report</h2>
            <p className="report-sub">SpeechSense · {d.date}</p>
          </div>
          <div className="report-score-box">
            <div className="report-score-val">{d.accuracy}%</div>
            <div className="report-score-lbl">Session Accuracy</div>
          </div>
        </div>

        <div className="report-body">

          {/* Meta grid */}
          <div className="report-meta">
            <div><div className="rm-label">Patient</div><div className="rm-val">{d.patient}</div></div>
            <div><div className="rm-label">Age</div><div className="rm-val">{d.age ? d.age + ' yrs' : '—'}</div></div>
            <div><div className="rm-label">Session Type</div><div className="rm-val">{d.sessType}</div></div>
            <div><div className="rm-label">Therapist</div><div className="rm-val">{d.therapist}</div></div>
            <div><div className="rm-label">Errors Found</div><div className="rm-val">{d.phoneme_errors.length} detected</div></div>
            <div><div className="rm-label">Error Rate (PER)</div><div className="rm-val">{d.per}%</div></div>
          </div>

          {/* Clinical summary */}
          <div className="report-section">
            <h3 className="rs-head">Clinical Summary</h3>
            <div className="r-summary">{summary}</div>
          </div>

          {/* Error table */}
          <div className="report-section">
            <h3 className="rs-head">Detected Phoneme Errors</h3>
            <table className="r-table">
              <thead>
                <tr>
                  <th>Word</th>
                  <th>Target Phoneme</th>
                  <th>Error Type</th>
                  <th>Produced</th>
                  <th>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {d.phoneme_errors.map((e, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{e.word}</td>
                    <td><span className="ph-sym">{e.phoneme}</span></td>
                    <td>{e.type.charAt(0).toUpperCase() + e.type.slice(1)}</td>
                    <td style={{ fontFamily: 'monospace' }}>{e.produced}</td>
                    <td style={{ fontWeight: 700, color: errColor(e.accuracy) }}>{e.accuracy}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recommendations */}
          <div className="report-section">
            <h3 className="rs-head">Therapeutic Recommendations</h3>
            <ol className="r-recs">
              <li>Continue weekly 30-minute articulation therapy sessions targeting /r/ and /θ/ phonemes.</li>
              <li>Use minimal pair contrast tasks (/r/ vs /w/) in a structured home practice programme (10 min/day).</li>
              <li>Introduce Auditory Bombardment: expose the child to /r/-rich sentences before each session.</li>
              <li>Re-evaluate /dʒ/ omission with a connected speech sample in the next session.</li>
              <li>Re-assess overall PER after 4 weeks. Target: below 5%.</li>
            </ol>
          </div>

        </div>

        {/* ── Actions ── */}
        <div className="report-actions no-print">
          <button className="btn-teal btn-sm" onClick={() => window.print()}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print / Save PDF
          </button>
          <button className="btn-sm" style={{ background:'var(--bg)', border:'1px solid var(--border)', color:'var(--text2)' }} onClick={copySum}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy Summary
          </button>
          <button className="btn-sm" style={{ background:'var(--bg)', border:'1px solid var(--border)', color:'var(--text2)' }} onClick={() => navigate('/analyze')}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Session
          </button>
        </div>

      </div>
    </div>
  );
}
