export function getMission(dayState = {}) {
  const fallback = {
    active: false,
    text: "",
    startedAt: null,
    status: "READY",
    elapsedMs: 0,
    lastTickAt: null
  };

  if (!dayState || typeof dayState !== "object") {
    return fallback;
  }

  if (!dayState.mission || typeof dayState.mission !== "object") {
    return fallback;
  }

  return {
    active: !!dayState.mission.active,
    text: dayState.mission.text || "",
    startedAt: dayState.mission.startedAt || null,
    status: dayState.mission.status || "READY",
    elapsedMs: Number(dayState.mission.elapsedMs || 0),
    lastTickAt: dayState.mission.lastTickAt || null
  };
}
