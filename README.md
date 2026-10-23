# NOVA — Intelligent Household Coordination Engine

### One intelligent agent. An entire household. Smarter decisions.

NOVA is an AI-powered household intelligence and coordination platform designed to help people manage everyday activities, connected-device events, interruptions, competing priorities, and safety situations through a unified, context-aware agent.

Built for the **Amazon Developer Hackathon — Alexa+ Track**, NOVA explores how AI agents and the Model Context Protocol (MCP) can move beyond executing isolated commands toward coordinating entire household workflows.

Imagine watching a live football match when someone rings the doorbell. Your household assistant should understand that the match matters, recognize the new event, and decide how to notify you without unnecessarily interrupting the experience.

Now imagine quiet hours, a device failure, two conflicting household requests, or a potential emergency. Each situation requires a different response.

**That's the vision behind NOVA: an intelligent household agent that understands context, prioritizes events, coordinates actions, and adapts its response to the situation.**

---

## 🌟 The Vision

Today's smart-home experiences often revolve around individual commands: turn on a light, announce a notification, or execute an automation.

But a real household is not a collection of independent commands. It is an environment full of overlapping activities, changing priorities, competing requests, and unexpected events.

NOVA explores a different approach.

Instead of asking only, "What action should I execute?", NOVA asks:

- What is happening in the household?
- What is the person currently doing?
- How important is this event?
- Could this action interrupt something more important?
- Are there conflicting requests?
- What should happen if an action fails?
- Does this situation require escalation?

The goal is to make household automation more context-aware, coordinated, and resilient.

## 🧩 The Problem

Consider a few ordinary household situations:

- You're watching an important live match when the doorbell rings.
- It's late at night, and a routine notification arrives during quiet hours.
- Two household requests compete for the same device or resource.
- A smart-home action fails when the system attempts to execute it.
- An important household event needs attention while a routine activity is underway.
- A potential emergency requires a response rather than another passive notification.

A simple command-based system may execute each request independently. A more intelligent system needs to understand context, manage competing priorities, choose appropriate actions, and track what happens afterward.

NOVA is designed to explore that coordination layer.

## 💡 The Solution

NOVA brings together an AI assistant, a household coordination engine, structured MCP tools, emergency workflow management, and action execution logic.

The platform is organized around five capabilities:

1. **Understand** — interpret requests and household events.
2. **Prioritize** — evaluate event context and competing needs.
3. **Decide** — select an appropriate response according to application logic.
4. **Act** — execute supported actions through structured tools.
5. **Verify and recover** — track outcomes and handle configured failures or escalation paths.

Rather than treating every event as an isolated command, NOVA explores how a household agent can coordinate multiple events while keeping safety and user intent in mind.

---

## 🏠 Real-World Use Cases

NOVA is designed to support different household scenarios, not just emergency alerts.

### 1. Entertainment-Aware Notifications

**Scenario:** You're watching a live football match, and someone rings the doorbell.

A poorly coordinated system might interrupt the match with a long announcement. NOVA can evaluate the context and choose a less disruptive response, such as a brief notification.

The objective is not to ignore the doorbell. It is to communicate the event while respecting the current activity.

### 2. Quiet-Hours Management

**Scenario:** It's late at night, and a routine household notification arrives.

NOVA can evaluate the event against quiet-hours policies and choose an appropriate notification behavior, where supported.

For example, a routine update might be deferred or delivered quietly, while an urgent safety-related event should receive higher priority.

### 3. Conflicting Household Requests

**Scenario:** Two household requests compete for a shared device or incompatible actions.

NOVA explores how a coordination engine can evaluate both requests, identify the conflict, and choose an appropriate action according to the defined policies.

Instead of blindly executing both commands, the system can make the conflict explicit and select or recommend a suitable resolution.

### 4. Device Failure and Recovery

**Scenario:** A household action fails during execution.

NOVA includes an action-execution workflow designed to handle action outcomes and configured failure or fallback behavior.

For example, if an attempted action fails, the workflow can record the failure and follow its configured recovery path instead of silently treating the action as successful.

Actual recovery behavior depends on the implemented action and its available fallback.

### 5. Emergency Response and Caregiver Coordination

**Scenario:** A possible fall is reported, but the person does not respond.

NOVA can track the emergency, wait for a response, and initiate caregiver escalation when the configured response window expires.

If the primary caregiver does not acknowledge within the configured window, the workflow can escalate to a backup caregiver.

This is one important use case within NOVA's broader coordination architecture.

### 6. Context-Aware Event Prioritization

**Scenario:** A routine household event and a high-priority safety event occur close together.

NOVA explores how a policy-based decision engine can prioritize the events according to their context and importance, rather than treating every event equally.

The objective is to minimize unnecessary interruptions without suppressing critical events.

---

## ⚙️ Core Features

### Context-Aware Household Coordination

Evaluate household events and select actions based on their type, context, priority, and applicable policies.

### Event Prioritization

Distinguish routine events from time-sensitive or safety-related events, enabling more appropriate responses.

### Conflict Handling

Identify competing requests and coordinate them according to the application's decision logic.

### Action Execution and Failure Handling

Execute supported actions, record outcomes, and handle configured failures or fallback paths.

### Emergency Lifecycle Management

Create and track emergency events, process responses, and manage escalation and acknowledgment workflows.

### Primary and Backup Caregiver Escalation

Initiate caregiver escalation after configured response timeouts and record acknowledgments.

### AI-Powered Assistant

NOVA includes a conversational assistant backed by a Groq model integration, allowing users to interact with the application through natural language.

### Voice Interaction

The frontend includes browser-based voice interaction functionality for supported conversational workflows.

### Conversation Context

Conversation memory supports continuity across interactions, subject to the implementation's memory behavior.

### MCP Tool Interface

Expose structured tools so compatible agents and MCP clients can interact with NOVA's application workflows.

### Household Event History

Track relevant events and emergency state changes to make workflows easier to inspect and troubleshoot.

---

## 🧠 Why MCP?

The Model Context Protocol provides a structured way for AI applications to discover and invoke tools.

NOVA uses MCP as an interface to application capabilities rather than relying exclusively on free-form text generation.

Its implemented tool names include:

| MCP tool | Purpose |
|---|---|
| `create_emergency` | Create an emergency event |
| `list_emergencies` | Retrieve the available emergency list |
| `get_emergency` | Retrieve details for a specific emergency |
| `respond_to_emergency` | Record a response to an emergency |
| `acknowledge_caregiver` | Record caregiver acknowledgment |
| `coordinate_household_event` | Coordinate a household event |

These tools expose structured actions for emergency and household workflows.

The broader NOVA architecture separates conversational reasoning from application actions, allowing workflows to be managed through explicit backend logic.

**Important:** MCP tool availability does not by itself establish compatibility with every MCP client or Alexa+ runtime. Protocol and target-platform compatibility must be validated against the actual deployment.

---

## 🏗️ System Architecture

```text
                 User / Voice Input
                         |
                         v
                 NOVA AI Assistant
                  (Groq Integration)
                         |
                         v
               Household Coordination
                  and Decision Logic
                         |
            +------------+------------+
            |            |            |
            v            v            v
        Household     Emergency    Action
        Events        Lifecycle    Execution
            |            |            |
            +------------+------------+
                         |
                         v
                    MCP Server
                         |
                         v
                 Structured MCP Tools
                         |
                         v
             Supported Application Actions
                         |
                         v
             Outcomes / History / Recovery
```

This diagram represents the logical architecture. The actual execution path depends on the implemented code and configured integrations.

---

## 🔄 Example: A Household Event in NOVA

Consider a doorbell event while someone is watching a live match.

**Step 1 — Event received**

A doorbell event enters the household coordination workflow.

**Step 2 — Context evaluated**

The workflow considers the event type and relevant household context.

**Step 3 — Action selected**

The coordination logic chooses a response intended to minimize unnecessary interruption.

**Step 4 — Action executed**

The application attempts the supported notification or coordination action.

**Step 5 — Outcome handled**

The result can be inspected, and configured failure handling can run if the action does not succeed.

The same general coordination approach can be applied to quiet hours, conflicting requests, device failures, and higher-priority safety events, with policies appropriate to each scenario.

---

## 🚨 Example: Emergency Escalation

NOVA also supports a more time-sensitive workflow.

```text
Possible Emergency
        |
        v
Awaiting Person's Response
        |
        +------ Response Received ------> Resolve
        |
        +------ No Response ------------> Primary Caregiver
                                                |
                                  +-------------+-------------+
                                  |                           |
                             Acknowledged                 No Response
                                  |                           |
                                  v                           v
                               Update                   Backup Caregiver
                               State
```

The escalation sequence uses configured timeouts. It is intended to make the workflow traceable and to reduce the risk of an unanswered alert being mistaken for a resolved emergency.

This prototype does not independently establish that a real-world fall has occurred or guarantee that a caregiver receives or responds to a notification.

---

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| TypeScript | Typed application and backend logic |
| Node.js | Backend runtime |
| Express | HTTP API and backend endpoints |
| Model Context Protocol (MCP) | Structured tool interface |
| React | Frontend application |
| Vite | Frontend development and build tooling |
| Groq integration | AI assistant responses |
| Resend | Email API integration |
| Render | Backend deployment |
| Vercel | Frontend deployment |

---

## 📂 Project Structure

```text
Nova/
├── backend/
│   ├── src.ts
│   ├── assistant.ts
│   ├── emergency.ts
│   ├── coordinate.ts
│   ├── actionExecutor.ts
│   ├── mcp.ts
│   ├── email.ts
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
│
└── README.md
```

This is a high-level overview. Refer to the actual repository for the complete file structure.

---

## 🌐 Live Project

- **Frontend:** https://nova-7ujl.vercel.app
- **Backend:** https://nova-1-q4n0.onrender.com
- **Source code:** https://github.com/ponnaganti24bcs10350-svg/Nova

The demonstration should showcase several different NOVA scenarios:

1. Conversational interaction with the NOVA assistant.
2. A household event and its context-aware coordination decision.
3. A conflicting request or action failure, where supported.
4. Emergency creation and response handling.
5. Primary and backup caregiver escalation.
6. MCP tool execution and the resulting application state.

The goal is to demonstrate NOVA as a multi-purpose household coordination platform rather than only an emergency notification application.

---

## 🧪 Testing and Validation

NOVA's backend has been exercised using HTTP requests and simulated workflows, including emergency creation, response handling, caregiver acknowledgment, and household coordination.

Important validation scenarios include:

- Household event coordination.
- Conflicting-event decision handling.
- Action failure and configured fallback behavior.
- Emergency creation and resolution.
- Timeout-driven caregiver escalation.
- MCP tool discovery and execution using a compatible client.
- AI assistant operation with valid provider configuration.
- Email notification with a permitted sender and recipient.
- Frontend-to-backend communication in the deployed environment.

Testing results should be reported according to the behavior reproduced in the final submitted version. Simulated events, provider acceptance, and actual delivery are distinct outcomes.

---

## 🔐 Safety and Limitations

NOVA is a prototype for intelligent household coordination. It is not a certified medical device or a replacement for emergency services.

Some household events and emergency scenarios may be simulated. Actual smart-device control depends on available integrations, while email and messaging depend on correctly configured external providers.

AI-generated decisions should not be treated as infallible. Safety-critical actions require appropriate safeguards, clear escalation policies, and reliable execution.

A production-ready system would require stronger authentication and authorization, privacy protections, durable background jobs, verified notification delivery, reliable device integrations, and extensive testing.

---

## 🚀 Future Roadmap

- Expand contextual household policies and event prioritization.
- Integrate additional smart-home devices and event sources.
- Improve conflict resolution and action recovery.
- Add durable workflows, retries, and execution monitoring.
- Improve household event history and observability.
- Strengthen privacy, permissions, and user-specific preferences.
- Improve caregiver notification reliability.
- Validate MCP interoperability and Alexa+ integration end to end.
- Evaluate real-world usability and reliability across diverse household scenarios.

---

## 🏆 What Makes NOVA Different?

NOVA's central idea is that a smart household needs more than a collection of independent automations.

It needs a coordination layer that can reason about context, prioritize events, manage competing actions, track outcomes, and escalate when a situation requires additional attention.

From a doorbell during a live match to quiet-hours policies, device failures, conflicting requests, and emergency escalation, NOVA explores how a household agent can coordinate different kinds of events through one unified platform.

**NOVA is not just about responding to commands. It's about coordinating what happens next.**

---

**Built for the Amazon Developer Hackathon — Alexa+ Track.**
