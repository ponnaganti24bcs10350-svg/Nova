# 🌌 NOVA — Intelligent Household Coordination Engine

<h3 align="center">🏠 One Intelligent Agent. An Entire Household. Smarter Decisions.</h3>

<p align="center">
  <strong>Context-Aware AI • Household Intelligence • MCP-Powered Coordination</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/AI-Powered-8A2BE2?style=for-the-badge" alt="AI Powered"/>
  <img src="https://img.shields.io/badge/Platform-Smart_Home-0EA5E9?style=for-the-badge" alt="Smart Home"/>
  <img src="https://img.shields.io/badge/Protocol-MCP-FF9900?style=for-the-badge" alt="MCP"/>
  <img src="https://img.shields.io/badge/Hackathon-Alexa%2B-232F3E?style=for-the-badge" alt="Alexa Plus"/>
</p>

---

## ✨ What Is NOVA?

**NOVA is an AI-powered household intelligence and coordination platform** designed to help manage everyday activities, connected-device events, competing priorities, interruptions, and safety situations through a unified, context-aware agent.

Built for the **Amazon Developer Hackathon — Alexa+ Track**, NOVA explores how AI agents and the Model Context Protocol (MCP) can move beyond executing isolated commands toward coordinating entire household workflows.

Imagine watching a live football match when someone rings the doorbell. Your household assistant should understand that the match matters, recognize the new event, and choose an appropriate way to notify you.

Now imagine quiet hours, conflicting household requests, a device failure, or a potential emergency. Each situation requires a different response.

> 💡 **Our vision:** A household agent that understands context, prioritizes events, coordinates actions, and adapts its response to the situation.

---

## 🎯 The Problem We're Solving

Today's smart-home experiences often revolve around individual commands: turn on a light, announce a notification, or execute an automation.

But a real household is full of overlapping activities, changing priorities, competing requests, and unexpected events.

- 🔔 A doorbell rings during an important live match.
- 🌙 A routine notification arrives during quiet hours.
- ⚡ Two household requests compete for the same device.
- 🔌 A smart-home action fails during execution.
- 🚨 A potential emergency requires a response rather than another passive notification.

A system that treats every event independently can create unnecessary interruptions or fail to coordinate competing actions.

**NOVA explores a smarter approach: understand the context, evaluate priorities, coordinate actions, and track outcomes.**

---

## 🚀 Core Capabilities

<table>
<tr>
<td width="50%">

### 🧠 Context-Aware Coordination

Evaluate household events and select actions according to context and application-defined policies.

</td>
<td width="50%">

### ⚖️ Intelligent Prioritization

Distinguish routine events from time-sensitive or safety-related events.

</td>
</tr>
<tr>
<td width="50%">

### 🔀 Conflict Handling

Identify competing requests and coordinate them according to defined decision logic.

</td>
<td width="50%">

### 🔄 Action Execution & Recovery

Track action outcomes and handle configured failures or fallback paths.

</td>
</tr>
<tr>
<td width="50%">

### 🚨 Emergency Management

Track emergency states, process responses, and initiate configured caregiver escalation.

</td>
<td width="50%">

### 🔌 MCP-Powered Tools

Expose structured application actions through the Model Context Protocol.

</td>
</tr>
<tr>
<td width="50%">

### 💬 AI Assistant

Interact with NOVA through its conversational assistant and supported voice interface.

</td>
<td width="50%">

### 📋 Event History

Inspect relevant events and emergency state changes for monitoring and troubleshooting.

</td>
</tr>
</table>

---

## 🏡 NOVA in Real Life

### ⚽ 1. Entertainment-Aware Notifications

**Scenario:** You're watching a live football match when the doorbell rings.

Instead of interrupting you with a long announcement, a context-aware household workflow could choose a brief notification.

**Goal:** Keep you informed without unnecessarily disrupting your activity.

### 🌙 2. Quiet-Hours Management

**Scenario:** It's late at night, and a routine household notification arrives.

NOVA can evaluate the event against configured quiet-hours policies and choose an appropriate notification behavior, where supported.

Routine updates and urgent safety events should not necessarily receive the same treatment.

### 🔀 3. Conflicting Household Requests

**Scenario:** Two requests compete for a shared device or incompatible actions.

NOVA explores how a coordination engine can identify the conflict, evaluate the applicable policies, and select or recommend a suitable resolution.

**Goal:** Coordinate actions rather than blindly execute every command.

### 🔌 4. Device Failure and Recovery

**Scenario:** A household action fails during execution.

NOVA's action-execution workflow can track the result and follow configured failure-handling behavior.

**Goal:** Make failures visible and support recovery instead of silently treating an unsuccessful action as complete.

### 🚨 5. Emergency and Caregiver Coordination

**Scenario:** A possible fall is reported, but the person does not respond.

NOVA can track the emergency, wait for a response, and initiate primary caregiver escalation when the configured response window expires. If the primary caregiver does not acknowledge within the next configured window, the workflow can escalate to a backup caregiver.

**Goal:** Track the response process instead of treating an alert as the final step.

### 🔥 6. Event Prioritization

**Scenario:** A routine household event and a high-priority safety event happen close together.

NOVA explores how policy-based coordination can prioritize events according to their context and importance.

**Goal:** Minimize unnecessary interruptions without suppressing critical events.

---

## 🧠 Why MCP?

The **Model Context Protocol (MCP)** provides a structured way for AI applications to discover and invoke tools.

NOVA uses MCP as an interface to application capabilities rather than relying exclusively on free-form text generation.

### 🛠️ Implemented Tool Names

| Tool | Purpose |
|---|---|
| `create_emergency` | 🚨 Create an emergency event |
| `list_emergencies` | 📋 Retrieve the available emergency list |
| `get_emergency` | 🔎 Retrieve details for a specific emergency |
| `respond_to_emergency` | ✅ Record a person's response |
| `acknowledge_caregiver` | 👥 Record caregiver acknowledgment |
| `coordinate_household_event` | 🏠 Coordinate a household event |

These tools provide structured application actions that compatible agents and MCP clients can invoke.

> 🔎 **Protocol note:** Tool availability alone does not prove compatibility with every MCP client or Alexa+ runtime. The actual transport, specification version, and target-platform integration must be validated separately.

---

## 🔄 How NOVA Works

```text
       👤 USER / VOICE INPUT
                 |
                 v
         💬 NOVA AI ASSISTANT
                 |
                 v
       🧠 COORDINATION ENGINE
                 |
       +---------+---------+
       |         |         |
       v         v         v
    🏠 Events  🚨 Safety  ⚙️ Actions
       |         |         |
       +---------+---------+
                 |
                 v
            🔌 MCP SERVER
                 |
                 v
        🛠️ STRUCTURED TOOLS
                 |
                 v
       📊 RESULTS & STATE UPDATES
```

The architecture separates conversational interaction from application actions, allowing supported workflows to be managed through explicit backend logic.

### 🚪 Example: A Doorbell During a Match

1. 🔔 **Event received** — A doorbell event enters the coordination workflow.
2. 🧠 **Context evaluated** — The workflow considers the event type and relevant household context.
3. ⚖️ **Action selected** — The coordination logic chooses an appropriate response.
4. ⚙️ **Action executed** — The application attempts the supported notification or coordination action.
5. 📊 **Outcome handled** — The result can be inspected, with configured failure handling where available.

The same coordination approach can be applied to quiet hours, competing requests, device failures, and safety events, with policies appropriate to each scenario.

---

## 🚨 Emergency Escalation Workflow

```text
       🚨 POSSIBLE EMERGENCY
                 |
                 v
       ⏳ AWAITING RESPONSE
                 |
          +------+------+
          |             |
          v             v
     ✅ Responded    ⏰ Timeout
          |             |
          v             v
       RESOLVED    👥 PRIMARY CAREGIVER
                        |
                 +------+------+
                 |             |
                 v             v
            Acknowledged   No Response
                 |             |
                 v             v
             Update State  🆘 BACKUP CAREGIVER
```

The escalation sequence depends on configured response windows and the implemented workflow.

NOVA is a prototype: simulated emergency scenarios do not establish real-world fall detection, and notification attempts do not guarantee delivery or caregiver response.

---

## 🏗️ Technology Stack

<p>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" alt="Express"/>
  <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/MCP-Model_Context_Protocol-FF9900?style=flat-square" alt="MCP"/>
  <img src="https://img.shields.io/badge/Groq-AI_Assistant-F55036?style=flat-square" alt="Groq"/>
  <img src="https://img.shields.io/badge/Resend-Email_API-000000?style=flat-square" alt="Resend"/>
  <img src="https://img.shields.io/badge/Render-Deployment-46E3B7?style=flat-square" alt="Render"/>
  <img src="https://img.shields.io/badge/Vercel-Deployment-000000?style=flat-square" alt="Vercel"/>
</p>

| Technology | Role |
|---|---|
| TypeScript | Typed application and backend logic |
| Node.js | Backend runtime |
| Express | HTTP API |
| MCP | Structured tool interface |
| React | Frontend interface |
| Vite | Frontend development and build tooling |
| Groq integration | AI assistant responses |
| Resend | Email API integration |
| Render | Backend hosting |
| Vercel | Frontend hosting |

---

## 🌐 Project Links

| Resource | Link |
|---|---|
| 🖥️ Live Frontend | [Open NOVA](https://nova-7ujl.vercel.app) |
| ⚙️ Backend | [NOVA Backend](https://nova-1-q4n0.onrender.com) |
| 💻 GitHub Repository | [View Source Code](https://github.com/ponnaganti24bcs10350-svg/Nova) |
| 🎬 Demo Video | To be added |

---

## 🎬 Demo Showcase

The project demonstration should highlight NOVA's broader household intelligence capabilities.

- 💬 Conversational interaction with the assistant.
- 🏠 A household event and its coordination decision.
- ⚖️ An example of prioritization or conflict handling.
- 🔄 Action execution and failure handling, where supported.
- 🚨 Emergency creation, response, and caregiver escalation.
- 🔌 MCP tool execution and resulting application state.

**The goal:** Show NOVA as a multi-purpose household coordination platform, not just an emergency notification application.

---

## 🧪 Testing & Validation

The backend has been exercised using HTTP requests and simulated workflows, including emergency creation, response handling, caregiver acknowledgment, and household coordination.

Important scenarios to validate include:

- [ ] Household event coordination.
- [ ] Conflicting-event decision handling.
- [ ] Action failure and configured fallback behavior.
- [ ] Emergency creation and resolution.
- [ ] Timeout-driven caregiver escalation.
- [ ] MCP tool discovery and execution with a compatible client.
- [ ] AI assistant operation with valid provider configuration.
- [ ] Email notification with valid sender and recipient configuration.
- [ ] Frontend-to-backend communication in production.

Testing results should reflect the final submitted version. Simulated events, provider acceptance, and confirmed message delivery are different outcomes.

---

## 🔐 Safety, Privacy & Limitations

NOVA is a prototype for intelligent household coordination. It is not a certified medical device and does not replace emergency services or professional care.

- 🧪 Some household events and emergency scenarios may be simulated.
- 🔌 Actual smart-device control depends on available integrations.
- 📧 Email and messaging depend on correctly configured external providers.
- 🧠 AI-generated decisions are not infallible.
- 🛡️ Safety-critical actions require appropriate safeguards and reliable execution.

A production-ready system would require stronger authentication and authorization, privacy protections, durable background jobs, verified notification delivery, reliable device integrations, and extensive testing.

---

## 🚀 Future Roadmap

- 🧠 Expand contextual household policies and event prioritization.
- 🏠 Integrate additional smart-home devices and event sources.
- ⚖️ Improve conflict resolution and action recovery.
- 🔁 Add durable workflows, retries, and execution monitoring.
- 📊 Improve event history and observability.
- 🔐 Strengthen privacy, permissions, and user preferences.
- 📬 Improve caregiver notification reliability.
- 🔌 Validate MCP interoperability and Alexa+ integration end to end.
- 🌍 Evaluate usability and reliability across diverse household scenarios.

---

## 🏆 What Makes NOVA Different?

NOVA explores a shift from isolated smart-home commands toward **context-aware household coordination**.

Whether it is a doorbell during a live match, a notification during quiet hours, a conflicting request, a device failure, or an emergency requiring escalation, the underlying challenge is the same:

**The system must understand what is happening, determine what matters, coordinate an appropriate action, and track what happens next.**

NOVA brings these ideas together in one household intelligence platform.

<p align="center">
  <strong>🌌 NOVA — Not just responding to commands. Coordinating what happens next. 🏠</strong>
</p>

---

<p align="center">
  Built with ❤️ for the <strong>Amazon Developer Hackathon — Alexa+ Track</strong>
</p>
