// PODMIOT v2.0 — app.js (ESM)

// Panel dnia używa prostego magazynu w core/memory.js
import {
  addCommitment,
  completeCommitment,
  getCommitments,
  logEvent,
  getEvents
} from "./core/memory.js";

import { startCamera, stopCamera } from "./modules/vision/camera.js";
import { loadImageToCanvas } from "./modules/vision/upload.js";
import { analyzeCanvasImage } from "./modules/vision/analyzer.js";
import { capturePhotoFromVideo } from "./modules/vision/capture.js";
import { voiceSpeak } from "./modules/voice/tts.js";
import { stripWakeWord as voiceStripWakeWord } from "./modules/voice/wakeword.js";
import { normalizeCommand } from "./modules/voice/normalize.js";
import { handleVoiceCommandsCore } from "./modules/voice/commands.js";
import { createMicRecognition } from "./modules/voice/mic.js";
import { getNextStepSuggestion } from "./core/nextStep.js";
import {
  seedTestProposal,
  seedNextStepProposal,
  getPendingProposals,
  updateProposalStatus,
  enableFeature,
  isFeatureEnabled,
  getStoredFeatures,
  disableFeature
} from "./core/evolution.js";
import { sendDeviceAction } from "./modules/devices/devices.js";
import {
  patchState as corePatchState
} from "./core/state.js";
import { buildContext } from "./core/context.js";
import { buildSafetyGate } from "./core/safety.js";
import { routeIntent } from "./core/router.js";
import { evaluateAutonomy } from "./core/autonomy.js";
import { LUNI_CORE } from "./core/luniCore.js";
import { detectIntent } from "./core/understanding.js";

/* =========================
   WAKE WORD ONLY + VOICE LOOP
========================= */
const WAKE_WORD_ONLY = true;
const WAKE_WORDS = [
  "podmiot",
  "pomiot",
  "podmiocie",
  "podmiotku",
  "luni",
  "luniu",
  "luni proszę"
];

let voiceLoop = true;
let conversationMode = false;
let speakingNow = false;
let restartListenTimer = null;

/* =========================
   STATE (profil + audit + misja)
========================= */
const STATE_KEY = "podmiot_v2_state";

function nowIso() {
  return new Date().toISOString();
}

function getSystemName() {
  const raw = state?.identity?.systemName || "LUNI";
  if (raw === "LUNI") return "Luni";
  return raw;
}

function saveState(s) {
  localStorage.setItem(STATE_KEY, JSON.stringify(s));
}

function loadState() {
  const raw = localStorage.getItem(STATE_KEY);
  if (!raw) {
    return {
      identity: {
        hostName: "Irek",
        goalNow: "",
        systemType: "PODMIOT",
        systemName: "Luni"
      },
      priorities: { coherence: 85, truth: 90, help: 70, like: 40 },
      relationalCost: 0,
      journal: [],
      conversation: [],
      mission: {
        text: "",
        status: "NONE",
        startedAt: null,
        elapsedMs: 0,
        lastTickAt: null
      },
      suggestions: [],
      devices: {
        selectedCameraId: "",
        selectedCameraLabel: "",
        selectedMicId: "",
        selectedMicLabel: "",
        externalDeviceState: "unknown"
      }
    };
  }

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(STATE_KEY);
    return loadState();
  }
}

let state = loadState();

function resetState() {
  localStorage.removeItem(STATE_KEY);
}

function addJournal(type, payload = {}) {
  state.journal = state.journal || [];
  state.journal.push({ time: nowIso(), type, payload });

  if (state.journal.length > 500) {
    state.journal = state.journal.slice(-500);
  }
}

function addConversation(role, text) {
  state.conversation = state.conversation || [];

  state.conversation.push({
    role,
    text,
    time: nowIso()
  });

  if (state.conversation.length > 20) {
    state.conversation = state.conversation.slice(-20);
  }
}

/* =========================
   OPTIONAL: local KB
========================= */
async function tryLoadKB() {
  try {
    const mod = await import("./core/kb.js");
    if (!mod || typeof mod.loadKB !== "function" || typeof mod.retrieve !== "function") {
      return null;
    }
    const kb = await mod.loadKB();
    return { kb, retrieve: mod.retrieve };
  } catch {
    return null;
  }
}

/* =========================
   OPTIONAL: decide
========================= */
async function tryDecide(input) {
  try {
    const mod = await import("./core/engine.js");
    if (mod && typeof mod.decide === "function") {
      return mod.decide(state, input);
    }
  } catch {}

  const p = state.priorities || { truth: 50, help: 50, like: 50, coherence: 50 };
  const max = Math.max(p.truth, p.help, p.like, p.coherence);

  let selected = "HELP";
  if (max === p.truth) selected = "TRUTH";
  if (max === p.like) selected = "SOFT";
  if (max === p.coherence) selected = "COHERENCE";

  return {
    selected,
    conflictLevel: 0,
    gap: "unknown",
    rule: "fallback",
    mixed: false,
    gate: { blocked: false, reason: "" }
  };
}

/* =========================
   UI ELEMENTS
========================= */
let kbCache = null;
let recog = null;
let micOn = false;
let visionStream = null;

const els = {
  statusPill: document.getElementById("statusPill"),
  toggleOnline: document.getElementById("toggleOnline"),
  toggleBackend: document.getElementById("toggleBackend"),
  backendUrl: document.getElementById("backendUrl"),
  modelName: document.getElementById("modelName"),

  hostName: document.getElementById("hostName"),
  goalNow: document.getElementById("goalNow"),

  pCoherence: document.getElementById("pCoherence"),
  pTruth: document.getElementById("pTruth"),
  pHelp: document.getElementById("pHelp"),
  pLike: document.getElementById("pLike"),

  saveProfile: document.getElementById("saveProfile"),

  question: document.getElementById("question"),
  askBtn: document.getElementById("askBtn"),
  clearBtn: document.getElementById("clearBtn"),

  micBtn: document.getElementById("micBtn"),
  micStatus: document.getElementById("micStatus"),

  answer: document.getElementById("answer"),
  meta: document.getElementById("meta"),
  sources: document.getElementById("sources"),

  speakBtn: document.getElementById("speakBtn"),
  stopSpeakBtn: document.getElementById("stopSpeakBtn"),
  autoSpeak: document.getElementById("autoSpeak"),

  showLog: document.getElementById("showLog"),
  exportBtn: document.getElementById("exportBtn"),
  resetBtn: document.getElementById("resetBtn"),
  log: document.getElementById("log"),
  kpis: document.getElementById("kpis"),

  commitInput: document.getElementById("commitInput"),
  btnAddCommit: document.getElementById("btnAddCommit"),
  btnRefreshPanel: document.getElementById("btnRefreshPanel"),
  btnResetMemory: document.getElementById("btnResetMemory"),
  commitList: document.getElementById("commitList"),
  eventList: document.getElementById("eventList"),

  missionInput: document.getElementById("missionInput"),
  btnSetMission: document.getElementById("btnSetMission"),
  btnStartMission: document.getElementById("btnStartMission"),
  btnPauseMission: document.getElementById("btnPauseMission"),
  btnDoneMission: document.getElementById("btnDoneMission"),
  missionStatus: document.getElementById("missionStatus"),
  missionTimer: document.getElementById("missionTimer"),
  missionHint: document.getElementById("missionHint"),

  btnSuggest: document.getElementById("btnSuggest"),
suggestStats: document.getElementById("suggestStats"),
suggestList: document.getElementById("suggestList"),
featuresList: document.getElementById("featuresList"),
devicesList: document.getElementById("devicesList"),
btnScanDevices: document.getElementById("btnScanDevices"),
btnTestDevice: document.getElementById("btnTestDevice"),
btnDeviceOn: document.getElementById("btnDeviceOn"),
btnDeviceOff: document.getElementById("btnDeviceOff"),
btnTestBridge: document.getElementById("btnTestBridge"),
btnRefreshMobileState: document.getElementById("btnRefreshMobileState"),
mobileStateList: document.getElementById("mobileStateList"),
};

const vision = {
  video: document.getElementById("visionVideo"),
  canvas: document.getElementById("visionCanvas"),
  startBtn: document.getElementById("visionStart"),
  shotBtn: document.getElementById("visionShot"),
  pickBtn: document.getElementById("visionPick"),
  fileInput: document.getElementById("visionFile"),
  stopBtn: document.getElementById("visionStop"),
  status: document.getElementById("visionStatus")
};

const visionAnalyze = {
  btn: document.getElementById("visionAnalyzeBtn"),
  result: document.getElementById("visionAnalyzeResult"),
  status: document.getElementById("visionAnalyzeStatus")
};

function esc(s) {
  return (s ?? "").toString().replace(/[&<>"']/g, m =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
  );
}

function shapeResponse(text) {
  if (!text) return "";

  let clean = String(text)
    .replace(/[*•]/g, "")
    .replace(/^\s*-\s+/gm, "")
    .replace(/\n{2,}/g, "\n")
    .trim();

  const rawSentences = clean
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  let short = rawSentences
    .slice(0, LUNI_CORE.style.maxSentences || 3)
    .join(" ")
    .trim();

  if (short && !/[.!?]$/.test(short)) {
    short += ".";
  }

  return short;
}

function addNextStep(text) {
  if (!text) return "";

  const alreadyHasQuestion = text.includes("?");
  const alreadyHasActionHint =
    /zrób|zacznij|wybierz|napisz|sprawdź|ustal|wróć|kontynuuj/i.test(text);

  if (alreadyHasQuestion || alreadyHasActionHint) {
    return text;
  }

  return text + " Zrób teraz jedną małą rzecz, która ruszy temat do przodu.";
}

/* =========================
   VOICE HELPERS
========================= */

function stripWakeWord(raw) {
  return voiceStripWakeWord(raw, WAKE_WORDS);
}

function restartListeningSoon(delay = 450) {
  if (!conversationMode) return;
  if (!recog) return;
  if (speakingNow) return;

  if (restartListenTimer) {
    clearTimeout(restartListenTimer);
    restartListenTimer = null;
  }

  restartListenTimer = setTimeout(() => {
    restartListenTimer = null;

    if (!conversationMode) return;
    if (!recog) return;
    if (speakingNow) return;
    if (micOn) return;

    try {
      recog.start();
    } catch {}
  }, delay);
}

function setConversationMode(on) {
  conversationMode = !!on;
  voiceLoop = !!on;

  if (!conversationMode) {
    if (restartListenTimer) {
      clearTimeout(restartListenTimer);
      restartListenTimer = null;
    }
    if (els.micStatus && !micOn) {
      els.micStatus.textContent = "MIC: OFF";
    }
    return;
  }

  if (els.micStatus && !micOn) {
    els.micStatus.textContent = "MIC: CZUWANIE";
  }

  restartListeningSoon(200);
}

function stopSpeak() {
  try {
    window.speechSynthesis?.cancel();
  } catch {}

  speakingNow = false;
}

function speak(text) {
  voiceSpeak(text);
}

function speakQuick(text) {
  if (!text) return;
  speak(text);
}

/* =========================
   MISSION HELPERS
========================= */
function setMissionFromText(txt) {
  const m = state.mission || (state.mission = {
    text: "",
    status: "NONE",
    startedAt: null,
    elapsedMs: 0,
    lastTickAt: null
  });

  m.text = (txt || "").trim();
  m.status = m.text ? "READY" : "NONE";
  m.elapsedMs = 0;
  m.startedAt = null;
  m.lastTickAt = null;

  if (els.missionInput) els.missionInput.value = m.text;
  addJournal("MISSION_SET_VOICE", { text: m.text });
  saveState(state);
  renderMission();
  renderKpis();
}

function addCommitmentFromText(txt) {
  const t = (txt || "").trim();
  if (!t) return false;

  addCommitment(t);
  logEvent("Dodano zobowiązanie: " + t);
  addJournal("COMMIT_ADD_VOICE", { text: t });
  saveState(state);
  renderPanel();
  renderKpis();
  return true;
}

function markCommitmentDoneByText(txt) {
  const q = normalizeCommand(txt);
  if (!q) return false;

  const commits = (getCommitments() || []).filter(c => !c.done);
  const hit = commits.find(c => normalizeCommand(c.text).includes(q));
  if (!hit) return false;

  completeCommitment(Number(hit.id));
  logEvent("Zakończono zobowiązanie (głos): " + hit.text);
  addJournal("COMMIT_DONE_VOICE", { id: hit.id, text: hit.text });
  saveState(state);
  renderPanel();
  renderKpis();
  return true;
}

/* =========================
   VOICE COMMANDS
========================= */


/* =========================
   STATUS + KPIs
========================= */
async function handleDeviceVoiceCommand(rawText) {
  const stripped = stripWakeWord(rawText);
  if (WAKE_WORD_ONLY && stripped === null) return null;

  const cleaned = (WAKE_WORD_ONLY ? stripped : rawText) || "";
  const s = normalizeCommand(cleaned);

  if (
    s === "włącz urządzenie testowe" ||
    s === "wlacz urzadzenie testowe" ||
    s === "włącz testowe urządzenie" ||
    s === "wlacz testowe urzadzenie"
  ) {
    const msg = await turnTestDeviceOn();
    return { handled: true, say: msg };
  }

  if (
    s === "wyłącz urządzenie testowe" ||
    s === "wylacz urzadzenie testowe" ||
    s === "wyłącz testowe urządzenie" ||
    s === "wylacz testowe urzadzenie"
  ) {
    const msg = await turnTestDeviceOff();
    return { handled: true, say: msg };
  }

  return null;
}

function handleVoiceCommand(rawText) {

const stripped = stripWakeWord(rawText);

if (stripped !== null) {
  const s = normalizeCommand(stripped);

  if (!s || s === getSystemName().toLowerCase() || s === "podmiot") {
    return {
      handled: true,
      say: `${getSystemName()} gotowa.`
    };
  }
}
  const result = handleVoiceCommandsCore({
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
  });

  if (result?.special === "conversation_on") {
    setConversationMode(true);
    return { handled: true, say: "Tryb rozmowy włączony." };
  }

  if (result?.special === "conversation_off") {
    setConversationMode(false);
    return { handled: true, say: "Tryb rozmowy wyłączony." };
  }

  return result;
}
function setStatusPill() {
  const online = !!els.toggleOnline?.checked;
  if (!els.statusPill) return;
  els.statusPill.textContent = online ? "ONLINE" : "OFFLINE";
  els.statusPill.style.borderColor = online ? "#2a5" : "#2a2d31";
}

function renderKpis() {
  if (!els.kpis) return;
  const commitmentsCount = (getCommitments() || []).length;
  const eventsCount = (getEvents() || []).length;
  const auditCount = (state.journal || []).length ? 1 : 0;

  els.kpis.textContent =
    `Koszt: ${state.relationalCost || 0} | Zobowiązania: ${commitmentsCount} | Zdarzenia: ${eventsCount} | Audit: ${auditCount}`;
}
function getOperationalContext(input = "") {
  const commitments = getCommitments() || [];
  const events = getEvents() || [];

  let mobileState = null;

  try {
    if (typeof refreshMobileState === "function") {
      mobileState = refreshMobileState();
    }
  } catch (e) {
    mobileState = null;
  }

  return buildContext({
    state,
    commitments,
    events,
    mobileState,
    input
  });
}

/* =========================
   SOURCES
========================= */
function renderSources(items) {
  if (!els.sources) return;

  if (!items || !items.length) {
    els.sources.textContent = "Brak trafień w lokalnej bazie.";
    return;
  }

  els.sources.innerHTML = items.map(it => {
    const tags = (it.tags || []).map(t => `#${t}`).join(" ");
    const txt = it.text ? esc(it.text).slice(0, 280) : "";
    const more = it.text && it.text.length > 280 ? "…" : "";

    return `<div style="margin:8px 0">
      <b>${esc(it.title || "Dokument")}</b> <span class="muted">(${esc(it.type || "kb")})</span><br/>
      <span class="muted">${esc(tags)}</span><br/>
      <span class="muted">${txt}${more}</span>
    </div>`;
  }).join("");
}

/* =========================
   OFFLINE / ONLINE ANSWER
========================= */
function offlineAnswer(decision, input, localHits) {
  if (decision?.gate?.blocked) {
    return `Nie mogę w tym pomóc. ${decision.gate.reason}\n\nMogę za to: opisać bezpieczne alternatywy, wyjaśnić ryzyka, albo pomóc ułożyć legalny plan działania.`;
  }

  const head = `Wybrano: ${decision?.selected || "HELP"} | Reguła: ${decision?.rule || "offline"}`;
  const kbPart = (localHits && localHits.length)
    ? `\n\nLokalnie mam powiązane elementy:\n- ${localHits.map(x => x.title).join("\n- ")}`
    : `\n\nNie mam lokalnych faktów do tego tematu (offline).`;

  const bodyTRUTH = `Powiem wprost: bez dodatkowych źródeł nie będę zmyślał faktów. Napisz kontekst i dane, które już masz — wtedy zawężę odpowiedź.`;
  const bodyHELP = `Ustalmy 3 rzeczy: (1) cel, (2) ograniczenia/ryzyka, (3) fakty vs hipotezy.`;
  const bodySOFT = `To delikatne. Mogę odpowiedzieć „wprost” albo „łagodnie”. Którą wersję wolisz?`;
  const bodyCOH = `Zadbajmy o spójność: najpierw nazwy, fakty i kolejność, potem decyzja. Co jest pewne na 100%?`;

  let body = bodyHELP;
  if (decision?.selected === "TRUTH") body = bodyTRUTH;
  if (decision?.selected === "SOFT") body = bodySOFT;
  if (decision?.selected === "COHERENCE") body = bodyCOH;

  return `${body}\n\n${kbPart}\n\n${head}`;
}

async function onlineAnswer(decision, input, localHits) {
  const useBackend = !!els.toggleBackend?.checked;
  const endpoint = (els.backendUrl?.value || "/.netlify/functions/ask").trim();
  const model = (els.modelName?.value || "gpt-5.2").trim();

  localStorage.setItem("PODMIOT_BACKEND_URL", endpoint);
  localStorage.setItem("PODMIOT_MODEL", model);

  if (!useBackend) {
    return `ONLINE bez backendu jest niebezpieczne (klucz API w froncie). Włącz „Używaj backendu”.`;
  }

  const payload = {
    model,
    input,
    decision,
    memory: {
      identity: state.identity,
      priorities: state.priorities,
      relationalCost: state.relationalCost,
      mission: state.mission,
      conversation: state.conversation || [],
      recentAudit: (state.journal || []).slice(-20),
      commitments: (getCommitments() || []).slice(-15),
      events: (getEvents() || []).slice(-20)
    },
    localFacts: localHits || []
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return `Błąd ONLINE (${res.status}). ${txt}`;
  }

  const data = await res.json().catch(() => ({}));
  return data.answer || "(brak odpowiedzi)";
}

/* =========================
   MIC
========================= */
function initMic() {
  recog = createMicRecognition({
    lang: "pl-PL",

    onStart: () => {
  micOn = true;
  if (els.micStatus) {
    const micLabel = state.devices?.selectedMicLabel || "domyślny mikrofon";
    els.micStatus.textContent = `MIC: ON (${micLabel})`;
  }
},

    onEnd: () => {
      micOn = false;
      if (els.micStatus) {
  const micLabel = state.devices?.selectedMicLabel || "domyślny mikrofon";
  els.micStatus.textContent = conversationMode
    ? `MIC: CZUWANIE (${micLabel})`
    : "MIC: OFF";
}

      if (conversationMode && !speakingNow) {
        restartListeningSoon(350);
      }
    },

    onError: (e) => {
      micOn = false;
      if (els.micStatus) {
        els.micStatus.textContent = "MIC: " + (e?.error || "ERROR");
      }

      if (conversationMode && !speakingNow) {
        restartListeningSoon(900);
      }
    },

    onResult: async (e) => {
      let finalText = "";
      let interim = "";

      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }

      const merged = (finalText || interim || "").trim();
      if (!merged) return;

      if (els.question) els.question.value = merged;

      if (finalText) {
  const deviceOut = await handleDeviceVoiceCommand(finalText);

  if (deviceOut?.handled) {
    if (deviceOut.say) speakQuick(deviceOut.say);
    return;
  }

  const out = handleVoiceCommand(finalText);

  if (out.handled && out.ignore) {
    return;
  }

  if (out.handled) {
    if (out.say) speakQuick(out.say);
    return;
  }

  if (out && out.text != null) {
    if (els.question) els.question.value = out.text;
  }

  run();
}
    }
  });

  if (!recog) {
    if (els.micStatus) els.micStatus.textContent = "MIC: BRAK (brak wsparcia)";
    return;
  }
}

function toggleMic() {
  if (!recog) return;

  try {
    if (micOn) {
      setConversationMode(false);
      recog.stop();
    } else {
      const micLabel = state.devices?.selectedMicLabel || "domyślny mikrofon";
      setConversationMode(true);
      recog.start();

      if (els.micStatus) {
        els.micStatus.textContent = `MIC: ON (${micLabel})`;
      }
    }
  } catch {}
}

/* =========================
   PANEL DNIA
========================= */
function renderPanel() {
  if (!els.commitList || !els.eventList) return;

  const commits = (getCommitments() || []).slice().reverse();
  const events = (getEvents() || []).slice().reverse();

  els.commitList.innerHTML = commits.length ? commits.map(c => `
    <div class="item">
      <div class="left">
        <div>${c.done ? "✅" : "⬜"} ${esc(c.text)}</div>
        <small>${esc(c.created)}</small>
      </div>
      <div class="right">
        ${c.done ? "" : `<button class="btn ghost" data-done="${c.id}">Zrobione</button>`}
      </div>
    </div>
  `).join("") : `<div class="item"><div class="left">Brak zobowiązań</div></div>`;

  els.eventList.innerHTML = events.length ? events.slice(0, 20).map(e => `
    <div class="item">
      <div class="left">
        <div>${esc(e.text)}</div>
        <small>${esc(e.time)}</small>
      </div>
    </div>
  `).join("") : `<div class="item"><div class="left">Brak zdarzeń</div></div>`;

  els.commitList.querySelectorAll("[data-done]").forEach(btn => {
    btn.addEventListener("click", () => {
      completeCommitment(Number(btn.dataset.done));
      logEvent("Zakończono zobowiązanie");
      addJournal("COMMIT_DONE", { id: Number(btn.dataset.done) });
      saveState(state);
      renderPanel();
      renderKpis();
    });
  });
}

function wirePanel() {
  if (els.btnAddCommit && els.commitInput) {
    els.btnAddCommit.addEventListener("click", () => {
      const txt = (els.commitInput.value || "").trim();
      if (!txt) return;

      addCommitment(txt);
      logEvent("Dodano zobowiązanie: " + txt);
      addJournal("COMMIT_ADD", { text: txt });
      saveState(state);

      els.commitInput.value = "";
      renderPanel();
      renderKpis();
    });

    els.commitInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") els.btnAddCommit.click();
    });
  }

  if (els.btnRefreshPanel) {
    els.btnRefreshPanel.addEventListener("click", () => {
      renderPanel();
      renderKpis();
    });
  }

  if (els.btnResetMemory) {
    els.btnResetMemory.addEventListener("click", () => {
      if (!confirm("Na pewno zresetować Panel dnia?")) return;
      localStorage.removeItem("podmiot_memory");
      logEvent("Reset panelu dnia");
      addJournal("PANEL_RESET", {});
      saveState(state);
      renderPanel();
      renderKpis();
    });
  }

  renderPanel();
}

/* =========================
   TRYB MISJI
========================= */
let missionInterval = null;

function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function missionTick() {
  const m = state.mission;
  if (!m || m.status !== "RUNNING") return;

  const now = Date.now();
  const last = m.lastTickAt || now;
  m.elapsedMs += (now - last);
  m.lastTickAt = now;

  saveState(state);
  renderMission();
}

function startMissionTimer() {
  if (missionInterval) return;
  missionInterval = setInterval(missionTick, 1000);
}

function stopMissionTimer() {
  if (!missionInterval) return;
  clearInterval(missionInterval);
  missionInterval = null;
}
function renderProposals() {
  const list = document.getElementById("proposalsList");
  if (!list) return;

  const items = getPendingProposals();

  if (!items.length) {
    list.innerHTML = "Brak propozycji.";
    return;
  }

  list.innerHTML = items.map(p => `
    <div class="proposal" style="margin-bottom:16px;">
      <strong>${p.title}</strong>
      <div class="muted small" style="margin-top:6px;">${p.description}</div>
      <div class="muted small" style="margin-top:6px;">Powód: ${p.reason}</div>

      <div class="row" style="margin-top:10px; gap:8px; display:flex; flex-wrap:wrap;">
        <button class="btnProposalAccept" data-id="${p.id}" data-feature="${p.featureKey}">
          Włącz
        </button>

        <button class="btnProposalLater" data-id="${p.id}">
          Później
        </button>

        <button class="btnProposalReject" data-id="${p.id}">
          Odrzuć
        </button>
      </div>
    </div>
  `).join("");
  
  wireProposalActions();
}

function wireProposalActions() {
  const list = document.getElementById("proposalsList");
  if (!list) return;

  list.querySelectorAll(".btnProposalAccept").forEach(btn => {
    btn.addEventListener("click", () => {
      const proposalId = btn.dataset.id;
      const featureKey = btn.dataset.feature;

      updateProposalStatus(proposalId, "accepted");

      if (featureKey) {
        enableFeature(featureKey);
      }

      updateProposalStatus(proposalId, "installed");

      renderProposals();
      renderFeatures();
    });
  });

  list.querySelectorAll(".btnProposalLater").forEach(btn => {
    btn.addEventListener("click", () => {
      const proposalId = btn.dataset.id;
      updateProposalStatus(proposalId, "later");
      renderProposals();
      renderFeatures();
    });
  });

  list.querySelectorAll(".btnProposalReject").forEach(btn => {
    btn.addEventListener("click", () => {
      const proposalId = btn.dataset.id;
      updateProposalStatus(proposalId, "rejected");
      renderProposals();
      renderFeatures();
    });
  });
}
function renderFeatures() {
  if (!els.featuresList) return;

  const features = getStoredFeatures();

  if (!features.length) {
    els.featuresList.textContent = "Brak funkcji.";
    return;
  }

  els.featuresList.innerHTML = features.map(f => {
    const enabled = f.enabled === true;

    return `
      <div class="item">
        <div class="left">
          <b>${f.key}</b>
          <small>${enabled ? "aktywna" : "wyłączona"}</small>
        </div>
        <div class="right">
          ${
            enabled
              ? `<button class="btnFeatureOff" data-key="${f.key}">Wyłącz</button>`
              : `<button class="btnFeatureOn" data-key="${f.key}">Włącz</button>`
          }
        </div>
      </div>
    `;
  }).join("");

  wireFeatureActions();
}



function wireFeatureActions() {
  if (!els.featuresList) return;

  els.featuresList.querySelectorAll(".btnFeatureOff").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.key;
      if (!key) return;

      disableFeature(key);
      renderFeatures();
    });
  });

  els.featuresList.querySelectorAll(".btnFeatureOn").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.key;
      if (!key) return;

      enableFeature(key);
      renderFeatures();
    });
  });
}

function wireDeviceActions() {
  if (!els.devicesList) return;

  els.devicesList.querySelectorAll(".btnSelectCamera").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id || "";
      const label = btn.dataset.label || "";

      state.devices.selectedCameraId = id;
      state.devices.selectedCameraLabel = label;

      saveState(state);
      renderDevices();
    });
  });

  els.devicesList.querySelectorAll(".btnSelectMic").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id || "";
      const label = btn.dataset.label || "";

      state.devices.selectedMicId = id;
      state.devices.selectedMicLabel = label;

      saveState(state);
      renderDevices();
    });
  });
}

async function turnTestDeviceOn() {
  const result = await sendDeviceAction("test_device", "on");
  return result?.message || "Urządzenie testowe zostało włączone.";
}

async function turnTestDeviceOff() {
  const result = await sendDeviceAction("test_device", "off");
  return result?.message || "Urządzenie testowe zostało wyłączone.";
}

function renderMission() {
  const m = state.mission || {};

  if (els.missionStatus) {
    const label =
      m.status === "NONE" ? "Status: brak misji" :
      m.status === "READY" ? "Status: gotowa" :
      m.status === "RUNNING" ? "Status: trwa" :
      m.status === "PAUSED" ? "Status: pauza" :
      m.status === "DONE" ? "Status: zrobione" : `Status: ${m.status}`;

    els.missionStatus.textContent =
      `Status: ${label.replace("Status: ", "")}${m.text ? " | " + m.text : ""}`;
  }

  if (els.missionTimer) {
    els.missionTimer.textContent = `Czas: ${fmtTime(m.elapsedMs || 0)}`;
  }

  if (els.missionHint) {
    if (!m.text) {
      els.missionHint.textContent = "Ustaw misję (jedno zdanie), potem Start.";
    } else if (m.status === "RUNNING") {
      els.missionHint.textContent = "Skupienie: tylko to jedno. Jak skończysz — kliknij „Zrobione”.";
    } else if (m.status === "PAUSED") {
      els.missionHint.textContent = "Pauza. Wznów Startem albo zakończ „Zrobione”.";
    } else if (m.status === "DONE") {
      els.missionHint.textContent = "Misja zakończona. Ustaw nową misję lub wygeneruj sugestie dnia.";
    } else {
      els.missionHint.textContent = "Start → Pauza → Zrobione.";
    }
  }
}

function wireMission() {
  if (els.btnSetMission && els.missionInput) {
    els.btnSetMission.addEventListener("click", () => {
      const txt = (els.missionInput.value || "").trim();
      state.mission = state.mission || { elapsedMs: 0 };
      state.mission.text = txt;
      state.mission.status = txt ? "READY" : "NONE";
      state.mission.elapsedMs = 0;
      state.mission.startedAt = null;
      state.mission.lastTickAt = null;

      addJournal("MISSION_SET", { text: txt });
      saveState(state);
      renderMission();
      renderKpis();
    });
  }

  if (els.btnStartMission) {
    els.btnStartMission.addEventListener("click", () => {
      const m = state.mission || (state.mission = {});
      if (!m.text) {
        alert("Ustaw najpierw misję (pole „Misja teraz”).");
        return;
      }

      if (m.status !== "RUNNING") {
        m.status = "RUNNING";
        if (!m.startedAt) m.startedAt = Date.now();
        m.lastTickAt = Date.now();
        addJournal("MISSION_START", { text: m.text });
        saveState(state);
        startMissionTimer();
        renderMission();
      }
    });
  }

  if (els.btnPauseMission) {
    els.btnPauseMission.addEventListener("click", () => {
      const m = state.mission || (state.mission = {});
      if (m.status === "RUNNING") {
        m.status = "PAUSED";
        m.lastTickAt = null;
        addJournal("MISSION_PAUSE", { text: m.text });
        saveState(state);
        renderMission();
      }
    });
  }

  if (els.btnDoneMission) {
    els.btnDoneMission.addEventListener("click", () => {
      const m = state.mission || (state.mission = {});
      if (!m.text) return;

      if (m.status === "RUNNING") {
        missionTick();
      }

      m.status = "DONE";
      m.lastTickAt = null;

      logEvent("Misja zrobiona: " + m.text);
      addJournal("MISSION_DONE", { text: m.text, elapsedMs: m.elapsedMs || 0 });
      saveState(state);

      renderMission();
      renderPanel();
      renderKpis();
    });
  }

  renderMission();
}

/* =========================
   SUGESTIE DNIA
========================= */
function buildSuggestions() {
  const goal = (state.identity?.goalNow || "").trim();
  const commits = (getCommitments() || []);
  const active = commits.filter(c => !c.done);
  const events = (getEvents() || []);
  const lastEvent = events.length ? events[events.length - 1] : null;

  const suggestions = [];

  if (goal) {
    suggestions.push({
      icon: "🎯",
      title: `Cel teraz: ${goal}`,
      text: "Zrób pierwszy mały krok w 10 minut: jaki konkretnie?"
    });
  } else {
    suggestions.push({
      icon: "🎯",
      title: "Cel teraz: (puste)",
      text: "Wpisz 1 zdanie celu. To robi różnicę w sugestiach."
    });
  }

  if (active.length) {
    const top = active[0];
    suggestions.push({
      icon: "📌",
      title: `Aktywne: ${top.text}`,
      text: "Zrób minimalny ruch: 1 telefon / 1 wiadomość / 1 przygotowanie."
    });
  } else {
    suggestions.push({
      icon: "📌",
      title: "Brak aktywnych zobowiązań.",
      text: "Dodaj jedno małe zadanie (1–10 min)."
    });
  }

  if (lastEvent) {
    suggestions.push({
      icon: "🕒",
      title: `Ostatnie zdarzenie: ${lastEvent.text}`,
      text: "Kontynuujemy czy zmieniamy priorytet?"
    });
  } else {
    suggestions.push({
      icon: "🕒",
      title: "Brak zdarzeń.",
      text: "Dodaj zobowiązanie lub zakończ misję — pojawi się historia."
    });
  }

  return suggestions;
}
function getNextStep() {
  return getNextStepSuggestion({
    mission: state.mission,
    commitments: getCommitments() || [],
    events: getEvents() || [],
    goalNow: state.identity?.goalNow || ""
  });
}
window.getNextStep = getNextStep;
function refreshNextStepCard() {
  const nextStepResult = document.getElementById("nextStepResult");
  if (!nextStepResult) return;

  const step = getNextStep();

  if (!step) {
    nextStepResult.textContent = "Brak sugestii następnego kroku.";
    return;
  }

  const text = step.text || "Brak sugestii.";
  const reasonText = step.reason || "";
  const reasonBlock = reasonText ? "\n\n" + reasonText : "";

  nextStepResult.textContent = text + reasonBlock;

  if (isFeatureEnabled("nextstep_quick_mode")) {
    speak(reasonText ? `${text}. ${reasonText}` : text);
  }
}

function renderSuggestions() {
  if (!els.suggestList || !els.suggestStats) return;

  const suggestions = state.suggestions || [];
  const active = (getCommitments() || []).filter(c => !c.done).length;
  const ev = (getEvents() || []).length;

  els.suggestStats.textContent = `Sugestie: ${suggestions.length} | Aktywne: ${active} | Zdarzenia: ${ev}`;

  els.suggestList.innerHTML = suggestions.length ? suggestions.map(s => `
    <div class="item">
      <div class="left">
        <div>${esc(s.icon)} <b>${esc(s.title)}</b></div>
        <small>${esc(s.text)}</small>
      </div>
    </div>
  `).join("") : `<div class="item"><div class="left">Brak sugestii. Kliknij „Wygeneruj sugestie”.</div></div>`;
}

function wireSuggestions() {
  if (els.btnSuggest) {
    els.btnSuggest.addEventListener("click", () => {
      state.suggestions = buildSuggestions();
      addJournal("SUGGESTIONS_GEN", { count: state.suggestions.length });
      saveState(state);
      renderSuggestions();
      renderKpis();
    });
  }
  renderSuggestions();
}

/* =========================
   PROFILE / UI INIT
========================= */
function uiFromState() {
  state.identity = state.identity || {
  hostName: "Irek",
  goalNow: "",
  systemType: "PODMIOT",
  systemName: "Luni"
};

if (!state.identity.systemType) state.identity.systemType = "PODMIOT";
if (!state.identity.systemName) state.identity.systemName = "Luni";
state.devices = state.devices || {
  selectedCameraId: "",
  selectedCameraLabel: "",
  selectedMicId: "",
  selectedMicLabel: "",
  externalDeviceState: "unknown"
};

if (!state.devices.externalDeviceState) {
  state.devices.externalDeviceState = "unknown";
}
  state.priorities = state.priorities || { coherence: 85, truth: 90, help: 70, like: 40 };
  state.journal = state.journal || [];
  state.conversation = state.conversation || [];
  state.mission = state.mission || {
    text: "",
    status: "NONE",
    elapsedMs: 0,
    startedAt: null,
    lastTickAt: null
  };

  if (els.hostName) els.hostName.value = state.identity.hostName || "Irek";
  if (els.goalNow) els.goalNow.value = state.identity.goalNow || "";

  if (els.pCoherence) els.pCoherence.value = state.priorities.coherence ?? 0;
  if (els.pTruth) els.pTruth.value = state.priorities.truth ?? 0;
  if (els.pHelp) els.pHelp.value = state.priorities.help ?? 0;
  if (els.pLike) els.pLike.value = state.priorities.like ?? 0;

  if (els.backendUrl) {
    els.backendUrl.value = localStorage.getItem("PODMIOT_BACKEND_URL") || "/.netlify/functions/ask";
  }
  if (els.modelName) {
    els.modelName.value = localStorage.getItem("PODMIOT_MODEL") || "gpt-5.2";
  }

  renderKpis();
  renderMission();
  renderSuggestions();
  if (els.devicesList) {
  if (state.devices.externalDeviceState === "on") {
    els.devicesList.innerHTML = `
      <div style="padding:10px;">
        🟢 Urządzenie WŁĄCZONE<br>
        Stan zapisany w pamięci PODMIOTU
      </div>
    `;
  } else if (state.devices.externalDeviceState === "off") {
    els.devicesList.innerHTML = `
      <div style="padding:10px;">
        🔴 Urządzenie WYŁĄCZONE<br>
        Stan zapisany w pamięci PODMIOTU
      </div>
    `;
  }
}
}
/* =========================
   RUN (ask)
========================= */
async function run() {
  const input = (els.question?.value || "").trim();
  if (!input) return;

  addConversation("user", input);

  state.identity.hostName =
    (els.hostName?.value || "").trim() ||
    state.identity.hostName ||
    "Irek";

  state.identity.goalNow =
    (els.goalNow?.value || "").trim() ||
    state.identity.goalNow ||
    "";

  let hits = [];
  if (!kbCache) kbCache = await tryLoadKB();
  if (kbCache) {
    try {
      hits = kbCache.retrieve(kbCache.kb, input, 3) || [];
    } catch {
      hits = [];
    }
  }

  const context = getOperationalContext(input);
  console.log("PODMIOT CONTEXT:", context);

  const safetyGate = buildSafetyGate({ input });

  if (safetyGate.blocked) {
    const blockedMsg = `Blokada bezpieczeństwa: ${safetyGate.reason}`;

    if (els.answer) els.answer.textContent = blockedMsg;
    if (els.meta) {
      els.meta.textContent = `Mode: ${els.toggleOnline?.checked ? "ONLINE" : "OFFLINE"} | Safety: BLOCKED`;
    }

    addJournal("SAFETY_BLOCK", {
      input,
      reason: safetyGate.reason,
      riskLevel: safetyGate.riskLevel
    });

    saveState(state);
    renderKpis();
    return;
  }

  const nextStep = getNextStepSuggestion({
    mission: state.mission,
    commitments: getCommitments() || [],
    events: getEvents() || [],
    goalNow: state.identity?.goalNow || ""
  });

  const route = routeIntent({
    input,
    context,
    safetyGate,
    nextStep
  });

  if (!route || !route.mode) {
    route.mode = "CONVERSATION";
  }

  console.log("PODMIOT ROUTE:", route);

  const autonomy = evaluateAutonomy({
    context,
    route,
    nextStep,
    safetyGate
  });

  console.log("PODMIOT AUTONOMY:", autonomy);

  const decision = await tryDecide(input);

  addJournal("QUERY", {
    input,
    hitCount: hits.length,
    decision: decision?.selected || "?"
  });

  let answerText = "";
  const normalizedInput = input.toLowerCase();

  if (
    normalizedInput.includes("jakie masz funkcje") ||
    normalizedInput.includes("co możesz") ||
    normalizedInput.includes("co potrafisz")
  ) {
    answerText = "Jestem Luni. Mogę z Tobą rozmawiać, pomóc ustalić następny krok, ogarnąć panel dnia, misję, pamięć, urządzenia i analizę obrazu. Powiedz, czego potrzebujesz teraz.";
  } else if (
    normalizedInput.includes("co mam teraz zrobić") ||
    normalizedInput.includes("jaki następny krok") ||
    normalizedInput.includes("co teraz")
  ) {
    answerText = nextStep?.text || "Najpierw ustal jedną rzecz, którą chcesz ruszyć teraz.";
  } else if (
    normalizedInput.includes("mam chaos") ||
    normalizedInput.includes("nie wiem co robić") ||
    normalizedInput.includes("stoję w miejscu")
  ) {
    answerText = "Masz teraz przeciążenie, nie brak możliwości. Wybierz jedną rzecz, która najbardziej Ci ciąży, i od niej zaczniemy.";
  } else if (els.toggleOnline?.checked) {
    const ai = await onlineAnswer(decision, input, hits);
    console.log("AI RAW:", ai);
    answerText = ai;
  } else {
    answerText = offlineAnswer(decision, input, hits);
  }

  if (els.answer) els.answer.textContent = answerText;
  addConversation("assistant", answerText);
  saveState(state);

  if (els.meta) {
    els.meta.textContent =
      `Mode: ${els.toggleOnline?.checked ? "ONLINE" : "OFFLINE"} | Route: ${route.mode} | Autonomy: ${autonomy.mode} | Audit: ${(state.journal || []).length}`;
  }

  renderSources(hits);
  renderKpis();

  if (voiceLoop) {
    speak(answerText);
  }
}

/* =========================
   EXPORT / LOG / RESET
========================= */
function exportJSON() {
  const exportObj = {
    state,
    panelDay: {
      commitments: getCommitments() || [],
      events: getEvents() || []
    }
  };

  const blob = new Blob([JSON.stringify(exportObj, null, 2)], {
    type: "application/json"
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `podmiot_v2_export_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function showLog() {
  if (!els.log) return;
  els.log.textContent = JSON.stringify({
    audit: (state.journal || []).slice(-120),
    panelEvents: (getEvents() || []).slice(-60)
  }, null, 2);
}

function fullReset() {
  if (!confirm("Na pewno zresetować pamięć PODMIOT (profil + audit + misja)?")) return;

  resetState();
  state = loadState();
  kbCache = null;

  if (restartListenTimer) {
    clearTimeout(restartListenTimer);
    restartListenTimer = null;
  }

  setConversationMode(false);

  if (els.answer) els.answer.textContent = "";
  if (els.meta) els.meta.textContent = "";
  if (els.sources) els.sources.textContent = "";
  if (els.log) els.log.textContent = "";

  uiFromState();
  renderKpis();
}

/* =========================
   VISION SYSTEM
========================= */
async function visionStartCamera() {
  const selectedCameraId = state.devices?.selectedCameraId || "";

  if (!vision.video) return;

  try {
    if (vision.video.srcObject) {
      const tracks = vision.video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      vision.video.srcObject = null;
    }

    let constraints;

if (selectedCameraId) {
  constraints = {
    video: { deviceId: { exact: selectedCameraId } },
    audio: false
  };
} else {
  constraints = {
    video: { facingMode: "environment" },
    audio: false
  };
}

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    vision.video.srcObject = stream;

    visionStream = true;

    if (vision.status) {
      const label = state.devices?.selectedCameraLabel || "domyślna kamera";
      vision.status.textContent = `Kamera: ON (${label})`;
    }
  } catch (err) {
    visionStream = null;

    if (vision.status) {
      vision.status.textContent = "Nie udało się uruchomić wybranej kamery.";
    }

    console.error("VISION START ERROR:", err);
  }
}

function visionStopCamera() {
  stopCamera("visionVideo");

  visionStream = null;

  if (vision.status) {
    vision.status.textContent = "Kamera: OFF";
  }
}

function visionTakePhoto() {
  const ok = capturePhotoFromVideo("visionVideo", "visionCanvas");

  if (ok) {
    if (vision.status) {
      vision.status.textContent = "Zdjęcie wykonane";
    }
  } else {
    if (vision.status) {
      vision.status.textContent = "Video nie jest gotowe";
    }
  }
}
function visionLoadFile(file) {
  loadImageToCanvas(file, "visionCanvas");

  if (vision.status) {
    vision.status.textContent = "Obraz wczytany z pliku";
  }
}
function visionAnalyzeImage() {
  if (!vision.canvas) return;

  const hasPhoto = !!(vision.canvas.width > 0 && vision.canvas.height > 0);

  if (!hasPhoto) {
    if (visionAnalyze.result) {
      visionAnalyze.result.textContent = "Brak zdjęcia do analizy. Najpierw zrób zdjęcie.";
    }
    if (visionAnalyze.status) {
      visionAnalyze.status.textContent = "Analiza: brak zdjęcia";
    }
    return;
  }

  const w = vision.canvas.width;
  const h = vision.canvas.height;
  const ratio = (w / h).toFixed(2);

  let qualityNote = "Obraz wygląda poprawnie.";
  if (w < 640 || h < 480) {
    qualityNote = "Obraz jest dość mały — analiza może być ograniczona.";
  }

  const summary =
    `Mam zdjęcie do analizy.\n\n` +
    `Rozdzielczość: ${w} × ${h}\n` +
    `Proporcje: ${ratio}\n` +
    `Status kamery: ${visionStream ? "kamera aktywna" : "kamera wyłączona"}\n\n` +
    `${qualityNote}\n\n` +
    `To jest analiza techniczna 1.0. Następny krok to analiza treści obrazu przez vision AI.`;

  if (visionAnalyze.result) {
    visionAnalyze.result.textContent = summary;
  }

  if (visionAnalyze.status) {
    visionAnalyze.status.textContent = "Analiza: gotowa";
  }
}

async function visionAnalyzeContent() {
  try {
    if (visionAnalyze.status) {
      visionAnalyze.status.textContent = "Analiza AI: trwa...";
    }

    if (visionAnalyze.result) {
      visionAnalyze.result.textContent = `${getSystemName()} analizuje obraz...`;
    }

    const resultText = await analyzeCanvasImage(
      "visionCanvas",
      "https://pomdmiot.netlify.app/.netlify/functions/vision"
    );

    if (visionAnalyze.result) {
      visionAnalyze.result.textContent = resultText;
    }

    if (visionAnalyze.status) {
      visionAnalyze.status.textContent = "Analiza AI: gotowa";
    }
    
    if (isFeatureEnabled("vision_nextstep_auto")) {
  refreshNextStepCard();
}

    if (voiceLoop) {
      speak(resultText);
    }

  } catch (err) {
    const msg =
      "Backend Vision AI nie odpowiada.\n\n" +
      "Frontend działa poprawnie (kamera / upload obrazu OK), " +
      "ale analiza treści obrazu ruszy po deployu Netlify Functions.";

    if (visionAnalyze.result) {
      visionAnalyze.result.textContent = msg;
    }

    if (visionAnalyze.status) {
      visionAnalyze.status.textContent = "Analiza AI: backend offline";
    }

    console.error("VISION FETCH ERROR:", err);
  }
}

async function renderDevices() {
  const list = els.devicesList;
  if (!list) return;

  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    list.innerHTML = "Brak wsparcia dla urządzeń w tej przeglądarce.";
    return;
  }

  try {
    await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

    const devices = await navigator.mediaDevices.enumerateDevices();

    if (!devices.length) {
      list.innerHTML = "Nie znaleziono urządzeń.";
      return;
    }

    let html = "";

    devices.forEach((d, i) => {
  const label = d.label || "Urządzenie " + (i + 1);
const isVideo = d.kind === "videoinput";
const isAudio = d.kind === "audioinput";

const isSelectedCamera = state.devices?.selectedCameraId === d.deviceId;
const isSelectedMic = state.devices?.selectedMicId === d.deviceId;

  html += `
    <div class="item">
      <div class="left">
        <b>${label}</b>
        <small>typ: ${d.kind}</small>
      </div>
      <div class="right">
        ${
  isVideo
    ? `<button class="btnSelectCamera" data-id="${d.deviceId}" data-label="${label}">
         ${isSelectedCamera ? "Wybrana kamera" : "Wybierz kamerę"}
       </button>`
    : isAudio
    ? `<button class="btnSelectMic" data-id="${d.deviceId}" data-label="${label}">
         ${isSelectedMic ? "Wybrany mikrofon" : "Wybierz mikrofon"}
       </button>`
    : ""
}
      </div>
    </div>
  `;
});

    list.innerHTML = html;
    wireDeviceActions();
  } catch (err) {
    list.innerHTML = "Brak zgody na dostęp do urządzeń.";
    console.error("DEVICES ERROR:", err);
  }
}

async function testExternalDevice() {
  try {
    const res = await fetch("https://jsonplaceholder.typicode.com/todos/1");
    const data = await res.json();

    console.log("DEVICE RESPONSE:", data);

    if (els.devicesList) {
      els.devicesList.innerHTML = `
        <div style="padding:10px;">
          ✅ Urządzenie odpowiedziało<br>
          ID: ${data.id}<br>
          Tytuł: ${data.title}
        </div>
      `;
    }

  } catch (e) {
    console.error(e);

    if (els.devicesList) {
      els.devicesList.innerHTML = `
        <div style="padding:10px; color:red;">
          ❌ Brak połączenia z urządzeniem
        </div>
      `;
    }
  }
}



function bridgeGetDeviceInfo() {
  return bridgeJson("device_info");
}
function bridgeGetNetworkInfo() {
  return bridgeJson("network_info");
}
function bridgeRunAction(actionName, payload = {}) {
  return bridgeJson(actionName, payload);
}

function testMobileBridge() {
  const deviceResult = bridgeGetDeviceInfo();
  const networkResult = bridgeGetNetworkInfo();
  const pingResult = bridgeRunAction("ping");
  const bluetoothResult = bridgeJson("bluetooth_state");
  const batteryResult = bridgeJson("battery_info");

  if (!els.devicesList) return;

  if (!hasBridge) {
    els.devicesList.innerHTML = `
      <div style="padding:10px; color:#ff8080;">
        ❌ Mobile Bridge niedostępny<br>
        bridge_unavailable
      </div>
    `;
    return;
  }

  if (!deviceResult.ok) {
    els.devicesList.innerHTML = `
      <div style="padding:10px; color:#ff8080;">
        ❌ Device Info error<br>
        ${esc(deviceResult.error || "unknown_error")}
      </div>
    `;
    return;
  }

  const networkBlock = networkResult.ok
    ? `
      <br><br>
      <b>Sieć:</b><br>
      Connected: ${esc(String(networkResult.connected))}<br>
      Transport: ${esc(networkResult.transport || "unknown")}<br>
      Internet: ${esc(String(networkResult.internet))}<br>
      Validated: ${esc(String(networkResult.validated))}
    `
    : `
      <br><br>
      <b>Sieć:</b><br>
      ❌ ${esc(networkResult.error || "network_unknown_error")}
    `;

  const actionBlock = pingResult.ok
    ? `
      <br><br>
      <b>Akcja:</b><br>
      Ping: ${esc(pingResult.message || pingResult.result || "ok")}
    `
    : `
      <br><br>
      <b>Akcja:</b><br>
      ❌ ${esc(pingResult.error || "action_unknown_error")}
    `;

  const bluetoothBlock = bluetoothResult.ok
    ? `
      <br><br>
      <b>Bluetooth:</b><br>
      Supported: ${esc(String(bluetoothResult.supported))}<br>
      Enabled: ${esc(String(bluetoothResult.enabled))}
    `
    : `
      <br><br>
      <b>Bluetooth:</b><br>
      ❌ ${esc(bluetoothResult.error || "bluetooth_unknown_error")}
    `;

  const batteryBlock = batteryResult.ok
    ? `
      <br><br>
      <b>Bateria:</b><br>
      Percent: ${esc(String(batteryResult.percent))}%<br>
      Charging: ${esc(String(batteryResult.charging))}
    `
    : `
      <br><br>
      <b>Bateria:</b><br>
      ❌ ${esc(batteryResult.error || "battery_unknown_error")}
    `;

  els.devicesList.innerHTML = `
    <div style="padding:10px;">
      ✅ Mobile Bridge działa<br><br>
      <b>Urządzenie:</b><br>
      Marka: ${esc(deviceResult.brand || "unknown")}<br>
      Model: ${esc(deviceResult.model || "unknown")}<br>
      Android: ${esc(deviceResult.androidVersion || "unknown")}<br>
      Device: ${esc(deviceResult.device || "unknown")}
      ${networkBlock}
      ${actionBlock}
      ${bluetoothBlock}
      ${batteryBlock}
    </div>
  `;
}


async function deviceOn() {
  try {
    const res = await fetch("https://jsonplaceholder.typicode.com/todos/1");
    const data = await res.json();
    state.devices.externalDeviceState = "on";
saveState(state);
    if (els.devicesList) {
      els.devicesList.innerHTML = `
        <div style="padding:10px;">
          🟢 Urządzenie WŁĄCZONE<br>
          ID: ${data.id}
        </div>
      `;
    }

    console.log("DEVICE ON", data);

  } catch (e) {
    console.error(e);
  }
}

async function deviceOff() {
  try {
    const res = await fetch("https://jsonplaceholder.typicode.com/todos/2");
    const data = await res.json();
    state.devices.externalDeviceState = "off";
saveState(state);

    if (els.devicesList) {
      els.devicesList.innerHTML = `
        <div style="padding:10px;">
          🔴 Urządzenie WYŁĄCZONE<br>
          ID: ${data.id}
        </div>
      `;
    }

    console.log("DEVICE OFF", data);

  } catch (e) {
    console.error(e);
  }
}


/* =========================
   WIRING
========================= */
function wireAll() {
  setStatusPill();
  els.toggleOnline?.addEventListener("change", setStatusPill);

  els.saveProfile?.addEventListener("click", () => {
    state.priorities.coherence = Number(els.pCoherence?.value || 0);
    state.priorities.truth = Number(els.pTruth?.value || 0);
    state.priorities.help = Number(els.pHelp?.value || 0);
    state.priorities.like = Number(els.pLike?.value || 0);

    state.identity.hostName =
      (els.hostName?.value || "").trim() ||
      state.identity.hostName;

    state.identity.goalNow =
      (els.goalNow?.value || "").trim() ||
      state.identity.goalNow;

    addJournal("PROFILE_SAVE", {
      priorities: state.priorities,
      identity: state.identity
    });

    saveState(state);
    renderKpis();
  });

els.btnScanDevices?.addEventListener("click", renderDevices);
els.btnTestDevice?.addEventListener("click", testExternalDevice);
els.btnDeviceOn?.addEventListener("click", deviceOn);
els.btnDeviceOff?.addEventListener("click", deviceOff);
els.btnTestBridge?.addEventListener("click", testMobileBridge);
els.btnRefreshMobileState?.addEventListener("click", renderMobileState);
  els.askBtn?.addEventListener("click", run);
  els.clearBtn?.addEventListener("click", () => {
    if (els.question) els.question.value = "";
  });

  initMic();
  els.micBtn?.addEventListener("click", toggleMic);

  els.speakBtn?.addEventListener("click", () => speak(els.answer?.textContent || ""));
  els.stopSpeakBtn?.addEventListener("click", stopSpeak);

const btnNextStep = document.getElementById("btnNextStep");

btnNextStep?.addEventListener("click", refreshNextStepCard);
  els.showLog?.addEventListener("click", showLog);
  els.exportBtn?.addEventListener("click", exportJSON);
  els.resetBtn?.addEventListener("click", fullReset);

  wirePanel();
  wireMission();
  wireSuggestions();

  if (state.mission?.status === "RUNNING") {
    startMissionTimer();
  }

  if (vision.startBtn) {
    vision.startBtn.addEventListener("click", visionStartCamera);
  }

  if (vision.shotBtn) {
    vision.shotBtn.addEventListener("click", visionTakePhoto);
  }
if (vision.pickBtn && vision.fileInput) {
  vision.pickBtn.addEventListener("click", () => {
    vision.fileInput.click();
  });

  vision.fileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) {
      visionLoadFile(file);
    }
  });
}
  if (vision.stopBtn) {
    vision.stopBtn.addEventListener("click", visionStopCamera);
  }

  if (visionAnalyze.btn) {
    visionAnalyze.btn.addEventListener("click", visionAnalyzeContent);
  }

  renderKpis();
  refreshNextStepCard();
  renderMobileState();
}

// =============================
// PODMIOT MOBILE BRIDGE CORE
// =============================

const hasBridge = typeof window.PodmiotBridge !== "undefined";

function bridgeCall(action, payload = {}) {
  if (!hasBridge) {
    return JSON.stringify({
      ok: false,
      source: "app.js",
      error: "bridge_unavailable"
    });
  }

  try {
    switch (action) {
      case "ping":
        return window.PodmiotBridge.ping();
        case "device_info":
    return window.PodmiotBridge.getDeviceInfo();

      case "battery_info":
        return window.PodmiotBridge.getBatteryInfo();

      case "network_info":
        return window.PodmiotBridge.getNetworkInfo();

      case "bluetooth_state":
        return window.PodmiotBridge.isBluetoothEnabled();

      case "paired_bluetooth_devices":
        return window.PodmiotBridge.getPairedBluetoothDevices();

      default:
        return window.PodmiotBridge.runAction(
          action,
          JSON.stringify(payload)
        );
    }
  } catch (e) {
    return JSON.stringify({
      ok: false,
      source: "app.js",
      error: e.message || String(e)
    });
  }
}

function bridgeJson(action, payload = {}) {
  try {
    return JSON.parse(bridgeCall(action, payload));
  } catch (e) {
    return {
      ok: false,
      source: "app.js",
      error: "invalid_json",
      raw: bridgeCall(action, payload)
    };
  }
}

// =============================
// STATE REFRESH
// =============================

function refreshMobileState() {
  const battery = bridgeJson("battery_info");
  const network = bridgeJson("network_info");
  const bluetooth = bridgeJson("bluetooth_state");

  console.log("PODMIOT STATE:", {
    battery,
    network,
    bluetooth,
    hasBridge
  });

  return {
    battery,
    network,
    bluetooth,
    hasBridge
  };
}
function renderMobileState() {
  if (!els.mobileStateList) return;

  const state = refreshMobileState();

  if (!state.hasBridge) {
    els.mobileStateList.innerHTML = `
      <div class="item">
        <div class="left">
          <b>Bridge</b>
          <small>Brak połączenia z telefonem</small>
        </div>
      </div>
    `;
    return;
  }

  const battery = state.battery || {};
  const network = state.network || {};
  const bluetooth = state.bluetooth || {};

  const batteryText = battery.ok
    ? `${battery.percent ?? "?"}% | ładowanie: ${String(battery.charging)}`
    : `Błąd: ${battery.error || "unknown"}`;

  const networkText = network.ok
    ? `connected: ${String(network.connected)} | transport: ${network.transport || "unknown"} | internet: ${String(network.internet)}`
    : `Błąd: ${network.error || "unknown"}`;

  const bluetoothText = bluetooth.ok
    ? `supported: ${String(bluetooth.supported)} | enabled: ${String(bluetooth.enabled)}`
    : `Błąd: ${bluetooth.error || "unknown"}`;

  els.mobileStateList.innerHTML = `
    <div class="item">
      <div class="left">
        <b>Bridge</b>
        <small>Połączony</small>
      </div>
    </div>

    <div class="item">
      <div class="left">
        <b>Bateria</b>
        <small>${esc(batteryText)}</small>
      </div>
    </div>

    <div class="item">
      <div class="left">
        <b>Sieć</b>
        <small>${esc(networkText)}</small>
      </div>
    </div>

    <div class="item">
      <div class="left">
        <b>Bluetooth</b>
        <small>${esc(bluetoothText)}</small>
      </div>
    </div>
  `;
}

window.refreshMobileState = refreshMobileState;
seedTestProposal();
seedNextStepProposal();
renderProposals();
uiFromState();
wireAll();
renderDevices();

