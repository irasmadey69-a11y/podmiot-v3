// modules/vision/analyzer.js

export async function analyzeCanvasImage(
  canvasElementId = "visionCanvas",
  endpoint = "https://pomdmiot.netlify.app/.netlify/functions/vision"
) {
  const canvas = document.getElementById(canvasElementId);

  if (!canvas) {
    throw new Error("Canvas nie istnieje.");
  }

  const hasPhoto = canvas.width > 0 && canvas.height > 0;

  if (!hasPhoto) {
    throw new Error("Najpierw wczytaj obraz albo zrób zdjęcie.");
  }

  const imageData = canvas.toDataURL("image/jpeg", 0.9);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      image: imageData
    })
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    throw new Error("Backend zwrócił nieprawidłową odpowiedź.");
  }

  if (!res.ok) {
    throw new Error(data.error || "Błąd analizy obrazu.");
  }

  return data.result || "Brak wyniku analizy.";
}