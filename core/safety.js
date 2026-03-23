// =============================
// PODMIOT CORE — SAFETY
// =============================

const BLOCKED_PATTERNS = [
  /zabij/i,
  /skrzywd/i,
  /zrób bomb/i,
  /jak zrobić bomb/i,
];

const CONFIRMATION_ACTIONS = [
  "device_power_on",
  "device_power_off",
  "open_settings",
  "open_wifi_settings",
  "open_bluetooth_settings",
  "run_external_device"
];

export function checkInputSafety(input = "") {
  const text = String(input || "").trim();

  if (!text) {
    return {
      ok: true,
      blocked: false,
      reason: "",
      riskLevel: "low"
    };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        ok: false,
        blocked: true,
        reason: "To zapytanie wpada w obszar działań niebezpiecznych albo niedozwolonych.",
        riskLevel: "high"
      };
    }
  }

  return {
    ok: true,
    blocked: false,
    reason: "",
    riskLevel: "low"
  };
}

export function checkActionSafety(action = "", payload = {}) {
  const actionName = String(action || "").trim();

  if (!actionName) {
    return {
      ok: true,
      blocked: false,
      requiresConfirmation: false,
      reason: "",
      riskLevel: "low"
    };
  }

  if (CONFIRMATION_ACTIONS.includes(actionName)) {
    return {
      ok: true,
      blocked: false,
      requiresConfirmation: true,
      reason: "Ta akcja wpływa na urządzenie albo ustawienia, więc wymaga potwierdzenia użytkownika.",
      riskLevel: "medium"
    };
  }

  return {
    ok: true,
    blocked: false,
    requiresConfirmation: false,
    reason: "",
    riskLevel: "low"
  };
}

export function buildSafetyGate({ input = "", action = "", payload = {} } = {}) {
  const inputCheck = checkInputSafety(input);
  if (!inputCheck.ok || inputCheck.blocked) {
    return {
      blocked: true,
      requiresConfirmation: false,
      reason: inputCheck.reason,
      riskLevel: inputCheck.riskLevel,
      source: "input"
    };
  }

  const actionCheck = checkActionSafety(action, payload);
  if (actionCheck.blocked) {
    return {
      blocked: true,
      requiresConfirmation: false,
      reason: actionCheck.reason,
      riskLevel: actionCheck.riskLevel,
      source: "action"
    };
  }

  return {
    blocked: false,
    requiresConfirmation: !!actionCheck.requiresConfirmation,
    reason: actionCheck.reason || "",
    riskLevel: actionCheck.riskLevel || "low",
    source: action ? "action" : "input"
  };
}