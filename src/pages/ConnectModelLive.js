import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ConnectModel.css';

const steps = [
  {
    n: 1,
    title: 'Install the Backend Dependencies',
    desc: 'The React UI now talks to a FastAPI backend in the backend/ folder. Install the Python packages first.',
    code: `cd backend
python -m pip install -r requirements.txt`,
    note: 'This installs FastAPI plus the model runtime dependencies used by the uploaded Hugging Face checkpoint.',
  },
  {
    n: 2,
    title: 'Model Source',
    desc: 'The backend is already configured to download your uploaded model directly from Hugging Face.',
    code: `HF model repo:  akshithawork1422/neurospace
HF model file:  best_cmu_93.2pct.pt
HuBERT base:    facebook/hubert-large-ls960-ft`,
    note: 'You do not need to copy the checkpoint into this repo manually. The backend fetches it with huggingface_hub on startup.',
  },
  {
    n: 3,
    title: 'Run the Backend',
    desc: 'Start the API server from the backend/ folder. On first launch it will download the checkpoint from Hugging Face.',
    code: `cd backend
uvicorn app:app --reload --host 0.0.0.0 --port 8000`,
    note: 'The initial download can take a while because the checkpoint is large. Later runs reuse the cached files.',
  },
  {
    n: 4,
    title: 'Optional Environment Variables',
    desc: 'If you want to change the model source or serve the API from another host, these env vars are supported.',
    code: `# Backend
HF_MODEL_REPO=akshithawork1422/neurospace
HF_MODEL_FILE=best_cmu_93.2pct.pt
HF_HUBERT_MODEL=facebook/hubert-large-ls960-ft

# Frontend
REACT_APP_API_BASE_URL=http://localhost:8000`,
    note: 'If REACT_APP_API_BASE_URL is not set, the UI defaults to http://localhost:8000.',
  },
  {
    n: 5,
    title: 'Start the React App',
    desc: 'Run the frontend in a second terminal.',
    code: `npm install
npm start`,
    note: 'The analyse screen now sends both the audio file and the target word to /api/analyze.',
  },
  {
    n: 6,
    title: 'Use the New Flow',
    desc: 'Open the analyse page, type a target word, upload or record audio, and run the model.',
    code: `1. Open http://localhost:3000
2. Go to Analyze
3. Enter a target word like "butterfly"
4. Upload audio or record a sample
5. Review the alignment, feedback, and report pages`,
    note: 'The public Hugging Face Space deployment currently fails during model load, so this local backend is the reliable integration path for the uploaded model.',
  },
];

export default function ConnectModelLive() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(null);

  function copyCode(code, index) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(index);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="page-label">Integration Guide</div>
        <h1 className="page-title">Connect Your Hugging Face Model</h1>
        <p className="page-desc">
          Step-by-step guide to run <code className="inline-code">akshithawork1422/neurospace</code> behind this UI through the included FastAPI backend.
        </p>
      </div>

      <div className="steps-list">
        {steps.map((step, index) => (
          <div className="step-block" key={step.n}>
            <div className="sb-num">{step.n}</div>
            <div className="sb-body">
              <h4 className="sb-title">{step.title}</h4>
              <p className="sb-desc">{step.desc}</p>

              <div className="code-wrap">
                <button className="copy-btn" onClick={() => copyCode(step.code, index)}>
                  {copied === index ? 'Copied' : 'Copy'}
                </button>
                <pre><code>{step.code}</code></pre>
              </div>

              {step.note && (
                <div className="note-box">
                  <svg width="14" height="14" fill="none" stroke="var(--amber)" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {step.note}
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="done-block">
          <div className="done-check">OK</div>
          <div className="sb-body">
            <h4 className="sb-title">You are all set</h4>
            <p className="sb-desc">
              Go to the <strong>Analyze</strong> page, upload or record speech, add a target word,
              and click <strong>Run Pronunciation Analysis</strong>. Results, feedback, and the
              report will populate automatically from the model output.
            </p>
            <button className="btn-teal" style={{ marginTop: '12px' }} onClick={() => navigate('/analyze')}>
              Go to Analyse
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
