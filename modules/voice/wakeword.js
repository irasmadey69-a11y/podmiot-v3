// modules/voice/wakeword.js

export function stripWakeWord(raw, wakeWords = []) {
  const t = (raw || "").trim();
  const low = t.toLowerCase().trim();

  const hit = wakeWords.find(w => low.startsWith(w));
  if (!hit) return null;

  let rest = t.slice(hit.length).trim();
  rest = rest.replace(/^[:,-]\s*/g, "");
  return rest.trim();
}