
export type HouseholdEventType =
  | "DOORBELL"
  | "QUIET_HOURS"
  | "CONFLICTING_REQUEST"
  | "DEVICE_FAILURE"
  | "SAFETY_EMERGENCY";

export type HouseholdEvent = {
  id: string;
  type: HouseholdEventType;
  description: string;
  createdAt: string;
  context?: {
    quietHours?: boolean;
    liveMatch?: boolean;
    currentActivity?: string;
  };
};

export type CoordinationDecision = {
  eventId: string;
  decision: string;
  reason: string;
  actions: string[];
  status: "PLANNED" | "COMPLETED" | "FAILED";
};

function isSafetyEmergency(event: HouseholdEvent): boolean {
  const description = event.description.toLowerCase();

  const safetyKeywords = [
    "smoke alarm",
    "fire alarm",
    "fire in",
    "there is a fire",
    "house is on fire",
    "gas leak",
    "carbon monoxide",
    "someone is injured",
    "someone has collapsed",
    "person has collapsed",
    "can't breathe",
    "cannot breathe"
  ];

  return (
    event.type === "SAFETY_EMERGENCY" ||
    safetyKeywords.some((keyword) => description.includes(keyword))
  );
}

export function evaluateHouseholdEvent(
  event: HouseholdEvent
): CoordinationDecision {
  const context = event.context ?? {};


  if (isSafetyEmergency(event)) {
    return {
      eventId: event.id,
      decision: "SAFETY_ALERT",
      reason:
        "A possible safety emergency takes priority over ordinary household activities.",
      actions: ["PRIORITIZE_SAFETY"],
      status: "PLANNED"
    };
  }

  switch (event.type) {
    case "DOORBELL":
      if (context.quietHours) {
        return {
          eventId: event.id,
          decision: "QUIET_DOORBELL_ANNOUNCEMENT",
          reason: "Quiet hours are active, so avoid a loud announcement.",
          actions: ["USE_LOW_VOLUME_ANNOUNCEMENT"],
          status: "PLANNED"
        };
      }

      if (context.liveMatch) {
        return {
          eventId: event.id,
          decision: "MINIMIZE_MATCH_INTERRUPTION",
          reason: "A live match is in progress, so use a brief announcement.",
          actions: ["USE_BRIEF_ANNOUNCEMENT"],
          status: "PLANNED"
        };
      }

      return {
        eventId: event.id,
        decision: "ANNOUNCE_DOORBELL",
        reason: "A doorbell event needs household attention.",
        actions: ["ANNOUNCE_DOORBELL"],
        status: "PLANNED"
      };

    case "QUIET_HOURS":
      return {
        eventId: event.id,
        decision: "PRESERVE_QUIET",
        reason: "Avoid unnecessary noise during quiet hours.",
        actions: ["REDUCE_ANNOUNCEMENTS"],
        status: "PLANNED"
      };

    case "CONFLICTING_REQUEST": {
      const description = event.description.toLowerCase();

      if (context.quietHours) {
        return {
          eventId: event.id,
          decision: "PRIORITIZE_QUIET_HOURS",
          reason:
            "Quiet hours are active, so minimizing noise takes priority.",
          actions: ["KEEP_VOLUME_LOW"],
          status: "PLANNED"
        };
      }

      if (
        description.includes("tv volume") ||
        description.includes("volume increased")
      ) {
        return {
          eventId: event.id,
          decision: "BALANCE_VOLUME_REQUESTS",
          reason:
            "Balance the competing requests by keeping the TV at a moderate volume.",
          actions: ["SET_MODERATE_TV_VOLUME"],
          status: "PLANNED"
        };
      }

      if (context.liveMatch) {
        return {
          eventId: event.id,
          decision: "PRESERVE_CURRENT_ACTIVITY",
          reason:
            "A live match is in progress, so avoid unnecessary interruptions.",
          actions: ["MINIMIZE_INTERRUPTION"],
          status: "PLANNED"
        };
      }

      return {
        eventId: event.id,
        decision: "RESOLVE_CONFLICT",
        reason:
          "No clear priority is configured, so ask household members to clarify their preferences.",
        actions: ["ASK_FOR_PREFERENCE"],
        status: "PLANNED"
      };
    }

    case "DEVICE_FAILURE":
      return {
        eventId: event.id,
        decision: "RECOVER_DEVICE_ACTION",
        reason: "A failed device action needs recovery handling.",
        actions: ["RETRY_OR_USE_FALLBACK"],
        status: "PLANNED"
      };

    case "SAFETY_EMERGENCY":
      
      return {
        eventId: event.id,
        decision: "SAFETY_ALERT",
        reason: "A possible safety emergency takes priority.",
        actions: ["PRIORITIZE_SAFETY"],
        status: "PLANNED"
      };
  }
}
