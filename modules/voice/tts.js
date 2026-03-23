// modules/voice/tts.js

export function voiceSpeak(text) {
  try {
    window.speechSynthesis?.cancel();
  } catch {}

  if (!text || !window.speechSynthesis) return;

  const u = new SpeechSynthesisUtterance(text);
  u.lang = "pl-PL";
  u.rate = 1.0;
  u.pitch = 1.0;

  window.speechSynthesis.speak(u);
}