import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const features = [
  { icon: '🎙️', color: '#f0fdfb', title: 'Upload or Record', desc: 'Upload audio files in any format or record live from the browser. The platform handles preprocessing instantly.' },
  { icon: '🔬', color: '#eff6ff', title: 'Phoneme Analysis',  desc: 'Detects substitutions, omissions and insertions at the phoneme level with visual highlighting in the transcript.' },
  { icon: '💬', color: '#fffbeb', title: 'Corrective Feedback', desc: 'Personalised exercises and listen-along TTS audio for every detected error, tailored to the child\'s profile.' },
  { icon: '📋', color: '#ecfdf5', title: 'Clinical Report',   desc: 'A printable session report with error tables, accuracy scores, PER and therapy recommendations.' },
];

const steps = [
  { n: '01', icon: '🎤', title: 'Record or Upload',  desc: 'Capture the child\'s voice live or upload a saved audio file.' },
  { n: '02', icon: '⚙️', title: 'AI Analyses Speech', desc: 'The model transcribes and detects every phoneme-level error in real time.' },
  { n: '03', icon: '💡', title: 'Get Feedback',       desc: 'Receive personalised exercises and audio demos for each error found.' },
  { n: '04', icon: '📄', title: 'Export Report',      desc: 'Download or print a structured clinical report for the therapist or parent.' },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home">

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-grid" />

        <div className="hero-pill">
          <span className="hero-dot" />
          AI-Powered · Real-Time · Personalised
        </div>

        <h1 className="hero-h1">
          Helping Children Find<br />Their <em>Clearest Voice</em>
        </h1>

        <p className="hero-sub">
          SpeechSense is an intelligent speech therapy platform designed for children facing speech sound difficulties.
          Upload or record speech and receive instant phoneme-level analysis, corrective feedback,
          and a full clinical report — in seconds.
        </p>

        <div className="hero-btns">
          <button className="btn-teal hero-btn-main" onClick={() => navigate('/analyze')}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" />
            </svg>
            Start Analysis
          </button>
        </div>
      </section>

      {/* ── FEATURE CARDS ── */}
      <section className="feature-section">
        <div className="feature-grid">
          {features.map(f => (
            <div className="feat-card" key={f.title}>
              <div className="feat-icon" style={{ background: f.color }}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="how-section">
        <div className="how-label">How It Works</div>
        <h2 className="how-title">Four simple steps</h2>
        <p className="how-desc">From recording to report in under a minute.</p>

        <div className="steps-grid">
          {steps.map(s => (
            <div className="step-card" key={s.n}>
              <div className="step-num">{s.n}</div>
              <div className="step-icon">{s.icon}</div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="how-cta">
          <button className="btn-teal" onClick={() => navigate('/analyze')}>
            Get Started Free →
          </button>
        </div>
      </section>

    </div>
  );
}
