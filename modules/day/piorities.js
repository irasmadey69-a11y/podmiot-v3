export function getPriorities(profile = {}) {
  const fallback = {
    truth: 100,
    safety: 100,
    usefulness: 80,
    speed: 60,
    coherence: 70,
    help: 40,
    like: 33
  };

  if (!profile || typeof profile !== "object") {
    return fallback;
  }

  const p = profile.priorities;
  if (!p || typeof p !== "object") {
    return fallback;
  }

  return {
    truth: Number(p.truth ?? fallback.truth),
    safety: Number(p.safety ?? fallback.safety),
    usefulness: Number(p.usefulness ?? fallback.usefulness),
    speed: Number(p.speed ?? fallback.speed),
    coherence: Number(p.coherence ?? fallback.coherence),
    help: Number(p.help ?? fallback.help),
    like: Number(p.like ?? fallback.like)
  };
}
