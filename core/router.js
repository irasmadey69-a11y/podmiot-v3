// =============================
// PODMIOT CORE — ROUTER
// =============================

export function routeIntent({
  input = "",
  context = null,
  safetyGate = null,
  nextStep = null
} = {}) {
  const text = String(input || "").trim().toLowerCase();

  // 1. Safety ma zawsze pierwszeństwo
  if (safetyGate?.blocked) {
    return {
      route: "SAFETY_BLOCK",
      mode: "BLOCK",
      reason: safetyGate.reason || "Zablokowano przez safety gate."
    };
  }

  // 2. Brak inputu -> tryb orientacji / następnego kroku
  if (!text) {
    return {
      route: "IDLE_GUIDE",
      mode: "GUIDE",
      reason: "Brak wejścia użytkownika — system powinien wskazać następny krok."
    };
  }

  // 3. Pytania o plan / co dalej / następny krok
  if (
    includesAny(text, [
      "co teraz",
      "co dalej",
      "następny krok",
      "jaki krok",
      "od czego zacząć",
      "jak zacząć"
    ])
  ) {
    return {
      route: "NEXT_STEP",
      mode: "GUIDE",
      reason: "Użytkownik pyta o następny krok lub kierunek działania."
    };
  }

  // 4. Pytania o stan systemu / urządzeń / telefonu
  if (
    includesAny(text, [
      "stan telefonu",
      "stan systemu",
      "bridge",
      "bateria",
      "bluetooth",
      "wifi",
      "wi-fi",
      "sieć",
      "network",
      "urządzenia",
      "devices"
    ])
  ) {
    return {
      route: "SYSTEM_STATUS",
      mode: "STATUS",
      reason: "Użytkownik pyta o stan urządzeń, telefonu albo połączeń."
    };
  }

  // 5. Komendy operacyjne / wykonawcze
  if (
    includesAny(text, [
      "włącz",
      "wyłącz",
      "uruchom",
      "otwórz ustawienia",
      "open settings",
      "open wi-fi",
      "open bluetooth",
      "zrób zdjęcie",
      "włącz kamerę",
      "zatrzymaj kamerę"
    ])
  ) {
    return {
      route: "ACTION",
      mode: "EXECUTE",
      reason: "Wejście wygląda jak polecenie wykonania akcji."
    };
  }

  // 6. Jeśli jest aktywna misja i input dotyczy pracy / decyzji -> tryb fokus
  if (context?.mission?.active) {
    return {
      route: "MISSION_FOCUS",
      mode: "FOCUS",
      reason: "System ma aktywną misję, więc odpowiedź powinna wspierać jej realizację."
    };
  }

  // 7. Jeśli jest next step i pytanie jest ogólne -> tryb prowadzenia
  if (nextStep?.text) {
    return {
      route: "GUIDED_RESPONSE",
      mode: "GUIDE",
      reason: "Brak wyraźnej komendy — system powinien odpowiedzieć z uwzględnieniem bieżącego kroku."
    };
  }

  // 8. Domyślnie normalna odpowiedź
  return {
    route: "NORMAL_RESPONSE",
    mode: "RESPOND",
    reason: "Brak szczególnego trybu — standardowa odpowiedź."
  };
}

function includesAny(text, patterns = []) {
  return patterns.some(pattern => text.includes(pattern));
}