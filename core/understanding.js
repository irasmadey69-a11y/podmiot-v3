export function detectIntent(input = "") {
  const text = String(input || "")
  .replace(/[„”"']/g, "")   // usuwa cudzysłowy
  .replace(/[.,!?]/g, "")   // usuwa znaki
  .trim();

const lower = text.toLowerCase();

  if (!text) {
    return {
      type: "empty",
      confidence: 1,
      reason: "Brak treści"
    };
  }

  const commandPatterns = [
    "włącz",
    "wyłącz",
    "uruchom",
    "zatrzymaj",
    "odśwież",
    "dodaj",
    "usuń",
    "przeanalizuj",
    "sprawdź urządzenia",
    "włącz kamerę",
    "zrób zdjęcie"
  ];

  const functionPatterns = [
    "co potrafisz",
    "jakie masz funkcje",
    "co umiesz",
    "co możesz",
    "do czego służysz"
  ];

  const nextStepPatterns = [
  "co teraz",
  "co mam zrobić",
  "co mam teraz zrobić",
  "jaki krok",
  "od czego zacząć",
  "co dalej",
  "jaki następny krok"
];

  const chaosPatterns = [
    "chaos",
    "stoję w miejscu",
    "nie wiem co robić",
    "nie wiem co robić",
    "nie wiem od czego zacząć",
    "jestem zagubiony",
    "jestem zagubiona",
    "mam mętlik",
    "mam zamęt",
    "nie ogarniam"
  ];

  const missionPatterns = [
    "mam zadanie",
    "mam misję",
    "muszę zrobić",
    "chcę dziś zrobić",
    "moim celem jest"
  ];

  const hasCommand = commandPatterns.some(p => lower.includes(p));
  if (hasCommand) {
    return {
      type: "command",
      confidence: 0.9,
      reason: "Wykryto wzorzec komendy"
    };
  }

  const asksFunctions = functionPatterns.some(p => lower.includes(p));
  if (asksFunctions) {
    return {
      type: "functions",
      confidence: 0.95,
      reason: "Pytanie o możliwości systemu"
    };
  }

  const asksNextStep = nextStepPatterns.some(p => lower.includes(p));
  if (asksNextStep) {
    return {
      type: "next_step",
      confidence: 0.9,
      reason: "Pytanie o następny krok"
    };
  }

  const hasChaos = chaosPatterns.some(p => lower.includes(p));
  if (hasChaos) {
    return {
  type: "next_step",
  confidence: 1,
  reason: "Pytanie o następny krok"
};
  }

  const hasMission = missionPatterns.some(p => lower.includes(p));
  if (hasMission) {
    return {
      type: "task",
      confidence: 0.75,
      reason: "Wykryto zadanie lub cel"
    };
  }

  if (text.endsWith("?")) {
  return {
    type: "question",
    confidence: 0.4,
    reason: "Wykryto pytanie (fallback)"
  };
}

  return {
    type: "conversation",
    confidence: 0.6,
    reason: "Domyślnie zwykła rozmowa"
  };
}