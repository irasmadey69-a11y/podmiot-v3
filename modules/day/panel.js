import { getMission } from "./mission.js";
import { getPriorities } from "./priorities.js";

export function buildDayPanel(profile = {}, dayState = {}) {
  const mission = getMission(dayState);
  const priorities = getPriorities(profile);

  return {
    hostName: profile.hostName || "Irek",
    systemType: profile.systemType || "PODMIOT",
    systemName: profile.systemName || "LUNI",
    goalNow: profile.goalNow || "",
    relationalCost: Number(profile.relationalCost || 0),
    mission,
    priorities
  };
}
