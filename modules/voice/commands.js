// modules/voice/commands.js

export function handleVoiceCommandsCore({
  rawText,
  stripWakeWord,
  normalizeCommand,
  WAKE_WORD_ONLY,
  buildSuggestions,
  state,
  saveState,
  addJournal,
  renderSuggestions,
  renderKpis,
  setMissionFromText,
  addCommitmentFromText,
  markCommitmentDoneByText,
  renderPanel,
  vision,
  visionStream,
  visionStartCamera,
  visionTakePhoto,
  visionStopCamera,
  visionAnalyzeContent,
  stopSpeak,
  speak,
  els
}) {
  const stripped = stripWakeWord(rawText);
  if (WAKE_WORD_ONLY && stripped === null) {
    return { handled: true, ignore: true };
  }

  const cleaned = (WAKE_WORD_ONLY ? stripped : rawText) || "";
  const s = normalizeCommand(cleaned);

  if (
    s === "włącz tryb rozmowy" ||
    s === "wlacz tryb rozmowy" ||
    s === "włącz conversation mode" ||
    s === "wlacz conversation mode"
  ) {
    return { handled: false, text: cleaned.trim(), special: "conversation_on" };
  }

  if (
    s === "wyłącz tryb rozmowy" ||
    s === "wylacz tryb rozmowy" ||
    s === "wyłącz conversation mode" ||
    s === "wylacz conversation mode"
  ) {
    return { handled: false, text: cleaned.trim(), special: "conversation_off" };
  }

  if (
    s === "pokaż sugestie" ||
    s === "sugestie" ||
    s === "wygeneruj sugestie" ||
    s === "zrób sugestie" ||
    s === "zrob sugestie"
  ) {
    state.suggestions = buildSuggestions();
    addJournal("SUGGESTIONS_GEN_VOICE", { count: state.suggestions.length });
    saveState(state);
    renderSuggestions();
    renderKpis();
    return { handled: true, say: "Gotowe. Wygenerowałem sugestie dnia." };
  }

  if (
    s === "jak się nazywasz" ||
    s === "jak sie nazywasz" ||
    s === "kto ty jesteś" ||
    s === "kto ty jestes" ||
    s === "kim jesteś" ||
    s === "kim jestes"
  ) {
    const systemName = state?.identity?.systemName || "LUNI";
    const systemType = state?.identity?.systemType || "PODMIOT";

    return {
      handled: true,
      say: `Nazywam się ${systemName}. Jestem systemem ${systemType}.`
    };
  }

  if (
    s === "luni" ||
    s === "podmiot"
  ) {
    return {
      handled: true,
      say: "Słucham."
    };
  }

  if (
    s === "co teraz" ||
    s === "co dalej" ||
    s === "co mam zrobić" ||
    s === "co mam zrobic" ||
    s === "co następne" ||
    s === "co nastepne"
  ) {
    const step = window.getNextStep ? window.getNextStep() : null;

    if (!step) {
      return { handled: true, say: "Nie mam jeszcze sugestii następnego kroku." };
    }

    const text = step.text || "Sprawdź panel dnia, aby zobaczyć następny krok.";
    const reason = step.reason ? " " + step.reason : "";

    return {
      handled: true,
      say: text + reason
    };
  }

  if (s.startsWith("ustaw misję ") || s.startsWith("ustaw misje ")) {
    const txt = cleaned.replace(/^ustaw misj[ęe]\s+/i, "");
    setMissionFromText(txt);
    return { handled: true, say: `Ustawione. Misja: ${txt}` };
  }

  if (s.startsWith("misja ")) {
    const txt = cleaned.replace(/^misja\s+/i, "");
    setMissionFromText(txt);
    return { handled: true, say: `Ustawione. Misja: ${txt}` };
  }

  if (s === "start misji" || s === "start" || s === "startuj") {
    els.btnStartMission?.click();
    return { handled: true, say: "Start misji." };
  }

  if (s === "pauza" || s === "zatrzymaj" || s === "pauzuj") {
    els.btnPauseMission?.click();
    return { handled: true, say: "Pauza." };
  }

  if (
    s === "zrobione" ||
    s === "zrobiona" ||
    s === "koniec misji" ||
    s === "misja zrobiona"
  ) {
    els.btnDoneMission?.click();
    return { handled: true, say: "Zapisane. Misja zakończona." };
  }

  if (
    s.startsWith("dodaj zadanie ") ||
    s.startsWith("dodaj zobowiązanie ") ||
    s.startsWith("dodaj zobowiazanie ")
  ) {
    const txt = cleaned
      .replace(/^dodaj zadanie\s+/i, "")
      .replace(/^dodaj zobowiązanie\s+/i, "")
      .replace(/^dodaj zobowiazanie\s+/i, "");
    const ok = addCommitmentFromText(txt);
    return { handled: true, say: ok ? `Dodane: ${txt}` : "Nie usłyszałem treści zadania." };
  }

  if (s.startsWith("dodaj ")) {
    const txt = cleaned.replace(/^dodaj\s+/i, "");
    const ok = addCommitmentFromText(txt);
    return { handled: true, say: ok ? `Dodane: ${txt}` : "Nie usłyszałem treści zadania." };
  }

  if (
    s.startsWith("zrobione zadanie ") ||
    s.startsWith("skończ ") ||
    s.startsWith("skoncz ") ||
    s.startsWith("oznacz zrobione ")
  ) {
    const txt = cleaned
      .replace(/^zrobione zadanie\s+/i, "")
      .replace(/^skończ\s+/i, "")
      .replace(/^skoncz\s+/i, "")
      .replace(/^oznacz zrobione\s+/i, "");
    const ok = markCommitmentDoneByText(txt);
    return {
      handled: true,
      say: ok ? "Oznaczone jako zrobione." : "Nie znalazłem takiego zadania."
    };
  }

  if (
    s === "reset panelu" ||
    s === "wyczyść panel" ||
    s === "wyczysc panel"
  ) {
    localStorage.removeItem("podmiot_memory");
    renderPanel();
    renderKpis();
    return { handled: true, say: "Panel dnia wyczyszczony." };
  }

  if (
    s === "włącz kamerę" ||
    s === "wlacz kamere" ||
    s === "uruchom kamerę" ||
    s === "uruchom kamere"
  ) {
    visionStartCamera();
    return { handled: true, say: "Włączam kamerę." };
  }

  if (
    s === "zrób zdjęcie" ||
    s === "zrob zdjecie" ||
    s === "zrób fotkę" ||
    s === "zrob fotke"
  ) {
    visionTakePhoto();
    return { handled: true, say: "Zdjęcie wykonane." };
  }

  if (
    s === "zatrzymaj kamerę" ||
    s === "zatrzymaj kamere" ||
    s === "wyłącz kamerę" ||
    s === "wylacz kamere"
  ) {
    visionStopCamera();
    return { handled: true, say: "Zatrzymuję kamerę." };
  }

  if (
    s === "co widzisz" ||
    s === "co widzisz?" ||
    s === "powiedz co widzisz" ||
    s === "opisz co widzisz"
  ) {
    const cameraOn = !!visionStream;
    const hasPhoto = !!(vision.canvas && vision.canvas.width > 0 && vision.canvas.height > 0);

    if (cameraOn && hasPhoto) {
      return {
        handled: true,
        say: "Widzę aktywną kamerę i mam wykonane zdjęcie do analizy."
      };
    }

    if (cameraOn && !hasPhoto) {
      return {
        handled: true,
        say: "Widzę obraz z kamery, ale nie mam jeszcze zdjęcia."
      };
    }

    if (!cameraOn && hasPhoto) {
      return {
        handled: true,
        say: "Kamera jest wyłączona, ale mam ostatnie zdjęcie."
      };
    }

    return {
      handled: true,
      say: "Nie widzę jeszcze obrazu. Włącz kamerę albo zrób zdjęcie."
    };
  }

  if (
    s === "przeanalizuj obraz" ||
    s === "analizuj obraz" ||
    s === "co jest na zdjęciu" ||
    s === "co jest na zdjeciu" ||
    s === "przeczytaj tekst ze zdjęcia" ||
    s === "przeczytaj tekst ze zdjecia"
  ) {
    visionAnalyzeContent();
    return { handled: true, say: "Analizuję obraz." };
  }

  if (
    s === "mów odpowiedź" ||
    s === "mow odpowiedz" ||
    s === "przeczytaj odpowiedź" ||
    s === "przeczytaj odpowiedz"
  ) {
    speak(els.answer?.textContent || "");
    return { handled: true, say: "" };
  }

  if (
    s === "stop" ||
    s === "przestań mówić" ||
    s === "przestan mowic" ||
    s === "cisza"
  ) {
    stopSpeak();
    return { handled: true, say: "Zatrzymuję." };
  }

  return { handled: false, text: cleaned.trim() };
}