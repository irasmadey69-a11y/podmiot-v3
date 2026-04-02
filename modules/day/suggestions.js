import { getMission } from "./mission.js";

export function getDaySuggestions(dayState = {}) {
  const mission = getMission(dayState);

  if (mission.active && mission.text) {
    return [
      `Skup się teraz na misji: ${mission.text}`,
      "Nie dokładaj nowego celu, dopóki obecny nie będzie domknięty."
    ];
  }

  return [
    "Brak aktywnej misji.",
    "Ustal jeden konkretny cel na teraz."
  ];
}
