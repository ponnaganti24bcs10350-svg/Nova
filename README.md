# 🌌 NOVA — Intelligent Household Coordination Engine

<p align="center">
  <strong>One intelligent agent. An entire household. Smarter decisions.</strong>
</p>

<p align="center">
  <em>From everyday automation to critical events — coordinating what happens next.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/AI-Agentic_Intelligence-8B5CF6?style=for-the-badge" alt="AI Agentic Intelligence" />
  <img src="https://img.shields.io/badge/MCP-Tool--Driven_Coordination-F59E0B?style=for-the-badge" alt="MCP Coordination" />
  <img src="https://img.shields.io/badge/Track-Alexa%2B-232F3E?style=for-the-badge" alt="Alexa+ Track" />
</p>

---

## ✨ What if your home could think beyond individual commands?

Today's smart-home systems are great at executing commands. But a real household is more complicated than a sequence of commands.

A doorbell rings while you're watching a live match. A routine notification arrives during quiet hours. Two household events compete for attention. A device action fails. An emergency requires someone to respond.

Each situation requires a different decision.

**NOVA is an AI-powered household intelligence and coordination platform that explores how agents can understand context, prioritize events, coordinate actions, and manage multi-step workflows.**

Built for the **Amazon Developer Hackathon — Alexa+ Track**, NOVA brings together conversational AI, structured MCP tools, household event coordination, action execution, and emergency response workflows.

> 💡 **Our core idea:** A smart home should not merely execute commands. It should coordinate events, understand priorities, and manage what happens next.

## 🚀 Experience NOVA

| Resource | Link |
|---|---|
| 🌐 Live application | [Open NOVA](https://nova-7ujl.vercel.app) |
| ⚙️ Backend | [NOVA API](https://nova-1-q4n0.onrender.com) |
| 💻 Source code | [GitHub Repository](https://github.com/ponnaganti24bcs10350-svg/Nova) |
| 🎬 Demo video | Add the final public video URL |

## 🎯 The Problem

A household is a dynamic environment where activities, devices, people, and unexpected events overlap.

Independent automations can execute actions without considering the broader situation. This creates an opportunity for a coordination layer that evaluates events and manages their outcomes.

NOVA explores five challenges:

- 🧠 **Context:** What is happening right now?
- ⚖️ **Prioritization:** Which event deserves attention first?
- 🔀 **Coordination:** How should competing requests be handled?
- 🔄 **Reliability:** What happens when an action fails?
- 🛡️ **Safety:** How should important situations be escalated and tracked?

## 🏠 One Platform. Multiple Household Scenarios.

### ⚽ 01 — Entertainment-Aware Notifications

**Scenario:** You're watching an important football match when the doorbell rings.

Instead of treating every event as equally important, a context-aware coordination workflow could select a brief notification that minimizes disruption.

**The goal:** Keep people informed without unnecessarily interrupting their activities.

### 🌙 02 — Quiet-Hours Coordination

**Scenario:** A routine household notification arrives late at night.

NOVA can use configured policies to distinguish routine events from time-sensitive situations and select an appropriate response where supported.

**The goal:** Make household automation more considerate of context.

### 🔀 03 — Conflicting Requests

**Scenario:** Two household requests compete for a shared device or require incompatible actions.

A coordination engine can evaluate the requests, identify the conflict, and choose or recommend an appropriate resolution according to defined policies.

**The goal:** Coordinate actions instead of blindly executing every command.

### 🔌 04 — Action Failure and Recovery

**Scenario:** A household action fails during execution.

NOVA's action-execution workflow can track outcomes and handle configured failure paths. The application can distinguish an attempted action from a successful one.

**The goal:** Make failures visible and support more reliable workflows.

### 🚨 05 — Emergency and Caregiver Coordination

**Scenario:** A possible emergency is reported, but the person does not respond.

NOVA tracks the emergency workflow, supports response handling, and initiates configured primary and backup caregiver escalation.

**The goal:** Track the response process rather than treating a notification as the final step.

These scenarios represent the broader coordination vision. Individual device integrations and behaviors depend on the functionality actually implemented and configured.

---

## 🧩 Core Capabilities

<details>
<summary><strong>🧠 AI Assistant and Conversational Interaction</strong></summary>

NOVA includes a conversational assistant backed by a Groq model integration. It provides a natural-language interface to supported application functionality.

The assistant connects conversational interaction with backend workflows rather than treating every interaction as an isolated response.

</details>

<details>
<summary><strong>🔌 MCP-Powered Application Tools</strong></summary>

NOVA exposes structured application actions through its Model Context Protocol implementation.

The implemented tool names include:

- `create_emergency`
- `respond_to_emergency`
- `acknowledge_caregiver`
- `coordinate_household_event`

These tools support structured interactions with emergency and household workflows.

The actual MCP transport, specification version, and compatibility with the Alexa+ target environment must be verified against the running server.

</details>

<details>
<summary><strong>🏠 Household Event Coordination</strong></summary>

The coordination workflow provides an application-level mechanism for processing household events and selecting actions according to its implemented logic.

This is the foundation for extending NOVA toward context-aware notifications, conflicting-event handling, and more intelligent household automation.

</details>

<details>
<summary><strong>🚨 Emergency Lifecycle Management</strong></summary>

NOVA supports emergency creation, response handling, caregiver acknowledgment, and timeout-driven escalation workflows.

Illustrative successful workflow:

`POSSIBLE FALL → AWAITING_RESPONSE → RESOLVED`

Illustrative unanswered workflow:

`AWAITING_RESPONSE → PRIMARY ESCALATION → BACKUP ESCALATION`

Actual state transitions depend on the implemented workflow and configured response windows.

</details>

<details>
<summary><strong>📧 Notification Workflows</strong></summary>

NOVA includes an email integration using Resend when the API key, permitted sender address, and caregiver recipient configuration are valid.

WhatsApp notifications require their corresponding provider configuration.

An attempted notification, a provider-accepted request, a delivered message, and a caregiver acknowledgment are distinct outcomes.

</details>

---

## 🧠 Why MCP Matters

The Model Context Protocol provides a structured interface through which compatible clients can discover and invoke application tools.

For NOVA, this means application actions can be represented as explicit operations rather than relying entirely on free-form conversational output.

The intended interaction is:

1. A user initiates an interaction.
2. The assistant or compatible client selects a supported action.
3. A structured tool call reaches the application.
4. The backend processes the action.
5. The result is returned and the relevant state is updated.

This separation between conversational interaction and application execution is central to NOVA's architecture.

**Alexa+ track requirement:** The hackathon requires either a self-hosted MCP server using specification version 2025-11-25 or later over Streamable HTTP, or the permitted simulated Alexa+ experience built in a web application. NOVA's final submission should clearly demonstrate which route it implements and provide evidence that the required integration actually works.

---

## 🏗️ Architecture

```text
                  USER INTERACTION
                         |
                         v
                 NOVA AI ASSISTANT
                   Groq Integration
                         |
                         v
              HOUSEHOLD COORDINATION
                         |
             +-----------+-----------+
             |           |           |
             v           v           v
         Household   Emergency    Action
          Events     Workflows   Execution
             |           |           |
             +-----------+-----------+
                         |
                         v
                    MCP SERVER
                         |
                         v
                STRUCTURED MCP TOOLS
                         |
                         v
               BACKEND APPLICATION LOGIC
                         |
                         v
             RESULTS AND STATE UPDATES
```

This is a logical overview. The actual runtime request flow depends on the implemented code and integrations.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| TypeScript | Typed application and backend logic |
| Node.js | Backend runtime |
| Express | HTTP API |
| Model Context Protocol | Structured tool interface |
| React | Frontend application |
| Vite | Frontend development and build tooling |
| Groq integration | AI assistant |
| Resend | Email API integration |
| Render | Backend deployment |
| Vercel | Frontend deployment |

## 🖼️ Screenshots and Demonstration

1. **NOVA dashboard** 
<img width="2881" height="1392" alt="image" src="https://github.com/user-attachments/assets/51c4f2ff-5cde-4ee3-8460-96faec904658" />

2. **AI assistant** — a real interaction with the assistant.
  <img width="2896" height="1369" alt="image" src="https://github.com/user-attachments/assets/063d6a01-b0e1-41b1-9fb5-87572551b39f" />
<img width="2925" height="1408" alt="image" src="https://github.com/user-attachments/assets/a9c7442a-8380-44fa-bbd7-a81c577b7070" />

4. **Household coordination** — an actual event and the resulting coordination output.
   <img width="2925" height="1504" alt="image" src="https://github.com/user-attachments/assets/bab1bbfc-5324-45bd-ad0c-3c8a4c95c6ec" />

6. **MCP tools** — the real tool list and a successful tool execution in a compatible MCP client.
   <img width="2528" height="1352" alt="image" src="https://github.com/user-attachments/assets/d52d101d-6273-4a8d-ba7c-ae52ecef6b14" />
<img width="2208" height="1384" alt="image" src="https://github.com/user-attachments/assets/700739c2-6257-4c5e-8f10-44971d38eaf4" />
<img width="2541" height="1332" alt="image" src="https://github.com/user-attachments/assets/a97b6bc1-5203-4379-81b0-c277b403bf81" />

8. **Emergency workflow** — the emergency state and escalation behavior.
   <img width="2880" height="1485" alt="image" src="https://github.com/user-attachments/assets/5f56f3dc-c3b0-452e-8b9f-5dfa0672264b" />
<img width="2244" height="484" alt="image" src="https://github.com/user-attachments/assets/0b9a573f-296b-4cfd-8a7f-c54da606a69e" />

## 💻 Run Locally

### Prerequisites

- Node.js and npm
- Git
- A terminal
- Provider credentials for integrations you want to test

### 1. Clone the repository

```bash
git clone https://github.com/ponnaganti24bcs10350-svg/Nova.git
cd Nova
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure environment variables

Create a local `.env` file using the variables required by the actual backend implementation.

Example for configured email notifications:

```env
PORT=3003
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=your_permitted_sender_address
PRIMARY_CAREGIVER_EMAIL=primary@example.com
BACKUP_CAREGIVER_EMAIL=backup@example.com
```

Configure the Groq integration and any additional variables required by the project separately.

Never commit real credentials, API keys, or private caregiver contact details.

### 4. Start the backend

```bash
npm run start:api
```

The backend is configured to use port `3003` unless the application's configuration specifies otherwise.

### 5. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite.

### 6. Test the integration

Use the actual endpoint paths, MCP transport, and tool schemas defined in the repository. A running HTTP API does not by itself prove that an MCP server is compliant with the required protocol.

---

## 🧪 Testing and Validation

The backend has been exercised through HTTP requests and simulated workflows involving emergency creation, response handling, caregiver acknowledgment, and household coordination.

The final version should be validated against the following scenarios:

- [ ] Assistant interaction with valid provider configuration.
- [ ] Household coordination using the actual implemented workflow.
- [ ] MCP initialization, tool discovery, and execution using a compatible client.
- [ ] Emergency creation and response handling.
- [ ] Timeout-driven caregiver escalation.
- [ ] Email request using a valid sender and recipient.
- [ ] Correct frontend-to-backend communication.
- [ ] No committed secrets or private credentials.

Mark functionality as working only after verifying it against the final submitted code.

## 🔐 Safety and Limitations

NOVA is a prototype for intelligent household coordination. It is not a certified medical device and does not replace emergency services or professional care.

- Emergency scenarios may be simulated rather than detected by physical sensors.
- Device control depends on implemented integrations.
- Notification requests do not guarantee delivery or a caregiver response.
- AI-generated decisions are not infallible.
- Real-world use would require stronger security, privacy controls, durable workflows, reliable integrations, and extensive safety testing.

## 🚀 Future Roadmap

- 🧠 Expand context-aware household policies.
- 🏠 Integrate additional smart-home devices and event sources.
- ⚖️ Improve conflict resolution and prioritization.
- 🔄 Add durable workflows, retries, and failure recovery.
- 📊 Improve event history and operational observability.
- 🔐 Strengthen authentication, permissions, and privacy.
- 📬 Improve notification delivery tracking.
- 🔌 Validate MCP interoperability and Alexa+ integration end to end.

## 🌍 Potential Impact

NOVA explores a household intelligence layer that can support a wide range of everyday interactions.

Its potential applications include:

- More considerate household notifications.
- Better coordination of competing events.
- More transparent automation and failure handling.
- Structured emergency response workflows.
- Extensible agent-driven interactions with connected household systems.

The aim is to make smart-home experiences more coordinated, context-aware, and reliable.

## 🏆 What Makes NOVA Different?

NOVA explores a shift from isolated smart-home commands toward **coordinated, stateful household workflows**.

Whether the situation involves a doorbell during a live match, a notification during quiet hours, a conflicting request, an action failure, or an emergency requiring escalation, the underlying challenge is similar: understand the context, determine what matters, execute an appropriate action, and track the outcome.

**NOVA is not just about responding to commands. It's about coordinating what happens next.**

---

<p align="center">
  <strong>🌌 NOVA — Intelligent Household Coordination Engine</strong>
  <br/>
  Built for the Amazon Developer Hackathon — Alexa+ Track.
</p>
