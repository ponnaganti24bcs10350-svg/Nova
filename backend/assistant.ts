import "dotenv/config";
import { randomUUID } from "node:crypto";
import Groq from "groq-sdk";
import type { Express } from "express";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MCP_URL = process.env.MCP_URL ?? "http://localhost:3002/mcp";
const MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

const tools = [
  {
    type: "function",
    function: {
      name: "create_emergency",
      description: "Create a simulated emergency only when the user explicitly asks to simulate or test one.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "list_emergencies",
      description: "List current emergency incidents and their statuses.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_emergency",
      description: "Get an emergency incident and its timeline using its ID.",
      parameters: {
        type: "object",
        properties: { id: { type: "string", description: "Incident ID" } },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "respond_to_emergency",
      description: "Record an explicit response for an existing simulated emergency.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          response: { type: "string", enum: ["OKAY", "NO_RESPONSE"] },
        },
        required: ["id", "response"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "acknowledge_caregiver",
      description: "Acknowledge an existing simulated primary or backup caregiver alert.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          caregiver: { type: "string", enum: ["PRIMARY", "BACKUP"] },
        },
        required: ["id", "caregiver"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "coordinate_household_event",
      description: "Evaluate a household event and execute the selected simulated action. Safety emergencies take priority.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["DOORBELL", "QUIET_HOURS", "CONFLICTING_REQUEST", "DEVICE_FAILURE", "SAFETY_EMERGENCY"],
          },
          description: { type: "string" },
          liveMatch: { type: "boolean" },
          quietHours: { type: "boolean" },
          simulateFailure: { type: "boolean" },
        },
        required: ["type", "description"],
        additionalProperties: false,
      },
    },
  },
] as const;

type ToolArguments = Record<string, unknown>;
type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_call_id?: string;
  name?: string;
  tool_calls?: any[];
  [key: string]: unknown;
};

const SYSTEM_PROMPT = [
  "You are Nova, the voice assistant for AEGIS, a household coordination and safety system. The user may speak in short, conversational follow-ups such as 'yes', 'do that', or 'what about the backup'; use the prior conversation to understand what they mean.",
  "Use MCP tools when needed to retrieve information or perform an explicitly requested action.",
  "For household events, explain the decision and reason returned by the tool.",
  "Only create a simulated emergency when the user explicitly asks to simulate or test one.",
  "Only record OKAY, NO_RESPONSE, or caregiver acknowledgement when explicitly requested.",
  "Never claim real devices, SMS messages, phone calls, or notifications occurred.",
  "Household actions and caregiver notifications in this prototype may be simulated; email alerts may be sent by the configured backend.",
  "Treat tool results as the source of truth. If a tool fails, explain the failure honestly.",
  "Do not invent incident IDs, statuses, decisions, or execution results.",
  "Before executing a consequential household action that was only discussed hypothetically, ask for confirmation. If the user clearly confirms a proposed action, use the appropriate tool if one exists.",
].join(" ");

// In-memory conversation store for this local prototype. Conversations reset when the API server restarts.
const conversations = new Map<string, ChatMessage[]>();
const MAX_HISTORY_MESSAGES = 40;

async function executeTool(name: string, args: ToolArguments): Promise<unknown> {
  const client = new Client({ name: "aegis-groq-assistant", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));

  try {
    await client.connect(transport);
    console.log(`[AEGIS MCP] Calling tool: ${name}`, args);
    const result = await client.callTool({ name, arguments: args });

    if (result.isError) {
      const content: unknown = result.content;
      const errorText = Array.isArray(content)
        ? content
            .filter(
              (item: unknown): item is { type: "text"; text: string } =>
                typeof item === "object" && item !== null && "type" in item && item.type === "text" && "text" in item && typeof item.text === "string",
            )
            .map((item) => item.text)
            .join("\n")
        : "";
      throw new Error(errorText || `MCP tool ${name} failed.`);
    }

    return result;
  } finally {
    await client.close();
  }
}

export function registerAssistantRoutes(app: Express) {
  app.post("/assistant/chat", async (req, res) => {
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const requestedConversationId = typeof req.body?.conversationId === "string"
      ? req.body.conversationId.trim()
      : "";

    if (!message) {
      res.status(400).json({ error: "Enter a message for AEGIS." });
      return;
    }

    if (!process.env.GROQ_API_KEY) {
      res.status(500).json({ error: "GROQ_API_KEY is missing from backend/.env." });
      return;
    }

    const conversationId = requestedConversationId || randomUUID();

    try {
      const previousMessages = conversations.get(conversationId) ?? [];
      const messages: ChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...previousMessages,
        { role: "user", content: message },
      ];

      for (let round = 0; round < 5; round++) {
        const completion = await groq.chat.completions.create({
          model: MODEL,
          messages: messages as any,
          tools: [...tools] as any,
          tool_choice: "auto",
          temperature: 0.2,
        });

        const assistantMessage = completion.choices[0]?.message;
        if (!assistantMessage) throw new Error("Groq returned an empty response.");

        messages.push(assistantMessage as ChatMessage);
        const toolCalls = assistantMessage.tool_calls ?? [];

        if (toolCalls.length === 0) {
          const reply = assistantMessage.content ?? "I couldn't generate a response. Please try again.";
          // Save the conversation without the system prompt. Keep recent turns for context.
          conversations.set(conversationId, messages.filter((item) => item.role !== "system").slice(-MAX_HISTORY_MESSAGES));
          res.json({ reply, conversationId });
          return;
        }

        for (const toolCall of toolCalls) {
          const name = toolCall.function.name;
          let result: unknown;
          try {
            const args = JSON.parse(toolCall.function.arguments || "{}") as ToolArguments;
            result = await executeTool(name, args);
          } catch (error) {
            result = { error: error instanceof Error ? error.message : "MCP tool execution failed." };
          }

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name,
            content: JSON.stringify(result),
          });
        }
      }

      res.status(502).json({ error: "AEGIS reached its tool-call limit. Please try a simpler request." });
    } catch (error) {
      console.error("AEGIS assistant error:", error instanceof Error ? error.message : "Unknown error");
      res.status(502).json({ error: "The AEGIS assistant could not complete the request. Check the Groq configuration, MCP server, and backend logs." });
    }
  });
}
