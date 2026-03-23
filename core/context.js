// =============================
// PODMIOT CORE — CONTEXT
// =============================

export function buildContext({
  state = {},
  commitments = [],
  events = [],
  mobileState = null,
  input = ""
} = {}) {
  const profile = state.profile || {};
  const identity = state.identity || {};
  const mission = state.mission || {};
  const priorities = state.priorities || {};
  const devices = state.devices || {};
  const memory = state.memory || {};

  const activeCommitments = (commitments || []).filter(item => !item.done);
  const recentEvents = (events || []).slice(-10);

  const context = {
    timestamp: Date.now(),

    input: {
      raw: input || "",
      hasInput: !!(input || "").trim()
    },

    user: {
      name: profile.name || identity.hostName || "Irek",
      language: profile.language || "pl",
      goalNow: identity.goalNow || ""
    },

    system: {
      systemType: identity.systemType || "PODMIOT",
      systemName: identity.systemName || "LUNI",
      relationalCost: state.relationalCost || 0
    },

    mission: {
      active: !!mission.text && mission.status === "RUNNING",
      text: mission.text || "",
      status: mission.status || "NONE",
      elapsedMs: mission.elapsedMs || 0
    },

    priorities: {
      truth: priorities.truth ?? 100,
      help: priorities.help ?? 70,
      like: priorities.like ?? 40,
      coherence: priorities.coherence ?? 85,
      safety: priorities.safety ?? 100,
      usefulness: priorities.usefulness ?? 80,
      speed: priorities.speed ?? 60
    },

    commitments: {
      total: (commitments || []).length,
      activeCount: activeCommitments.length,
      active: activeCommitments.slice(0, 5)
    },

    events: {
      total: (events || []).length,
      recent: recentEvents
    },

    devices: {
      selectedCameraId: devices.selectedCameraId || "",
      selectedCameraLabel: devices.selectedCameraLabel || "",
      selectedMicId: devices.selectedMicId || "",
      selectedMicLabel: devices.selectedMicLabel || "",
      externalDeviceState: devices.externalDeviceState || "unknown"
    },

    mobile: normalizeMobileState(mobileState),

    memory: {
      lastInputs: memory.lastInputs || [],
      lastDecisions: memory.lastDecisions || []
    }
  };

  context.summary = buildContextSummary(context);

  return context;
}

// =============================
// MOBILE STATE NORMALIZATION
// =============================

export function normalizeMobileState(mobileState) {
  if (!mobileState) {
    return {
      hasBridge: false,
      battery: null,
      network: null,
      bluetooth: null
    };
  }

  return {
    hasBridge: !!mobileState.hasBridge,
    battery: mobileState.battery || null,
    network: mobileState.network || null,
    bluetooth: mobileState.bluetooth || null
  };
}

// =============================
// CONTEXT SUMMARY
// =============================

export function buildContextSummary(context) {
  const parts = [];

  if (context.user?.goalNow) {
    parts.push(`Cel: ${context.user.goalNow}`);
  }

  if (context.mission?.text) {
    parts.push(`Misja: ${context.mission.text} (${context.mission.status})`);
  }

  if (context.commitments?.activeCount > 0) {
    parts.push(`Aktywne zobowiązania: ${context.commitments.activeCount}`);
  } else {
    parts.push("Brak aktywnych zobowiązań");
  }

  if (context.mobile?.hasBridge) {
    parts.push("Bridge: połączony");
  } else {
    parts.push("Bridge: brak połączenia");
  }

  return parts.join(" | ");
}

// =============================
// SHORT CONTEXT FOR UI / LOGS
// =============================

export function getShortContext(context) {
  return {
    user: context.user?.name || "Irek",
    goalNow: context.user?.goalNow || "",
    mission: context.mission?.text || "",
    missionStatus: context.mission?.status || "NONE",
    activeCommitments: context.commitments?.activeCount || 0,
    hasBridge: !!context.mobile?.hasBridge
  };
}