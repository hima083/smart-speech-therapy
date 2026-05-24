const EXPLICIT_API_BASE_URL = process.env.REACT_APP_API_BASE_URL?.trim().replace(/\/$/, '');
const DEV_PORTS = new Set(['3000', '3001', '4173', '5173']);

function buildCandidateBaseUrls() {
  if (typeof window === 'undefined') {
    return [EXPLICIT_API_BASE_URL || 'http://localhost:8000'];
  }

  const { protocol, hostname, port, origin } = window.location;
  const candidates = [];

  if (EXPLICIT_API_BASE_URL) {
    candidates.push(EXPLICIT_API_BASE_URL);
  }

  if (!EXPLICIT_API_BASE_URL) {
    if (hostname === 'localhost' || hostname === '127.0.0.1' || DEV_PORTS.has(port)) {
      candidates.push(`${protocol}//${hostname}:8000`);
    } else {
      candidates.push(origin);
      candidates.push(`${protocol}//${hostname}:8000`);
    }
  } else {
    candidates.push(origin);
    candidates.push(`${protocol}//${hostname}:8000`);
  }

  return [...new Set(candidates.map((value) => value.replace(/\/$/, '')))].filter(Boolean);
}

const API_BASE_URLS = buildCandidateBaseUrls();

function buildSessionMeta(patientInfo) {
  return {
    patient: patientInfo.name || 'Anonymous',
    age: patientInfo.age || '',
    sessType: patientInfo.sessionType || 'Word Practice',
    therapist: patientInfo.therapist || '',
    date: new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  };
}

export function getApiBaseUrl() {
  return API_BASE_URLS[0];
}

export async function fetchApi(path, options) {
  let lastError = null;

  for (const baseUrl of API_BASE_URLS) {
    try {
      return await fetch(`${baseUrl}${path}`, options);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Cannot reach the backend. Tried: ${API_BASE_URLS.join(', ')}. Make sure the FastAPI server is running and REACT_APP_API_BASE_URL is correct.`
  );
}

export async function analyzeSpeech({ audioFile, targetWord, patientInfo }) {
  const form = new FormData();
  form.append('audio', audioFile, audioFile.name || 'recording.webm');
  form.append('target_word', targetWord.trim());

  const response = await fetchApi('/api/analyze', {
    method: 'POST',
    body: form,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.detail || 'Analysis failed. Please try again.');
  }

  return {
    ...payload,
    ...buildSessionMeta(patientInfo),
  };
}
