// core/evolution.js

const PROPOSALS_KEY = "podmiot_evolution_proposals";
const FEATURES_KEY = "podmiot_evolution_features";

function readJson(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = "item") {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

/* =========================
   PROPOSALS
========================= */

export function getStoredProposals() {
  return readJson(PROPOSALS_KEY, []);
}

export function saveStoredProposals(proposals) {
  writeJson(PROPOSALS_KEY, proposals || []);
}

export function addProposal(proposal) {
  const proposals = getStoredProposals();

  const item = {
    id: proposal?.id || makeId("proposal"),
    type: proposal?.type || "automation",
    title: proposal?.title || "Nowa propozycja",
    description: proposal?.description || "",
    reason: proposal?.reason || "",
    featureKey: proposal?.featureKey || "",
    status: proposal?.status || "proposed",
    createdAt: proposal?.createdAt || nowIso()
  };

  proposals.push(item);
  saveStoredProposals(proposals);
  return item;
}

export function getPendingProposals() {
  return getStoredProposals().filter(p => p.status === "proposed");
}

export function updateProposalStatus(proposalId, status) {
  const proposals = getStoredProposals();
  const idx = proposals.findIndex(p => p.id === proposalId);
  if (idx === -1) return null;

  proposals[idx].status = status;
  proposals[idx].updatedAt = nowIso();

  saveStoredProposals(proposals);
  return proposals[idx];
}

export function hasProposalForFeature(featureKey) {
  const proposals = getStoredProposals();
  return proposals.some(p => p.featureKey === featureKey);
}

/* =========================
   FEATURES
========================= */

export function getStoredFeatures() {
  return readJson(FEATURES_KEY, []);
}

export function saveStoredFeatures(features) {
  writeJson(FEATURES_KEY, features || []);
}

export function isFeatureEnabled(featureKey) {
  const features = getStoredFeatures();
  return features.some(f => f.key === featureKey && f.enabled === true);
}

export function enableFeature(featureKey, source = "user_approved") {
  const features = getStoredFeatures();
  const idx = features.findIndex(f => f.key === featureKey);

  if (idx >= 0) {
    features[idx].enabled = true;
    features[idx].source = source;
    features[idx].updatedAt = nowIso();
  } else {
    features.push({
      key: featureKey,
      enabled: true,
      source,
      installedAt: nowIso()
    });
  }

  saveStoredFeatures(features);
  return true;
}

export function disableFeature(featureKey) {
  const features = getStoredFeatures();
  const idx = features.findIndex(f => f.key === featureKey);
  if (idx === -1) return false;

  features[idx].enabled = false;
  features[idx].updatedAt = nowIso();

  saveStoredFeatures(features);
  return true;
}

/* =========================
   FIRST TEST PROPOSAL
========================= */

export function seedTestProposal() {
  const featureKey = "vision_nextstep_auto";

  if (hasProposalForFeature(featureKey)) return null;

  return addProposal({
    type: "automation",
    title: "Połącz Vision z Next Step",
    description: "Po analizie obrazu automatycznie zaproponuj następny krok.",
    reason: "To może skrócić powtarzalny schemat: analiza obrazu → pytanie „co teraz?”.",
    featureKey,
    status: "proposed"
  });
}
export function seedNextStepProposal() {
  const featureKey = "nextstep_quick_mode";

  if (hasProposalForFeature(featureKey)) return null;

  return addProposal({
    type: "automation",
    title: "Tryb szybkiego następnego kroku",
    description: "LUNI może szybciej proponować następny krok w częstych sytuacjach.",
    reason: "To może przyspieszyć pracę, jeśli często używasz funkcji „Co teraz?”.",
    featureKey,
    status: "proposed"
  });
}