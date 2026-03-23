// =============================
// PODMIOT CORE — STATE
// =============================

const STORAGE_KEY = "PODMIOT_STATE_V1";

// =============================
// DEFAULT STATE
// =============================

export function createDefaultState() {
  return {
    version: 1,
    createdAt: Date.now(),

    profile: {
      name: "Irek",
      language: "pl"
    },

    system: {
      lastStart: Date.now(),
      mode: "normal" // normal | focus | safe
    },

    mission: {
      active: false,
      text: "",
      startedAt: null,
      status: "idle" // idle | running | paused | done
    },

    priorities: {
      truth: 100,
      safety: 100,
      usefulness: 80,
      speed: 60
    },

    devices: {
      selectedCameraId: null,
      selectedMicId: null
    },

    memory: {
      lastInputs: [],
      lastDecisions: []
    }
  };
}

// =============================
// LOAD STATE
// =============================

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();

    const parsed = JSON.parse(raw);

    // fallback jeśli wersja się zmieni
    if (!parsed.version) {
      return createDefaultState();
    }

    return parsed;
  } catch (e) {
    console.warn("STATE LOAD ERROR:", e);
    return createDefaultState();
  }
}

// =============================
// SAVE STATE
// =============================

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("STATE SAVE ERROR:", e);
  }
}

// =============================
// PATCH STATE (bezpieczna zmiana)
// =============================

export function patchState(state, partial) {
  const newState = deepMerge(state, partial);
  saveState(newState);
  return newState;
}

// =============================
// RESET STATE
// =============================

export function resetState() {
  const fresh = createDefaultState();
  saveState(fresh);
  return fresh;
}

// =============================
// HELPERS
// =============================

function deepMerge(target, source) {
  if (!source) return target;

  const output = { ...target };

  Object.keys(source).forEach((key) => {
    if (
      typeof source[key] === "object" &&
      source[key] !== null &&
      !Array.isArray(source[key])
    ) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  });

  return output;
}