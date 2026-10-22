

export type EmergencyStatus =
  | "DETECTED"
  | "EVALUATING"
  | "AWAITING_RESPONSE"
  | "RESOLVED"
  | "ESCALATED"
  | "BACKUP_DISPATCH"
  | "CRITICAL_RECOVERY"
  | "UNACKNOWLEDGED";


export type ConfidenceLevel = "LOW" | "AMBIGUOUS" | "HIGH";

export type EmergencyEvent = {
  id: string;
  status: EmergencyStatus;
  confidence: ConfidenceLevel;
  message: string;
  timeline: string[];
};

export function createEmergency(
  confidence: ConfidenceLevel = "AMBIGUOUS"
): EmergencyEvent {
  const event: EmergencyEvent = {
    id: crypto.randomUUID(),
    status: "DETECTED",
    confidence,
    message: "Possible safety event detected.",
    timeline: ["Possible safety event detected."]
  };

  transitionTo(event, "EVALUATING", "Evaluating event confidence.");

  if (confidence === "HIGH") {
    transitionTo(
      event,
      "ESCALATED",
      "High-confidence event. Caregiver escalation required."
    );
  } else {
    transitionTo(
      event,
      "AWAITING_RESPONSE",
      "Waiting for the person to confirm they are okay."
    );
  }

  return event;
}

function transitionTo(
  event: EmergencyEvent,
  status: EmergencyStatus,
  message: string
): void {
  event.status = status;
  event.message = message;
  event.timeline.push(message);
}

export function respondToEmergency(
  event: EmergencyEvent,
  response: "OKAY" | "NO_RESPONSE"
): EmergencyEvent {
  if (event.status !== "AWAITING_RESPONSE") {
    throw new Error("This emergency is no longer awaiting a response.");
  }

  if (response === "OKAY") {
    transitionTo(
      event,
      "RESOLVED",
      "Person confirmed they are okay. Incident resolved."
    );
  } else {
    transitionTo(
      event,
      "ESCALATED",
      "No response. Caregiver escalation required."
    );
  }

  return event;
}

export function acknowledgePrimaryCaregiver(
  event: EmergencyEvent
): EmergencyEvent {
  if (event.status !== "ESCALATED") {
    throw new Error("Incident is not awaiting primary caregiver handling.");
  }

  transitionTo(
    event,
    "RESOLVED",
    "Primary caregiver acknowledged the incident."
  );

  return event;
}

export function dispatchBackupCaregiver(
  event: EmergencyEvent
): EmergencyEvent {
  if (event.status !== "ESCALATED") {
    throw new Error("Backup dispatch requires an escalated incident.");
  }

  transitionTo(
    event,
    "BACKUP_DISPATCH",
    "Primary caregiver did not acknowledge. Backup caregiver notified (simulated)."
  );

  return event;
}

export function acknowledgeBackupCaregiver(
  event: EmergencyEvent
): EmergencyEvent {
  if (event.status !== "BACKUP_DISPATCH") {
    throw new Error("Backup caregiver has not been notified.");
  }

  transitionTo(
    event,
    "RESOLVED",
    "Backup caregiver acknowledged the incident."
  );

  return event;
}

export function recoverFromFailure(
  event: EmergencyEvent
): EmergencyEvent {
  transitionTo(
    event,
    "CRITICAL_RECOVERY",
    "A failure was detected. Entering recovery mode."
  );

  return event;
}
