export async function ensureWavFile(inputFile) {
  if (!inputFile) return inputFile;

  const name = inputFile.name || 'recording.webm';
  const isWav = inputFile.type === 'audio/wav' || inputFile.type === 'audio/x-wav' || name.toLowerCase().endsWith('.wav');
  if (isWav) {
    return inputFile;
  }

  const arrayBuffer = await inputFile.arrayBuffer();
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    throw new Error('Web Audio API is not supported in this browser.');
  }

  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const wavBlob = audioBufferToWav(audioBuffer);
  await audioContext.close();

  const fileName = name.includes('.') ? name.replace(/\.[^/.]+$/, '.wav') : `${name}.wav`;
  return new File([wavBlob], fileName, { type: 'audio/wav' });
}

function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const bufferLength = 44 + length * blockAlign;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length * blockAlign, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length * blockAlign, true);

  const interleaved = getInterleavedChannels(buffer);
  floatTo16BitPCM(view, 44, interleaved);

  return new Blob([view], { type: 'audio/wav' });
}

function getInterleavedChannels(buffer) {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const result = new Float32Array(length);

  if (numChannels === 1) {
    return buffer.getChannelData(0);
  }

  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let channel = 0; channel < numChannels; channel += 1) {
      sum += buffer.getChannelData(channel)[i];
    }
    result[i] = sum / numChannels;
  }

  return result;
}

function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i += 1, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7fff;
    output.setInt16(offset, s, true);
  }
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i += 1) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
