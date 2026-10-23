import { useEffect, useRef, useState } from "react";
import "./App.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
type CaregiverAlert = {
  caregiver: "PRIMARY" | "BACKUP";
  status: "NOTIFIED" | "ACKNOWLEDGED" | "TIMED_OUT";
  message: string;
};


type Emergency = {
  id: string;
  status:
    | "DETECTED"
    | "EVALUATING"
    | "AWAITING_RESPONSE"
    | "RESOLVED"
    | "ESCALATED"
    | "BACKUP_DISPATCH"
    | "CRITICAL_RECOVERY";
  confidence?: "LOW" | "AMBIGUOUS" | "HIGH";
  message: string;
  timeline: string[];
  caregiverAlerts: CaregiverAlert[];
};

type HouseholdEventType =
  | "DOORBELL"
  | "QUIET_HOURS"
  | "CONFLICTING_REQUEST"
  | "DEVICE_FAILURE"
  | "SAFETY_EMERGENCY";

type HouseholdHistoryEntry = {
  event: {
    id: string;
    type: HouseholdEventType;
    description: string;
    createdAt: string;
    context?: {
      liveMatch?: boolean;
      quietHours?: boolean;
      currentActivity?: string;
    };
  };
  decision: {
    decision: string;
    reason: string;
    actions: string[];
    status: string;
  };
  execution: {
    status: string;
    results: {
      action: string;
      status: string;
      message: string;
      usedFallback: boolean;
      attempts: {
        action: string;
        status: string;
        message: string;
      }[];
    }[];
  };
  recordedAt: string;
};


const API = "http://localhost:3003";

function App() {

  const [assistantMessage, setAssistantMessage] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantReply, setAssistantReply] = useState("");
const [isListening, setIsListening] = useState(false);
const [voiceMode, setVoiceMode] = useState(false);
const recognitionRef = useRef<any>(null);
const voiceModeRef = useRef(false);
const assistantLoadingRef = useRef(false);
const emergenciesRef = useRef<Emergency[]>([]);
const conversationActiveRef = useRef(false);
const conversationIdRef = useRef<string | null>(null);
const conversationTimeoutRef = useRef<number | null>(null);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

const [primaryName, setPrimaryName] = useState("");
const [primaryEmail, setPrimaryEmail] = useState("");
const [primaryPhone, setPrimaryPhone] = useState("");

const [backupName, setBackupName] = useState("");
const [backupEmail, setBackupEmail] = useState("");
const [backupPhone, setBackupPhone] = useState("");

const [settingsMessage, setSettingsMessage] = useState("");

const [householdType, setHouseholdType] =
  useState<HouseholdEventType>("DOORBELL");
const [householdDescription, setHouseholdDescription] =
  useState("Someone rang the doorbell.");
const [liveMatch, setLiveMatch] = useState(false);
const [quietHours, setQuietHours] = useState(false);
const [simulateFailure, setSimulateFailure] = useState(false);
const [householdHistory, setHouseholdHistory] =
  useState<HouseholdHistoryEntry[]>([]);
const [householdLoading, setHouseholdLoading] = useState(false);

useEffect(() => { emergenciesRef.current = emergencies; }, [emergencies]);
useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
useEffect(() => { assistantLoadingRef.current = assistantLoading; }, [assistantLoading]);

useEffect(() => {
  return () => {
    voiceModeRef.current = false;
    recognitionRef.current?.stop?.();
    window.speechSynthesis?.cancel?.();
    if (conversationTimeoutRef.current !== null) window.clearTimeout(conversationTimeoutRef.current);
  };
}, []);

function speakText(text: string) {
  if (!("speechSynthesis" in window)) {
    setError("Voice output is not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.onend = () => {
    if (voiceModeRef.current) {
      if (conversationTimeoutRef.current !== null) window.clearTimeout(conversationTimeoutRef.current);
      if (conversationActiveRef.current) {
        conversationTimeoutRef.current = window.setTimeout(() => {
          conversationActiveRef.current = false;
          setAssistantReply((current) => current ? `${current}\n\nSay “Hey NOVA” to start another conversation.` : current);
        }, 8000);
      }
      window.setTimeout(() => startRecognition(), 250);
    }
  };
  window.speechSynthesis.speak(utterance);
}

function startRecognition() {
  if (!voiceModeRef.current || assistantLoadingRef.current) return;
  const browserWindow = window as any;
  const SpeechRecognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setError("Voice input is not supported. Please use Chrome.");
    setVoiceMode(false);
    voiceModeRef.current = false;
    return;
  }
  if (recognitionRef.current) {
    try { recognitionRef.current.stop(); } catch {  }
  }

  const recognition = new SpeechRecognition();
  recognitionRef.current = recognition;
  recognition.lang = "en-IN";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => setIsListening(true);
  recognition.onresult = async (event: any) => {
    const transcript = String(event.results?.[0]?.[0]?.transcript ?? "").trim();
    if (!transcript) return;
    let spokenText = transcript;
    const normalized = transcript.toLowerCase().replace(/[.!?,]/g, "").trim();
   
   
    const safetyTriggerPattern =
      /\b(?:alexa\s+help|hey\s+nova\s+(?:help|i\s+fell|i(?:'|’)?ve\s+fallen|i\s+have\s+fallen)|i\s+fell|i(?:'|’)?ve\s+fallen|i\s+have\s+fallen|i\s+need\s+emergency\s+help|emergency\s+help)\b/i;

    if (safetyTriggerPattern.test(normalized)) {
      conversationActiveRef.current = true;

      if (conversationTimeoutRef.current !== null) {
        window.clearTimeout(conversationTimeoutRef.current);
      }

      try {
      
        const activeEmergency = emergenciesRef.current.find(
          (item) => item.status === "AWAITING_RESPONSE"
        );

        if (activeEmergency) {
          const reply =
            "There is already an emergency awaiting a response. Are you okay? Say I'm okay if you are safe, or tell me you need help.";

          setAssistantMessage("");
          setAssistantReply(reply);
          speakText(reply);
          return;
        }

        const response = await fetch(`${API}/emergencies`, {
          method: "POST",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not create the emergency.");
        }

        await loadEmergencies();

        const reply =
          "I heard a possible emergency. Are you okay? Nova has started the 60-second verification timer. This is a prototype and does not contact emergency services.";

        setAssistantMessage("");
        setAssistantReply(reply);
        speakText(reply);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "I could not start the emergency workflow.";

        setError(message);
        setAssistantReply(message);

        if (voiceModeRef.current) {
          speakText(message);
        }
      }

      return;
    }

    const wakeWordPattern = /\bhey\s+nova\b/i;
    if (!conversationActiveRef.current) {
      const wakeMatch = wakeWordPattern.exec(transcript);
      if (!wakeMatch) return; 
      conversationActiveRef.current = true;
      if (conversationTimeoutRef.current !== null) window.clearTimeout(conversationTimeoutRef.current);
      spokenText = transcript.slice(wakeMatch.index + wakeMatch[0].length).replace(/^[\s,.:;!-]+/, "").trim();
      if (!spokenText) {
        const prompt = "I'm listening. How can I help?";
        setAssistantMessage("");
        setAssistantReply(prompt);
        speakText(prompt);
        return;
      }
    } else {
      if (conversationTimeoutRef.current !== null) window.clearTimeout(conversationTimeoutRef.current);
    }

    const command = spokenText.toLowerCase().replace(/[.!?,]/g, "").trim();
    setAssistantMessage(spokenText);

    const activeEmergency = emergenciesRef.current.find(item => item.status === "AWAITING_RESPONSE");
    if (["i'm okay", "i am okay", "i'm ok", "i am ok", "im okay", "im ok"].includes(command)) {
      if (activeEmergency) {
        await respond(activeEmergency.id, "OKAY");
        const reply = "Your response was submitted. You are marked as okay.";
        setAssistantMessage("");
        setAssistantReply(reply);
        speakText(reply);
      } else {
        const reply = "There is no emergency currently waiting for your response.";
        setAssistantMessage("");
        setAssistantReply(reply);
        speakText(reply);
      }
      return;
    }
   
if (["i need help", "help me", "i need assistance"].includes(command)) {
  if (activeEmergency) {
    await respond(activeEmergency.id, "NO_RESPONSE");

    const reply =
      "I heard you need help. I am escalating this through the caregiver workflow.";

    setAssistantMessage("");
    setAssistantReply(reply);
    speakText(reply);
  } else {
    try {
      const response = await fetch(`${API}/emergencies`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not create an emergency.");
      }

      await loadEmergencies();

      const reply =
        "I heard you need help. A simulated emergency has been created, and the 60-second verification timer has started. Are you okay?";

      setAssistantMessage("");
      setAssistantReply(reply);
      speakText(reply);
    } catch (err) {
      const reply =
        err instanceof Error
          ? err.message
          : "Could not create the emergency.";

      setAssistantReply(reply);
      speakText(reply);
    }
  }

  return;
}

    await sendAssistantMessage(spokenText);
  };
  recognition.onerror = (event: any) => {
    setIsListening(false);
    if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
      setError("Microphone permission was denied. Allow microphone access in Chrome and enable voice mode again.");
      setVoiceMode(false);
      voiceModeRef.current = false;
    }
  };
  recognition.onend = () => {
    setIsListening(false);
    if (voiceModeRef.current && !assistantLoadingRef.current && !window.speechSynthesis?.speaking) {
      window.setTimeout(() => startRecognition(), 400);
    }
  };
  try { recognition.start(); } catch { }
}

function toggleVoiceMode() {
  if (voiceModeRef.current) {
    voiceModeRef.current = false;
    setVoiceMode(false);
    conversationActiveRef.current = false;
    if (conversationTimeoutRef.current !== null) window.clearTimeout(conversationTimeoutRef.current);
    recognitionRef.current?.stop?.();
    window.speechSynthesis?.cancel?.();
    setIsListening(false);
    setAssistantReply("Voice mode is off.");
    return;
  }
  setError("");
  voiceModeRef.current = true;
  conversationActiveRef.current = false;
  setVoiceMode(true);
  setAssistantReply("Voice mode is on. Say “Hey Nova” to start. After Nova replies, you can continue speaking for 8 seconds.");
  startRecognition();
}

async function sendAssistantMessage(messageOverride?: string) {
  const message = (messageOverride ?? assistantMessage).trim();
  if (!message || assistantLoadingRef.current) return;

  assistantLoadingRef.current = true;
  setAssistantLoading(true);
  setAssistantReply("");
  setError("");
  try {
    const response = await fetch(`${API}/assistant/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, ...(conversationIdRef.current ? { conversationId: conversationIdRef.current } : {}) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not process your request.");
    if (typeof data.conversationId === "string") conversationIdRef.current = data.conversationId;
    setAssistantReply(data.reply);
    setAssistantMessage("");
    speakText(data.reply);
    await loadHouseholdHistory();
  } catch (err) {
    const reply = err instanceof Error ? err.message : "Could not connect to the Nova assistant.";
    setAssistantReply(reply);
    if (voiceModeRef.current) speakText(reply);
  } finally {
    assistantLoadingRef.current = false;
    setAssistantLoading(false);
    if (voiceModeRef.current && !window.speechSynthesis?.speaking) {
      window.setTimeout(() => startRecognition(), 500);
    }
  }
}


async function loadHouseholdHistory() {
  try {
    const response = await fetch(`${API}/household/history`);
    if (!response.ok) throw new Error("Could not load household history.");

    const data: HouseholdHistoryEntry[] = await response.json();
    setHouseholdHistory(data);
  } catch {
    setError("Could not load household event history.");
  }
}

async function submitHouseholdEvent() {
  setHouseholdLoading(true);
  setError("");

  try {
    const response = await fetch(`${API}/household/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
  type: householdType,
  description: householdDescription,
  context: {
    liveMatch,
    quietHours,
    currentActivity: liveMatch
      ? "Watching a live match"
      : undefined
  },
  simulateFailure
})
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Could not submit household event.");
    }

    await loadHouseholdHistory();
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Could not submit household event."
    );
  } finally {
    setHouseholdLoading(false);
  }
}

  async function loadEmergencies() {
    try {
      const response = await fetch(`${API}/emergencies`);
      if (!response.ok) throw new Error("Could not load emergencies.");
      setEmergencies(await response.json());
      setError("");
    } catch {
      setError("Cannot connect to the backend. Check that it is running on port 3000.");
    }
  }

  async function createEmergency() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API}/emergencies`, { method: "POST" });
      if (!response.ok) throw new Error("Could not create an emergency.");
      await loadEmergencies();
    } catch {
      setError("Failed to create an emergency. Check the backend.");
    } finally {
      setLoading(false);
    }
  }

  async function respond(id: string, responseType: "OKAY" | "NO_RESPONSE") {
    try {
      const response = await fetch(`${API}/emergencies/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: responseType }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Response failed.");
      await loadEmergencies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit response.");
    }
  }

  async function acknowledge(id: string, caregiver: "PRIMARY" | "BACKUP") {
    try {
      const response = await fetch(`${API}/emergencies/${id}/caregiver-ack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caregiver }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Acknowledgement failed.");
      await loadEmergencies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not acknowledge alert.");
    }
  }

  useEffect(() => {
  void loadEmergencies();
  void loadHouseholdHistory();

 
  void (async () => {
    try {
      const response = await fetch(`${API}/caregiver-settings`);
      if (!response.ok) throw new Error("Could not load caregiver settings.");

      const data = await response.json();
      setPrimaryName(data.PRIMARY?.name ?? "");
      setPrimaryEmail(data.PRIMARY?.email ?? "");
      setPrimaryPhone(data.PRIMARY?.phone ?? "");
      setBackupName(data.BACKUP?.name ?? "");
      setBackupEmail(data.BACKUP?.email ?? "");
      setBackupPhone(data.BACKUP?.phone ?? "");
    } catch {
      setSettingsMessage("Could not load saved caregiver details. Check that the backend is running.");
    }
  })();

  const interval = window.setInterval(() => {
    void loadEmergencies();
    void loadHouseholdHistory();
  }, 2000);

  return () => window.clearInterval(interval);
}, []);

  const activeCount = emergencies.filter(
    (item) => item.status === "AWAITING_RESPONSE" || item.status === "ESCALATED"
  ).length;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">N</div>
          <div>
            <h1>Nova</h1>
            <p>ADAPTIVE GUARDIAN · HOUSEHOLD SAFETY</p>
          </div>
        </div>
        <div className="system-status"><span /> SYSTEM ONLINE</div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">EMERGENCY COORDINATION SYSTEM</p>
          <h2>Every second matters.</h2>
          <p className="subheading">
            Verify an incident, coordinate responses, and escalate when someone doesn't respond.
          </p>
        </div>
        <button className="primary-button" onClick={createEmergency} disabled={loading}>
          {loading ? "Creating..." : "+ Simulate emergency"}
        </button>
      </section>

      {error && <div className="error-banner">{error}</div>}

<section className="household-panel">
  <h2>Caregiver Settings</h2>
  <p>Configure who Nova should contact during an emergency.</p>

  <form
    onSubmit={async (e) => {
      e.preventDefault();
      setSettingsMessage("");

      try {
        const response = await fetch(`${API}/caregiver-settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  primary: {
    name: primaryName,
    email: primaryEmail,
    phone: primaryPhone,
  },
  backup: {
    name: backupName,
    email: backupEmail,
    phone: backupPhone,
  },
}),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Could not save caregiver settings.");
        }

        setSettingsMessage("Caregiver settings saved successfully!");
      } catch (err) {
        setSettingsMessage(
          err instanceof Error
            ? err.message
            : "Could not save caregiver settings. Check that the backend is running."
        );
      }
    }}
  >
    <h3>Primary Caregiver</h3>

    <label>
      Name
      <input
        value={primaryName}
        onChange={(e) => setPrimaryName(e.target.value)}
        placeholder="Primary caregiver name"
        required
      />
    </label>

    <label>
      Email
      <input
        type="email"
        value={primaryEmail}
        onChange={(e) => setPrimaryEmail(e.target.value)}
        placeholder="primary@example.com"
        required
      />
    </label>

    <label>
      Phone number
      <input
        type="tel"
        value={primaryPhone}
        onChange={(e) => setPrimaryPhone(e.target.value)}
        placeholder="+91..."
        required
      />
    </label>

    <h3>Backup Caregiver</h3>

    <label>
      Name
      <input
        value={backupName}
        onChange={(e) => setBackupName(e.target.value)}
        placeholder="Backup caregiver name"
        required
      />
    </label>

    <label>
      Email
      <input
        type="email"
        value={backupEmail}
        onChange={(e) => setBackupEmail(e.target.value)}
        placeholder="backup@example.com"
        required
      />
    </label>

    <label>
      Phone number
      <input
        type="tel"
        value={backupPhone}
        onChange={(e) => setBackupPhone(e.target.value)}
        placeholder="+91..."
        required
      />
    </label>

    <button type="submit">Save Caregiver Details</button>
  </form>

  {settingsMessage && <p role="status">{settingsMessage}</p>}
</section>

      <section className="stats">
        <div className="stat-card">
          <span>ALL INCIDENTS</span>
          <strong>{emergencies.length}</strong>
        </div>
        <div className="stat-card">
          <span>ACTIVE / ESCALATED</span>
          <strong>{activeCount}</strong>
        </div>
        <div className="stat-card">
          <span>RESOLVED</span>
          <strong>{emergencies.filter((item) => item.status === "RESOLVED").length}</strong>
        </div>
      </section>

<section className="household-panel assistant-panel">
  <h2>Nova Assistant</h2>
  <p>
    Start voice mode once, then say “Hey Nova” followed by your request. Nova will respond aloud and keep the conversation open briefly for follow-up questions. Keep the microphone indicator visible and use this prototype only for simulated tests.
  </p>

  <form
    onSubmit={(e) => {
      e.preventDefault();
      void sendAssistantMessage();
    }}
  >
    <label>
      Your message
      <textarea
        value={assistantMessage}
        onChange={(e) => setAssistantMessage(e.target.value)}
        placeholder="Say “Hey Nova, someone rang the doorbell while we’re watching a live match.”"
        rows={3}
      />
    </label>
       <button
  type="button"
  onClick={toggleVoiceMode}
  disabled={assistantLoading && !voiceMode}
  aria-pressed={voiceMode}
>
  {voiceMode ? (isListening ? "🎙️ Listening — Stop voice mode" : "⏳ Nova is responding — Stop voice mode") : "🎙️ Start hands-free voice mode"}
</button>
    <button
      type="submit"
      disabled={assistantLoading || !assistantMessage.trim()}
    >
      {assistantLoading ? "Thinking..." : "Ask Nova"}
    </button>
  </form>

 
{assistantReply && (
  <div className="assistant-reply">
    <h3>Nova Response</h3>
    <div className="assistant-response">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {assistantReply}
      </ReactMarkdown>
    </div>
  </div>
)}

</section>

<section className="household-panel">
  <h2>Household Coordination</h2>
  <p>Test how Nova handles everyday household events.</p>

  <label>
    Event type
    <select
      value={householdType}
      onChange={(e) =>
        setHouseholdType(e.target.value as HouseholdEventType)
      }
    >
      <option value="DOORBELL">Doorbell</option>
      <option value="QUIET_HOURS">Quiet hours</option>
      <option value="CONFLICTING_REQUEST">Conflicting requests</option>
      <option value="DEVICE_FAILURE">Device failure</option>
      <option value="SAFETY_EMERGENCY">Safety emergency</option>
    </select>
  </label>

  <label>
    Describe the event
    <input
      value={householdDescription}
      onChange={(e) => setHouseholdDescription(e.target.value)}
      placeholder="Doorbell rings during a live match"
    />
  </label>

  <label>
    <input
      type="checkbox"
      checked={liveMatch}
      onChange={(e) => setLiveMatch(e.target.checked)}
    />
    Family is watching a live match
  </label>

  <label>
    <input
      type="checkbox"
      checked={quietHours}
      onChange={(e) => setQuietHours(e.target.checked)}
    />
    Quiet hours are active
  </label>

<label>
  <input
    type="checkbox"
    checked={simulateFailure}
    onChange={(e) => setSimulateFailure(e.target.checked)}
  />
  Simulate action failure (test recovery)
</label>

  <button
    onClick={submitHouseholdEvent}
    disabled={householdLoading || !householdDescription.trim()}
  >
    {householdLoading ? "Processing..." : "Process Household Event"}
  </button>

  <h3>Event History</h3>

  {householdHistory.length === 0 ? (
    <p>No household events yet. Submit an event to test Nova.</p>
  ) : (
    [...householdHistory].reverse().map((entry) => (
      <article key={entry.event.id} className="household-event">
        <h4>{entry.event.description}</h4>
        <p>
          <strong>Decision:</strong> {entry.decision.decision}
        </p>
        <p>
          <strong>Reason:</strong> {entry.decision.reason}
        </p>
        <p>
          <strong>Execution:</strong> {entry.execution.status}
        </p>

        {entry.execution.results.map((result, index) => (
          <div key={`${entry.event.id}-${index}`}>
            <p>
              <strong>Action:</strong> {result.action}
            </p>
            <p>{result.message}</p>

            {result.attempts.map((attempt, attemptIndex) => (
              <p key={`${entry.event.id}-${index}-${attemptIndex}`}>
                {attempt.action}: {attempt.status}
              </p>
            ))}
          </div>
        ))}
      </article>
    ))
  )}
</section>

      <section className="incident-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">LIVE MONITOR</p>
            <h2>Incident timeline</h2>
          </div>
          <span className="refresh-label">Updates every 2 seconds</span>
        </div>

        {emergencies.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <h3>All quiet for now</h3>
            <p>Simulate an incident to see Nova coordinate its response.</p>
          </div>
        ) : (
          <div className="incident-list">
           {[...emergencies].slice(-3).reverse().map((event) => (
              <article className="incident-card" key={event.id}>
                <div className="incident-top">
                  <div>
                    <span className={`status status-${event.status.toLowerCase()}`}>
                      {event.status.replaceAll("_", " ")}
                    </span>
                    {event.confidence && (
  <p className="event-id">
    Confidence: {event.confidence}
  </p>
)}
                   
                  </div>
                  {event.status === "AWAITING_RESPONSE" && (
                    <div className="action-buttons">
                      <button className="safe-button" onClick={() => respond(event.id, "OKAY")}>
                        I'm OK
                      </button>
                      <button className="secondary-button" onClick={() => respond(event.id, "NO_RESPONSE")}>
                        Escalate
                      </button>
                    </div>
                  )}
                </div>

                {event.caregiverAlerts.length > 0 && (
                  <div className="caregiver-list">
                    {event.caregiverAlerts.map((alert, index) => (
                      <div className="caregiver-row" key={`${alert.caregiver}-${index}`}>
                        <div>
                          <strong>{alert.caregiver} CAREGIVER</strong>
                          <p>{alert.message}</p>
                        </div>
                        <div className="caregiver-action">
                          <span className={`caregiver-status caregiver-${alert.status.toLowerCase()}`}>
                            {alert.status.replaceAll("_", " ")}
                          </span>
                          {alert.status === "NOTIFIED" && (
                            <button
                              className="ack-button"
                              onClick={() => acknowledge(event.id, alert.caregiver)}
                            >
                              Acknowledge
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="timeline">
                  <h4>EVENT HISTORY</h4>
                  {event.timeline.map((entry, index) => (
                    <div className="timeline-entry" key={`${event.id}-${index}`}>
                      <span className="timeline-dot" />
                      <p>{entry}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer>
       Nova prototype · Sensor events are simulated. Email delivery depends on the configured mail service.
      </footer>
    </main>
  );
}

export default App;