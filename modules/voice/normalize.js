// modules/voice/normalize.js

export function normalizeCommand(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[.,!?;:()"'“”„”]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}