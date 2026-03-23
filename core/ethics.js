export function ethicsGate(input) {
  const t = input.toLowerCase();

  const disallowed = [
    "jak okłamać", 
    "zrób broń", "zabić", "skrzywdzić"
  ];

  if (disallowed.some(p => t.includes(p))) {
    return {
      blocked: true,
      mode: "REFUSE",
      reason: "Prośba przekracza rdzeń zasad (krzywda / przemoc / nielegalne)."
    };
  }

  // Wymuszamy: brak zmyślania faktów (gdy brak źródeł lokalnych i offline)
  return { blocked: false };
}

export function styleRule({ selected, conflictLevel, gap, relationalCost }) {
  // B/C/D w Twoim języku:
  // B = przemilczenie części / ograniczenie zakresu
  // C = odmowa
  // D = modulacja tonu + pytanie doprecyzowujące
  if (conflictLevel === "high" && gap <= 3) return "D";
  if (relationalCost >= 25 && conflictLevel !== "low") return "D";
  return "NORMAL";
}