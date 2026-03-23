// =============================
// PODMIOT CORE — AUTONOMY
// =============================

export function evaluateAutonomy({
  context = null,
  route = null,
  nextStep = null,
  safetyGate = null
} = {}) {
  const safeContext = context || {};
  const safeRoute = route || {};
  const safeNextStep = nextStep || {};
  const safeSafety = safetyGate || {};

  // 1. Safety block zawsze wyłącza autonomię
  if (safeSafety.blocked) {
    return {
      allowed: false,
      mode: "BLOCKED",
      shouldSuggest: false,
      shouldAskUser: false,
      proposal: null,
      reason: safeSafety.reason || "Safety gate blocked the flow."
    };
  }

  // 2. Jeśli akcja wymaga potwierdzenia — tylko pytanie do użytkownika
  if (safeSafety.requiresConfirmation) {
    return {
      allowed: false,
      mode: "CONFIRM_REQUIRED",
      shouldSuggest: true,
      shouldAskUser: true,
      proposal: {
        type: "CONFIRM_ACTION",
        title: "Akcja wymaga potwierdzenia",
        text: safeSafety.reason || "Ta akcja wymaga zgody użytkownika."
      },
      reason: "System nie powinien wykonywać tej akcji samodzielnie."
    };
  }

  // 3. Jeśli route sugeruje kolejny krok — zaproponuj, ale nie wykonuj
  if (safeRoute.route === "NEXT_STEP" || safeRoute.route === "GUIDED_RESPONSE" || safeRoute.route === "IDLE_GUIDE") {
    return {
      allowed: true,
      mode: "SUGGEST_ONLY",
      shouldSuggest: true,
      shouldAskUser: false,
      proposal: {
        type: "NEXT_STEP_PROPOSAL",
        title: "Sugestia następnego kroku",
        text: safeNextStep.text || "Ustal kolejny krok.",
        reason: safeNextStep.reason || "Brak uzasadnienia."
      },
      reason: "System może zaproponować kolejny krok bez wykonywania działania."
    };
  }

  // 4. Jeśli aktywna misja — można sugerować fokus
  if (safeContext.mission?.active) {
    return {
      allowed: true,
      mode: "MISSION_SUPPORT",
      shouldSuggest: true,
      shouldAskUser: false,
      proposal: {
        type: "MISSION_SUPPORT",
        title: "Wsparcie misji",
        text: safeNextStep.text || `Kontynuuj misję: ${safeContext.mission.text || ""}`,
        reason: "Aktywna misja ma pierwszeństwo."
      },
      reason: "System może wspierać aktywną misję sugestiami."
    };
  }

  // 5. Dla route ACTION — bez zgody nic nie wykonuj
  if (safeRoute.route === "ACTION") {
    return {
      allowed: false,
      mode: "WAIT_USER",
      shouldSuggest: true,
      shouldAskUser: true,
      proposal: {
        type: "ACTION_WAIT",
        title: "Czekam na decyzję użytkownika",
        text: "Wykryto możliwą akcję operacyjną. Potwierdź, jeśli mam iść dalej.",
        reason: "Akcje wykonawcze nie powinny ruszać samodzielnie."
      },
      reason: "System nie wykonuje akcji sam bez potwierdzenia."
    };
  }

  // 6. Domyślnie tylko informacja / odpowiedź
  return {
    allowed: true,
    mode: "RESPOND_ONLY",
    shouldSuggest: false,
    shouldAskUser: false,
    proposal: null,
    reason: "Brak potrzeby autonomicznej sugestii w tej sytuacji."
  };
}

// =============================
// SHORT SUMMARY
// =============================

export function getAutonomySummary(autonomy) {
  const a = autonomy || {};

  return {
    mode: a.mode || "UNKNOWN",
    allowed: !!a.allowed,
    shouldSuggest: !!a.shouldSuggest,
    shouldAskUser: !!a.shouldAskUser,
    reason: a.reason || ""
  };
}