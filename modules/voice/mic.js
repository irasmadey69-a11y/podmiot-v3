// modules/voice/mic.js

export function createMicRecognition({
  lang = "pl-PL",
  onStart,
  onEnd,
  onError,
  onResult
} = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const recog = new SR();
  recog.lang = lang;
  recog.interimResults = true;
  recog.continuous = false;

  recog.onstart = () => {
    if (typeof onStart === "function") onStart();
  };

  recog.onend = () => {
    if (typeof onEnd === "function") onEnd();
  };

  recog.onerror = (e) => {
    if (typeof onError === "function") onError(e);
  };

  recog.onresult = (e) => {
    if (typeof onResult === "function") onResult(e);
  };

  return recog;
}