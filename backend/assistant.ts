
import "dotenv/config";
import { randomUUID } from "node:crypto";
import Groq from "groq-sdk";
import type { Express } from "express";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MCP_URL = process.env.MCP_URL ?? "http://localhost:3002/mcp";
const MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

const MAX_HISTORY_MESSAGES = 6;
const MAX_TOOL_RESULT_LENGTH = 3000;
const MAX_TOOL_ROUNDS = 4;
const MAX_USER_MESSAGE_LENGTH = 4000;

const tools = [
  {
    type: "function",
    function: {
      name: "create_emergency",
      description:
        "Create a simulated emergency only when the user explicitly asks to simulate or test one.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_emergencies",
      description: "List current emergency incidents and their statuses.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_emergency",
      description: "Get an emergency incident and its timeline using its ID.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Incident ID" },
        },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "respond_to_emergency",
      description:
        "Record an explicit response for an existing simulated emergency.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          response: {
            type: "string",
            enum: ["OKAY", "NO_RESPONSE"],
          },
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
      description:
        "Acknowledge an existing simulated primary or backup caregiver alert.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          caregiver: {
            type: "string",
            enum: ["PRIMARY", "BACKUP"],
          },
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
      description:
        "Evaluate a household event and execute the selected simulated action. Safety emergencies take priority. Use only the exact event types in the schema.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "DOORBELL",
              "QUIET_HOURS",
              "CONFLICTING_REQUEST",
              "DEVICE_FAILURE",
              "SAFETY_EMERGENCY",
            ],
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
  "You are Nova, the voice assistant for AEGIS, a household coordination and safety system.",
  "Understand short conversational follow-ups such as yes, do that, and what about the backup using recent conversation context.",
  "Use MCP tools when needed to retrieve information or perform explicitly requested actions.",
  "For household events, explain the decision and reason returned by the tool.",
  "Only create a simulated emergency when the user explicitly asks to simulate or test one.",
  "Only record OKAY, NO_RESPONSE, or caregiver acknowledgement when explicitly requested.",
  "Never claim real devices, SMS messages, phone calls, or notifications occurred.",
  "Household actions and caregiver notifications may be simulated; email alerts may be sent by the configured backend.",
  "Treat tool results as the source of truth. If a tool fails, explain the failure honestly.",
  "Never invent incident IDs, statuses, decisions, or execution results.",
  "For household event types, use only the exact enum values provided by the tool schema. For a doorbell event, use DOORBELL.",
  "Before executing a consequential household action that was only discussed hypothetically, ask for confirmation.",
  "If the user clearly confirms a proposed action, use the appropriate tool if one exists.",
].join(" ");

const conversations = new Map<string, ChatMessage[]>();

// Keep only complete user/assistant turns. Avoid retaining orphaned tool
// messages or incomplete assistant tool-call sequences between requests.
function getRecentHistory(history: ChatMessage[]): ChatMessage[] {
  const completeTurns: ChatMessage[][] = [];
  let currentTurn: ChatMessage[] = [];

  for (const item of history) {
    if (item.role === "user") {
      if (currentTurn.length > 0) {
        completeTurns.push(currentTurn);
      }
      currentTurn = [item];
    } else if (currentTurn.length > 0) {
      currentTurn.push(item);
    }
  }

  if (currentTurn.length > 0) {
    completeTurns.push(currentTurn);
  }

  return completeTurns
    .slice(-3)
    .flat()
    .filter((item) => {
      if (item.role === "tool") return false;

      // Do not keep an assistant message whose tool call would be missing
      // its matching tool result.
      if (item.role === "assistant" && item.tool_calls?.length) {
        return false;
      }

      return true;
    })
    .slice(-MAX_HISTORY_MESSAGES);
}

function serializeToolResult(result: unknown): string {
  let serialized: string;

  try {
    serialized = JSON.stringify(result) ?? String(result);
  } catch {
    serialized = String(result);
  }

  if (serialized.length <= MAX_TOOL_RESULT_LENGTH) {
    return serialized;
  }

  // Preserve valid JSON instead of cutting a JSON string in the middle.
  return JSON.stringify({
    truncated: true,
    message: "Tool output was too large. Use a more specific query if needed.",
    preview: serialized.slice(0, 1500),
  });
}

function getErrorDetails(error: unknown) {
  const err = error as {
    message?: string;
    status?: number;
    code?: string;
    error?: { code?: string; message?: string };
  };

  return {
    message: err?.message ?? "Unknown error",
    status: err?.status,
    code: err?.code ?? err?.error?.code,
  };
}

async function executeTool(
  name: string,
  args: ToolArguments,
): Promise<unknown> {
  const client = new Client({
    name: "aegis-groq-assistant",
    version: "1.0.0",
  });

  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));

  try {
    await client.connect(transport);

    console.log(`[AEGIS MCP] Calling tool: ${name}`);

    const result = await client.callTool({
      name,
      arguments: args,
    });

    if (result.isError) {
      const content = result.content;

      const errorText = Array.isArray(content)
        ? content
            .filter(
              (
                item: unknown,
              ): item is { type: "text"; text: string } =>
                typeof item === "object" &&
                item !== null &&
                "type" in item &&
                item.type === "text" &&
                "text" in item &&
                typeof item.text === "string",
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
    const message =
      typeof req.body?.message === "string"
        ? req.body.message.trim()
        : "";

    const requestedConversationId =
      typeof req.body?.conversationId === "string"
        ? req.body.conversationId.trim()
        : "";

    if (!message) {
      res.status(400).json({
        error: "Enter a message for AEGIS.",
      });
      return;
    }

    if (message.length > MAX_USER_MESSAGE_LENGTH) {
      res.status(400).json({
        error: "Please send a shorter message.",
      });
      return;
    }

    if (!process.env.GROQ_API_KEY) {
      res.status(500).json({
        error: "GROQ_API_KEY is missing from the backend environment.",
      });
      return;
    }

    const conversationId = requestedConversationId || randomUUID();

    try {
      const previousMessages = conversations.get(conversationId) ?? [];
      const recentHistory = getRecentHistory(previousMessages);

      const messages: ChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...recentHistory,
        { role: "user", content: message },
      ];

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const completion = await groq.chat.completions.create({
          model: MODEL,
          messages: messages as any,
          tools: [...tools] as any,
          tool_choice: "auto",
          temperature: 0.2,
        });

        const assistantMessage = completion.choices[0]?.message;

        if (!assistantMessage) {
          throw new Error("Groq returned an empty response.");
        }

        const toolCalls = assistantMessage.tool_calls ?? [];

        if (toolCalls.length === 0) {
          const reply =
            assistantMessage.content ??
            "I couldn't generate a response. Please try again.";

          const updatedHistory = [
            ...recentHistory,
            { role: "user", content: message } as ChatMessage,
            {
              role: "assistant",
              content: reply,
            } as ChatMessage,
          ];

          conversations.set(
            conversationId,
            getRecentHistory(updatedHistory),
          );

          res.json({ reply, conversationId });
          return;
        }

        // Keep tool-call messages and their matching tool results together
        // within this request. Do not persist them into future requests.
        messages.push(assistantMessage as ChatMessage);

        for (const toolCall of toolCalls) {
          const name = toolCall.function.name;
          let result: unknown;

          try {
            const args = JSON.parse(
              toolCall.function.arguments || "{}",
            ) as ToolArguments;

            const allowedToolNames = tools.map(
              (tool) => tool.function.name,
            );

            if (!allowedToolNames.includes(name as any)) {
              throw new Error(`Unknown tool requested: ${name}`);
            }

            // Prevent invalid enum values from reaching MCP.
            if (name === "coordinate_household_event") {
              const allowedTypes = [
                "DOORBELL",
                "QUIET_HOURS",
                "CONFLICTING_REQUEST",
                "DEVICE_FAILURE",
                "SAFETY_EMERGENCY",
              ];

              if (
                typeof args.type !== "string" ||
                !allowedTypes.includes(args.type)
              ) {
                throw new Error(
                  "Invalid household event type. Use one of the supported event types.",
                );
              }
            }

            result = await executeTool(name, args);
          } catch (error) {
            const details = getErrorDetails(error);
            console.error(`[AEGIS tool error: ${name}]`, details);
            result = {
              error: details.message,
            };
          }

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name,
            content: serializeToolResult(result),
          });
        }
      }

      res.status(502).json({
        error:
          "AEGIS reached its tool-call limit. Please try a simpler request.",
      });
    } catch (error) {
      const details = getErrorDetails(error);

      console.error("AEGIS assistant error:", details);

      const messageText = details.message.toLowerCase();

      if (
        details.code === "context_length_exceeded" ||
        messageText.includes("context_length_exceeded") ||
        messageText.includes("reduce the length of the messages")
      ) {
        res.status(400).json({
          error:
            "The conversation is too long. Please start a new conversation.",
        });
        return;
      }

      if (details.status === 401 || details.status === 403) {
        res.status(502).json({
          error:
            "Groq authentication failed. Check the backend API key and permissions.",
        });
        return;
      }

      if (details.status === 429) {
        res.status(503).json({
          error:
            "The assistant is temporarily rate-limited. Please try again shortly.",
        });
        return;
      }

      res.status(502).json({
        error:
          "The AEGIS assistant could not complete the request. Check the backend logs.",
      });
    }
  });
}
