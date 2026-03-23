// MEMORY SYSTEM – PODMIOT (v2 kompatybilny)
// Trzyma wszystko w jednym miejscu: commitments + journal + identity + priorities

const STORAGE_KEY = "podmiot_memory";

function nowISO() {
  return new Date().toISOString();
}

function defaultState() {
  return {
    created: Date.now(),
    commitments: [],
    journal: [],
    identity: { hostName: "Irek", goalNow: "" },
    priorities: { coherence: 85, truth: 90, help: 70, like: 40 },
    relationalCost: 0
  };
}

function migrate(mem) {
  // jeśli stara wersja miała events -> przenieś do journal
  if (mem && Array.isArray(mem.events) && !Array.isArray(mem.journal)) {
    mem.journal = mem.events.map(e => ({
      type: "EVENT",
      time: e.time || nowISO(),
      text: e.text || ""
    }));
    delete mem.events;
  }
  if (!Array.isArray(mem.commitments)) mem.commitments = [];
  if (!Array.isArray(mem.journal)) mem.journal = [];
  if (!mem.identity) mem.identity = { hostName: "Irek", goalNow: "" };
  if (!mem.priorities) mem.priorities = { coherence: 85, truth: 90, help: 70, like: 40 };
  if (typeof mem.relationalCost !== "number") mem.relationalCost = 0;
  if (!mem.created) mem.created = Date.now();
  return mem;
}

function loadRaw() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState();
  try {
    return migrate(JSON.parse(raw));
  } catch (e) {
    // jeśli JSON uszkodzony: reset do default
    return defaultState();
  }
}

function saveRaw(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ===== API dla PODMIOT v2 (stan) ===== */

export function loadState() {
  return loadRaw();
}

export function saveState(state) {
  saveRaw(migrate(state || defaultState()));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
}

export function addEvent(state, type, data = {}) {
  const s = state || loadRaw();
  s.journal.push({
    type: type || "EVENT",
    time: nowISO(),
    text: data?.text || data?.input || "",
    data
  });
  saveRaw(s);
  return s;
}

/* ===== API Panelu dnia (kompatybilność) ===== */

export function addCommitment(text) {
  const s = loadRaw();
  s.commitments.push({
    id: Date.now(),
    text: String(text || ""),
    created: nowISO(),
    done: false
  });
  // dopisz do journal jako event
  s.journal.push({ type: "COMMIT_ADD", time: nowISO(), text: String(text || "") });
  saveRaw(s);
}

export function completeCommitment(id) {
  const s = loadRaw();
  const c = s.commitments.find(x => x.id === id);
  if (c) {
    c.done = true;
    c.doneAt = nowISO();
    s.journal.push({ type: "COMMIT_DONE", time: nowISO(), text: String(id) });
    saveRaw(s);
  }
}

export function getCommitments() {
  const s = loadRaw();
  return s.commitments;
}

export function logEvent(text) {
  const s = loadRaw();
  s.journal.push({ type: "EVENT", time: nowISO(), text: String(text || "") });
  saveRaw(s);
}

export function getEvents() {
  const s = loadRaw();
  // zwracamy „ładne” eventy jak wcześniej
  return s.journal
    .filter(e => e.type === "EVENT" || e.type === "COMMIT_ADD" || e.type === "COMMIT_DONE")
    .map(e => ({ text: e.text, time: e.time }));
}