// =============================
// PODMIOT CORE — NEXT STEP
// =============================

export function getNextStepSuggestion({
  mission = {},
  commitments = [],
  events = [],
  goalNow = ""
} = {}) {
  const safeMission = mission || {};
  const safeCommitments = Array.isArray(commitments) ? commitments : [];
  const safeEvents = Array.isArray(events) ? events : [];
  const safeGoal = String(goalNow || "").trim();

  const activeCommitments = safeCommitments.filter(item => !item.done);
  const lastEvent = safeEvents.length ? safeEvents[safeEvents.length - 1] : null;

  // 1. Jeśli trwa misja — ona ma pierwszeństwo
  if (safeMission.text && safeMission.status === "RUNNING") {
    return {
      type: "mission_running",
      priority: 100,
      text: `Kontynuuj misję: ${safeMission.text}`,
      reason: "Masz aktywną misję w toku, więc najlepszy następny krok to ją domknąć albo przesunąć do konkretnego etapu."
    };
  }

  // 2. Jeśli misja jest gotowa, ale nie ruszona
  if (safeMission.text && safeMission.status === "READY") {
    return {
      type: "mission_ready",
      priority: 95,
      text: `Uruchom misję: ${safeMission.text}`,
      reason: "Misja jest ustawiona, ale jeszcze nie trwa. Najbardziej logiczny ruch to ją zacząć."
    };
  }

  // 3. Jeśli są aktywne zobowiązania
  if (activeCommitments.length > 0) {
    const first = activeCommitments[0];
    return {
      type: "active_commitment",
      priority: 85,
      text: `Zrób następny krok przy zadaniu: ${first.text}`,
      reason: "Masz otwarte zobowiązanie. Lepiej ruszyć jedną konkretną rzecz niż rozpraszać system na pięć kierunków naraz."
    };
  }

  // 4. Jeśli jest cel, ale nie ma jeszcze misji ani aktywnych zadań
  if (safeGoal) {
    return {
      type: "goal_without_task",
      priority: 75,
      text: `Zamień cel na jedno konkretne zadanie: ${safeGoal}`,
      reason: "Cel jest zapisany, ale nie ma jeszcze misji ani aktywnego kroku. Trzeba zejść poziom niżej: z celu do działania."
    };
  }

  // 5. Jeśli ostatnie zdarzenie istnieje, ale nic nie jest aktywne
  if (lastEvent && lastEvent.text) {
    return {
      type: "resume_from_event",
      priority: 60,
      text: `Sprawdź, czy trzeba wrócić do: ${lastEvent.text}`,
      reason: "Masz ostatni ślad działania w historii. To może być najlepszy punkt wznowienia pracy."
    };
  }

  // 6. Fallback — brak konkretów
  return {
    type: "idle",
    priority: 40,
    text: "Ustal jeden mały krok na teraz",
    reason: "Brakuje aktywnej misji, zobowiązań i wyraźnego celu. System potrzebuje jednego prostego punktu startowego."
  };
}

// =============================
// QUICK MODE — wersja skrócona
// =============================

export function getNextStepShort(params = {}) {
  const result = getNextStepSuggestion(params);
  return result.text || "Brak sugestii następnego kroku.";
}