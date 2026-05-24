function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

export function getLocalSpeechAssistantReply(question) {
  const normalizedQuestion = question.trim().toLowerCase();

  if (!normalizedQuestion) {
    return 'Please ask a question about speech analysis, phoneme errors, practice exercises, or how to use SpeechSense.';
  }

  if (includesAny(normalizedQuestion, ['hello', 'hi', 'hey', 'good morning', 'good afternoon'])) {
    return 'Hi! I can help with speech sound errors, practice ideas, reports, and how to use SpeechSense.';
  }

  if (includesAny(normalizedQuestion, ['gliding', '/r/', '/l/', 'wabbit'])) {
    return 'Gliding is a speech pattern where a child replaces /r/ or /l/ with an easier sound like /w/ or /j/, so "rabbit" may sound like "wabbit." It can be part of normal development in younger children, but if it continues past the expected age range, a speech-language pathologist can help.';
  }

  if (includesAny(normalizedQuestion, ['per', 'phoneme error rate'])) {
    return 'PER means Phoneme Error Rate. It shows how many phonemes were substituted, omitted, or added compared with the target word, so a lower PER usually means clearer pronunciation.';
  }

  if (includesAny(normalizedQuestion, ['r error', '/r/ error', 'fix /r/', 'how to fix r', 'r sound'])) {
    return 'For /r/ practice, start with slow repetitions, strong listening models, and short words the child can imitate clearly. It often helps to work with tongue placement cues from a speech-language pathologist because /r/ can be one of the hardest sounds to learn.';
  }

  if (includesAny(normalizedQuestion, ['th', '/th/', 'theta', 'fronting'])) {
    return 'For /th/ practice, try mirror work, gentle tongue-between-teeth placement, and short word drills like "think," "thumb," or "bath." Keep practice slow and accurate before moving to phrases.';
  }

  if (includesAny(normalizedQuestion, ['target word', 'target phrase', 'word', 'phrase'])) {
    return 'The target word tells SpeechSense which expected phoneme sequence to compare against. Use a clear English word or short phrase, then upload or record audio for analysis.';
  }

  if (includesAny(normalizedQuestion, ['audio', 'upload', 'record', 'file', 'wav', 'mp3'])) {
    return 'Use the app to upload or record audio, and the backend will decode it and compare the detected phonemes with the target word. If recording quality is poor, try again in a quieter room and speak a little more slowly.';
  }

  if (includesAny(normalizedQuestion, ['error', 'phoneme', 'substitution', 'omission', 'insertion'])) {
    return 'SpeechSense highlights phoneme substitutions, omissions, and insertions so you can see exactly where the pronunciation differs from the target. Those error patterns are useful for choosing focused practice.';
  }

  if (includesAny(normalizedQuestion, ['feedback', 'practice', 'exercise', 'listen', 'repeat'])) {
    return 'After analysis, check the feedback tips for the missed or substituted phonemes and practice them in isolation before repeating the whole word. Short, accurate repetitions usually help more than long, rushed practice.';
  }

  if (includesAny(normalizedQuestion, ['report', 'clinical', 'print', 'download'])) {
    return 'The report summarizes pronunciation accuracy, phoneme errors, and follow-up recommendations so progress is easier to review and share. It is helpful for tracking patterns over time, but it is not a diagnosis.';
  }

  if (includesAny(normalizedQuestion, ['backend', 'api', 'server', 'fastapi', 'gemini'])) {
    return 'The chat assistant normally talks to the FastAPI backend, which may then call Gemini for richer answers. If the backend is unavailable, SpeechSense can still answer a few built-in help questions locally.';
  }

  return 'I can help with speech sound patterns, phoneme errors, PER, practice ideas, and how to use SpeechSense. Try asking about gliding, /r/ errors, or /th/ exercises.';
}
