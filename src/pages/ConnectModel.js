import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ConnectModel.css';

const steps = [
  {
    n: 1,
    title: 'Create a Hugging Face Access Token',
    desc: 'Sign in to Hugging Face and generate an access token with inference scope.',
    code: `1. Go to https://huggingface.co/settings/tokens
2. Create a new token with the "Inference" scope
3. Copy the token value and keep it safe`,
    note: 'Your Hugging Face token is used by the React app to call the hosted model directly.',
  },
  {
    n: 2,
    title: 'Use the hosted model name',
    desc: 'The app is configured to call your uploaded model on Hugging Face.',
    code: `akshithawork1422/neurospace`,
    note: 'If you upload a different model later, update the model name on the Analyze page.',
  },
  {
    n: 3,
    title: 'Enter your token on the Analyze page',
    desc: 'Paste your Hugging Face token into the API settings section of the Analyze page.',
    code: `Hugging Face Model: akshithawork1422/neurospace
Hugging Face Token: <YOUR_TOKEN>`,
    note: 'The token is stored locally in your browser and used for each analysis request.',
  },
  {
    n: 4,
    title: 'Run speech analysis from the browser',
    desc: 'Upload or record audio, then click Run Phoneme Analysis to send audio to Hugging Face.',
    code: `const res = await fetch('https://api-inference.huggingface.co/models/akshithawork1422/neurospace', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer <YOUR_TOKEN>',
    'Content-Type': 'audio/wav',
  },
  body: audioFile,
});
const data = await res.json();`,
    note: 'If the model is still loading, the API may take a few seconds to respond on first request.',
  },
  {
    n: 5,
    title: 'Ready to analyse speech',
    desc: 'Go back to the Analyze page, upload speech audio, and click Run Phoneme Analysis.',
    code: `# On the Analyze page
# 1. Select or record audio
# 2. Click Run Phoneme Analysis
# 3. View transcript and feedback`,
    note: null,
  },
];

export default function ConnectModel() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(null);

  function copyCode(code, idx) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(idx);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="page-label">Hugging Face Integration</div>
        <h1 className="page-title">Connect Your Hosted Model</h1>
        <p className="page-desc">
          Step-by-step guide to connect your Hugging Face model <code className="inline-code">akshithawork1422/neurospace</code>
          directly from the React app using the Hugging Face Inference API.
        </p>
      </div>

      <div className="steps-list">
        {steps.map((s, idx) => (
          <div className="step-block" key={s.n}>
            <div className="sb-num">{s.n}</div>
            <div className="sb-body">
              <h4 className="sb-title">{s.title}</h4>
              <p className="sb-desc">{s.desc}</p>

              <div className="code-wrap">
                <button className="copy-btn" onClick={() => copyCode(s.code, idx)}>
                  {copied === idx ? '✓ Copied' : 'Copy'}
                </button>
                <pre><code>{s.code}</code></pre>
              </div>

              {s.note && (
                <div className="note-box">
                  <svg width="14" height="14" fill="none" stroke="var(--amber)" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {s.note}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Done card */}
        <div className="done-block">
          <div className="done-check">✓</div>
          <div className="sb-body">
            <h4 className="sb-title">You're All Set!</h4>
            <p className="sb-desc">
              Go to the <strong>Analyze</strong> page, upload or record speech, and click{' '}
              <strong>Run Phoneme Analysis</strong>. Results, feedback and the report will all
              populate automatically from your model's output.
            </p>
            <button className="btn-teal" style={{ marginTop: '12px' }} onClick={() => navigate('/analyze')}>
              Go to Analyse →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
