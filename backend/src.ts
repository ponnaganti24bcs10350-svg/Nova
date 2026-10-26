

import express from "express";
import { registerAssistantRoutes } from "./assistant.ts";
import {
  evaluateHouseholdEvent,
  type HouseholdEvent,
  type HouseholdEventType
} from "./coordinate.ts";
import { sendCaregiverEmail } from "./email.ts";
import { executeAction } from "./actionExecutor.ts";
import "dotenv/config";
import { sendWhatsApp } from "./whatsapp.ts";
import {
  createEmergency,
  respondToEmergency,
  acknowledgePrimaryCaregiver,
  acknowledgeBackupCaregiver
} from "./emergency.ts";

const app = express();
const PORT = Number(process.env.PORT ?? 3003);
const RESPONSE_TIMEOUT_MS = 60_000;
const CAREGIVER_TIMEOUT_MS = 60_000;

app.use(express.json());

app.use((req, res, next) => {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "https://nova-7ujl.vercel.app",
    "https://nova-eight-silk.vercel.app",
  ];

  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }

  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );

  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

registerAssistantRoutes(app);



type CaregiverStatus =
  | "NOTIFIED"
  | "ACKNOWLEDGED"
  | "TIMED_OUT"
  | "NO_RESPONSE";

type CaregiverAlert = {
  caregiver: "PRIMARY" | "BACKUP";
  status: CaregiverStatus;
  message: string;
};

type Emergency = ReturnType<typeof createEmergency> & {
  caregiverAlerts: CaregiverAlert[];
};

const emergencies = new Map<string, Emergency>();

type CaregiverContact = {
  name: string;
  email: string;
  phone: string;
};

type CaregiverSettings = {
  PRIMARY: CaregiverContact;
  BACKUP: CaregiverContact;
};

let caregiverSettings: CaregiverSettings = {
  PRIMARY: {
    name: "Primary Caregiver",
    email: process.env.PRIMARY_CAREGIVER_EMAIL ?? "",
    phone: process.env.PRIMARY_CAREGIVER_WHATSAPP ?? ""
  },
  BACKUP: {
    name: "Backup Caregiver",
    email: process.env.BACKUP_CAREGIVER_EMAIL ?? "",
    phone: process.env.BACKUP_CAREGIVER_WHATSAPP ?? ""
  }
};

const timeoutHandles = new Map<string, ReturnType<typeof setTimeout>>();

type HouseholdHistoryEntry = {
  event: HouseholdEvent;
  decision: ReturnType<typeof evaluateHouseholdEvent>;
  execution: {
    status: "COMPLETED" | "FAILED";
    results: ReturnType<typeof executeAction>[];
  };
  recordedAt: string;
};

const householdHistory: HouseholdHistoryEntry[] = [];

function addTimeline(emergency: Emergency, message: string) {
  emergency.timeline.push(message);
}

async function sendCaregiverWhatsApp(
  emergency: Emergency,
  caregiver: "PRIMARY" | "BACKUP",
  to: string | undefined,
  message: string
): Promise<void> {
  try {
    const result = await sendWhatsApp(to, message);
    const currentEmergency = emergencies.get(emergency.id) ?? emergency;

    if (result.sent) {
      addTimeline(
        currentEmergency,
        `${caregiver} caregiver WhatsApp message submitted to Twilio; delivery is not yet confirmed.`
      );
      console.log(`${caregiver} caregiver WhatsApp message submitted: ${emergency.id}`);
    } else {
      addTimeline(
        currentEmergency,
        `${caregiver} caregiver WhatsApp attempt failed: ${result.reason}.`
      );
      console.error(`${caregiver} caregiver WhatsApp attempt failed:`, result.reason);
    }
  } catch (error) {
    const currentEmergency = emergencies.get(emergency.id) ?? emergency;
    const detail = error instanceof Error ? error.message : String(error);
    addTimeline(
      currentEmergency,
      `${caregiver} caregiver WhatsApp attempt failed unexpectedly: ${detail}.`
    );
    console.error(`${caregiver} caregiver WhatsApp error:`, detail);
  }
}

async function sendCaregiverEmailAlert(
  emergency: Emergency,
  caregiver: "PRIMARY" | "BACKUP",
  subject: string,
  message: string
): Promise<void> {
  try {
  const recipient =
  caregiverSettings[caregiver].email;

const result = await sendCaregiverEmail(
  caregiver,
  subject,
  message,
  recipient
);
    const currentEmergency = emergencies.get(emergency.id) ?? emergency;

    if (result.sent) {
      addTimeline(
        currentEmergency,
        `${caregiver} caregiver email accepted by Resend; delivery is not yet confirmed.`
      );
      console.log(`${caregiver} caregiver email accepted: ${emergency.id}`);
    } else {
      addTimeline(
        currentEmergency,
        `${caregiver} caregiver email failed: ${result.reason}.`
      );
      console.error(`${caregiver} caregiver email failed:`, result.reason);
    }
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : String(error);

    addTimeline(
      emergencies.get(emergency.id) ?? emergency,
      `${caregiver} caregiver email failed unexpectedly: ${detail}.`
    );
    console.error(`${caregiver} caregiver email error:`, detail);
  }
}

function notifyPrimary(emergency: Emergency) {
  emergency.caregiverAlerts.push({
    caregiver: "PRIMARY",
    status: "NOTIFIED",
    message: "Primary caregiver WhatsApp alert initiated."
  });

  addTimeline(emergency, "Primary caregiver notification requested.");
  console.log(`Primary caregiver alert: ${emergency.id}`);

  
  void sendCaregiverWhatsApp(
    emergency,
    "PRIMARY",
   caregiverSettings.PRIMARY.phone,
    `Nova EMERGENCY ALERT\n\nIncident ID: ${emergency.id}\nStatus: ${emergency.status}\n\nA possible emergency needs attention. Please check on the person and acknowledge the alert through the Nova caregiver workflow.`
  );

void sendCaregiverEmailAlert(
  emergency,
  "PRIMARY",
  "Nova Emergency Alert — Primary Caregiver",
  `Incident ID: ${emergency.id}
Status: ${emergency.status}

A possible emergency needs attention. Please check on the person and acknowledge the alert through the Nova caregiver workflow.`
);

  const timer = setTimeout(() => {
    const alert = emergency.caregiverAlerts.find(
      (item) => item.caregiver === "PRIMARY"
    );

    if (alert?.status !== "ACKNOWLEDGED") {
      if (alert) alert.status = "TIMED_OUT";

      addTimeline(
        emergency,
        "Primary caregiver did not acknowledge the alert."
      );

      notifyBackup(emergency);
    }

    timeoutHandles.delete(`${emergency.id}:caregiver`);
  }, CAREGIVER_TIMEOUT_MS);

  timeoutHandles.set(`${emergency.id}:caregiver`, timer);
}


function notifyBackup(emergency: Emergency) {
  emergency.status = "BACKUP_DISPATCH";
  emergency.message = "Backup caregiver notification initiated.";

  emergency.caregiverAlerts.push({
    caregiver: "BACKUP",
    status: "NOTIFIED",
    message: "Backup caregiver WhatsApp alert initiated."
  });

  addTimeline(
    emergency,
    "Backup caregiver notification requested."
  );

  console.log(`Backup caregiver alert: ${emergency.id}`);

  // Send the full backup alert without blocking the escalation timer.
  void sendCaregiverWhatsApp(
    emergency,
    "BACKUP",
   caregiverSettings.BACKUP.phone,
    `Nova URGENT ALERT\n\nIncident ID: ${emergency.id}\nStatus: ${emergency.status}\n\nThe primary caregiver did not acknowledge the emergency. Please check on the person and acknowledge the alert through the Nova caregiver workflow.`
  );

void sendCaregiverEmailAlert(
  emergency,
  "BACKUP",
  "Nova Urgent Alert — Backup Caregiver",
  `Incident ID: ${emergency.id}
Status: ${emergency.status}

The primary caregiver did not acknowledge the emergency. Please check on the person and acknowledge the alert through the Nova caregiver workflow.`
);

  const timer = setTimeout(() => {
    const currentEmergency = emergencies.get(emergency.id);

    if (
      !currentEmergency ||
      currentEmergency.status !== "BACKUP_DISPATCH"
    ) {
      return;
    }

    const backupAlert = currentEmergency.caregiverAlerts.find(
      (alert) => alert.caregiver === "BACKUP"
    );

    if (!backupAlert || backupAlert.status !== "NOTIFIED") {
      return;
    }

    backupAlert.status = "NO_RESPONSE";
    backupAlert.message =
      "Backup caregiver did not acknowledge the alert.";

    currentEmergency.status = "UNACKNOWLEDGED";
    currentEmergency.message =
      "No response received from the person or either caregiver.";

    addTimeline(
      currentEmergency,
      "Backup caregiver did not acknowledge the alert within 30 seconds."
    );

    addTimeline(
      currentEmergency,
      "Escalation completed without acknowledgment."
    );

    timeoutHandles.delete(`${emergency.id}:backup`);

    console.log(`No caregiver response: ${emergency.id}`);
  }, 30_000);

  timeoutHandles.set(`${emergency.id}:backup`, timer);
}

function escalateEmergency(emergency: Emergency) {
  if (emergency.status !== "AWAITING_RESPONSE") return;

  respondToEmergency(emergency, "NO_RESPONSE");
  addTimeline(emergency, "Automatic timeout reached.");
  notifyPrimary(emergency);
}

app.get("/", (_req, res) => {
  res.json({ name: "Nova - Adaptive Guardian", status: "running" });
});

app.get("/health", (_req, res) => {
  res.json({ healthy: true });
});

app.get("/caregiver-settings", (_req, res) => {
  res.json(caregiverSettings);
});

app.put("/caregiver-settings", (req, res) => {
  const { primary, backup } = req.body ?? {};

  const isValidContact = (contact: any) =>
    contact &&
    typeof contact.name === "string" &&
    contact.name.trim() &&
    typeof contact.email === "string" &&
   /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) &&
    typeof contact.phone === "string" &&
    contact.phone.trim();

  if (!isValidContact(primary) || !isValidContact(backup)) {
    return res.status(400).json({
      error: "Provide a name, valid email, and phone number for both caregivers."
    });
  }

  caregiverSettings = {
    PRIMARY: {
      name: primary.name.trim(),
      email: primary.email.trim(),
      phone: primary.phone.trim()
    },
    BACKUP: {
      name: backup.name.trim(),
      email: backup.email.trim(),
      phone: backup.phone.trim()
    }
  };

  return res.json({
    ok: true,
    message: "Caregiver settings saved."
  });
});

app.post("/emergencies", (_req, res) => {
  const base = createEmergency();

  const emergency: Emergency = {
    ...base,
    caregiverAlerts: []
  };

  emergencies.set(emergency.id, emergency);

  const timer = setTimeout(() => {
    escalateEmergency(emergency);
    timeoutHandles.delete(emergency.id);
  }, RESPONSE_TIMEOUT_MS);

  timeoutHandles.set(emergency.id, timer);

  res.status(201).json({
    ...emergency,
    timeoutSeconds: RESPONSE_TIMEOUT_MS / 1000
  });
});

app.get("/emergencies", (_req, res) => {
  res.json(Array.from(emergencies.values()));
});

app.get("/emergencies/:id", (req, res) => {
  const emergency = emergencies.get(req.params.id);

  if (!emergency) {
    return res.status(404).json({ error: "Emergency not found." });
  }

  return res.json(emergency);
});

app.post("/emergencies/:id/respond", (req, res) => {
  const emergency = emergencies.get(req.params.id);

  if (!emergency) {
    return res.status(404).json({ error: "Emergency not found." });
  }

  const response = req.body.response;

  if (response !== "OKAY" && response !== "NO_RESPONSE") {
    return res.status(400).json({
      error: 'response must be "OKAY" or "NO_RESPONSE".'
    });
  }

  try {
    const updated = respondToEmergency(emergency, response);

    const timer = timeoutHandles.get(emergency.id);
    if (timer) clearTimeout(timer);
    timeoutHandles.delete(emergency.id);

    if (response === "NO_RESPONSE") {
      notifyPrimary(emergency);
    }

    return res.json(updated);
  } catch (error) {
    return res.status(409).json({
      error: error instanceof Error ? error.message : "Invalid state."
    });
  }
});


app.post("/emergencies/:id/caregiver-ack", (req, res) => {
  const emergency = emergencies.get(req.params.id);

  if (!emergency) {
    return res.status(404).json({ error: "Emergency not found." });
  }

  const caregiver = req.body.caregiver;

  if (caregiver !== "PRIMARY" && caregiver !== "BACKUP") {
    return res.status(400).json({
      error: 'caregiver must be "PRIMARY" or "BACKUP".'
    });
  }

  const alert = emergency.caregiverAlerts.find(
    (item) =>
      item.caregiver === caregiver &&
      item.status === "NOTIFIED"
  );

  if (!alert) {
    return res.status(409).json({
      error: "No pending alert exists for this caregiver."
    });
  }

  try {
    if (caregiver === "PRIMARY") {
      acknowledgePrimaryCaregiver(emergency);
    } else {
      acknowledgeBackupCaregiver(emergency);
    }

    alert.status = "ACKNOWLEDGED";
    addTimeline(
      emergency,
      `${caregiver} caregiver acknowledged the alert.`
    );

   const timerKey = `${emergency.id}:${caregiver.toLowerCase() === "primary" ? "caregiver" : "backup"}`;
const timer = timeoutHandles.get(timerKey);

if (timer) clearTimeout(timer);

timeoutHandles.delete(timerKey);

    return res.json(emergency);
  } catch (error) {
    return res.status(409).json({
      error: error instanceof Error ? error.message : "Invalid state."
    });
  }
});


app.post("/household/events", (req, res) => {
  const { type, description } = req.body as {
    type?: HouseholdEventType;
    description?: string;
  };

  const validTypes: HouseholdEventType[] = [
  "DOORBELL",
  "QUIET_HOURS",
  "CONFLICTING_REQUEST",
  "DEVICE_FAILURE",
  "SAFETY_EMERGENCY"
];

  if (!type || !validTypes.includes(type)) {
    return res.status(400).json({
      error: "Invalid household event type."
    });
  }

  if (typeof description !== "string" || !description.trim()) {
    return res.status(400).json({
      error: "A description is required."
    });
  }

 
const { context } = req.body as {
  context?: HouseholdEvent["context"];
};

const event: HouseholdEvent = {
  id: crypto.randomUUID(),
  type,
  description: description.trim(),
  createdAt: new Date().toISOString(),
  context
};


  

const lowerDescription = event.description.toLowerCase();

const isSafetyEmergency =
  lowerDescription.includes("smoke alarm") ||
  lowerDescription.includes("fire alarm") ||
  lowerDescription.includes("gas leak") ||
  lowerDescription.includes("carbon monoxide") ||
  lowerDescription.includes("someone is injured") ||
  lowerDescription.includes("someone has collapsed");

const normalDecision = evaluateHouseholdEvent(event);

const decision = isSafetyEmergency
  ? {
      ...normalDecision,
      decision: "SAFETY_ALERT",
      reason:
        "A possible safety emergency takes priority over ordinary household activities.",
      actions: ["PRIORITIZE_SAFETY"],
    }
  : normalDecision;



const simulateFailure = req.body.simulateFailure === true;

const results = decision.actions.map((action) =>
  executeAction(action, simulateFailure)
);

const finalStatus = results.every(
  (result) => result.status === "COMPLETED"
)
  ? "COMPLETED"
  : "FAILED";


const execution: HouseholdHistoryEntry["execution"] = {
  status: finalStatus,
  results
};

householdHistory.push({
  event,
  decision,
  execution,
  recordedAt: new Date().toISOString()
});

return res.status(201).json({
  event,
  decision,
  execution
});


});

app.get("/household/history", (_req, res) => {
  res.json(householdHistory);
});

app.post("/test-email", async (_req, res) => {
  const recipient = caregiverSettings.PRIMARY.email;

  const result = await sendCaregiverEmail(
    "PRIMARY",
    "Nova Test Email",
    "This is a test email from Nova. No emergency has been detected.",
    recipient
  );

  if (!result.sent) {
    return res.status(502).json({
      ok: false,
      recipient,
      reason: result.reason,
      details: "details" in result ? result.details : undefined,
    });
  }

  return res.json({
    ok: true,
    recipient,
    messageId: result.emailId,
    message: "Gmail SMTP accepted the email for the configured primary caregiver.",
  });
});

app.post("/test-whatsapp", async (_req, res) => {
  try {
    const result = await sendWhatsApp(
      process.env.PRIMARY_CAREGIVER_WHATSAPP,
      "Nova TEST ALERT\n\nThis is a test message from the Nova backend. No emergency has been detected."
    );

    if (!result.sent) {
      return res.status(502).json({
        ok: false,
        message: "Twilio did not accept the WhatsApp message.",
        reason: result.reason
      });
    }

    return res.json({
      ok: true,
      message: "Twilio accepted the WhatsApp message; recipient delivery is not yet confirmed."
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("WhatsApp test route failed:", detail);
    return res.status(500).json({ ok: false, error: detail });
  }
});
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Nova backend running on port ${PORT}`);
});
