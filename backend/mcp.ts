
import "dotenv/config";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const app = express();
app.use(express.json({ limit: "1mb" }));

// Deployed Nova backend
const API_BASE = (
  process.env.API_BASE_URL ?? "https://nova-1-q4n0.onrender.com"
).replace(/\/+$/, "");

// Render supplies PORT for the public web service.
const PORT = Number(process.env.PORT ?? process.env.MCP_PORT ?? 3002);

const REQUEST_TIMEOUT_MS = 20000;
const MAX_ERROR_CHARS = 500;
const MAX_TOOL_RESULT_CHARS = 12000;

async function callBackend(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // Read only a bounded amount of data. Do not pass large HTML
    // gateway error pages through the MCP response.
    const reader = response.body?.getReader();
    let text = "";

    if (reader) {
      const decoder = new TextDecoder();
      const MAX_RESPONSE_BYTES = 256 * 1024;
      let bytesRead = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          bytesRead += value.byteLength;

          if (bytesRead > MAX_RESPONSE_BYTES) {
            await reader.cancel();
            throw new Error("Backend response exceeded 256 KB");
          }

          text += decoder.decode(value, { stream: true });
        }

        text += decoder.decode();
      } finally {
        reader.releaseLock();
      }
    }

    if (!response.ok) {
      const excerpt = text.slice(0, MAX_ERROR_CHARS);
      throw new Error(
        `Backend returned HTTP ${response.status}: ${excerpt}`,
      );
    }

    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        `Backend returned invalid JSON: ${text.slice(0, MAX_ERROR_CHARS)}`,
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Nova backend request timed out after 20 seconds");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function toolResult(result: unknown) {
  const text = JSON.stringify(result ?? {}, null, 2);

  if (text.length > MAX_TOOL_RESULT_CHARS) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: "Backend result was too large to return. Reduce the backend response size.",
        },
      ],
    };
  }

  return {
    content: [{ type: "text" as const, text }],
  };
}

function toolError(name: string, error: unknown) {
  const message =
    error instanceof Error
      ? error.message.slice(0, MAX_ERROR_CHARS)
      : "Unknown error";

  console.error(`[AEGIS tool error: ${name}] ${message}`);

  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: `${name} failed: ${message}`,
      },
    ],
  };
}

function createMcpServer() {
  const server = new McpServer({
    name: "aegis-emergency-coordinator",
    version: "1.0.0",
  });

  server.registerTool(
    "create_emergency",
    {
      title: "Create Emergency",
      description:
        "Create a simulated emergency only when the user explicitly asks to simulate or test one.",
      inputSchema: {},
    },
    async () => {
      try {
        return toolResult(
          await callBackend("/emergencies", {
            method: "POST",
            body: JSON.stringify({}),
          }),
        );
      } catch (error) {
        return toolError("create_emergency", error);
      }
    },
  );

  server.registerTool(
    "list_emergencies",
    {
      title: "List Emergencies",
      description: "List current emergency incidents and their statuses.",
      inputSchema: {},
    },
    async () => {
      try {
        return toolResult(await callBackend("/emergencies"));
      } catch (error) {
        return toolError("list_emergencies", error);
      }
    },
  );

  server.registerTool(
    "get_emergency",
    {
      title: "Get Emergency Details",
      description: "Retrieve an emergency and its response timeline by ID.",
      inputSchema: {
        id: z.string().min(1).describe("The emergency incident ID"),
      },
    },
    async ({ id }) => {
      try {
        return toolResult(
          await callBackend(`/emergencies/${encodeURIComponent(id)}`),
        );
      } catch (error) {
        return toolError("get_emergency", error);
      }
    },
  );

  server.registerTool(
    "respond_to_emergency",
    {
      title: "Respond to Emergency",
      description:
        "Record an explicit OKAY or NO_RESPONSE response for a simulated emergency.",
      inputSchema: {
        id: z.string().min(1).describe("The emergency incident ID"),
        response: z
          .enum(["OKAY", "NO_RESPONSE"])
          .describe("The person's response"),
      },
    },
    async ({ id, response }) => {
      try {
        return toolResult(
          await callBackend(
            `/emergencies/${encodeURIComponent(id)}/respond`,
            {
              method: "POST",
              body: JSON.stringify({ response }),
            },
          ),
        );
      } catch (error) {
        return toolError("respond_to_emergency", error);
      }
    },
  );

  server.registerTool(
    "acknowledge_caregiver",
    {
      title: "Acknowledge Caregiver Alert",
      description:
        "Record acknowledgement of a simulated primary or backup caregiver alert.",
      inputSchema: {
        id: z.string().min(1).describe("The emergency incident ID"),
        caregiver: z
          .enum(["PRIMARY", "BACKUP"])
          .describe("Which caregiver acknowledges the alert"),
      },
    },
    async ({ id, caregiver }) => {
      try {
        return toolResult(
          await callBackend(
            `/emergencies/${encodeURIComponent(id)}/caregiver-ack`,
            {
              method: "POST",
              body: JSON.stringify({ caregiver }),
            },
          ),
        );
      } catch (error) {
        return toolError("acknowledge_caregiver", error);
      }
    },
  );

  server.registerTool(
    "coordinate_household_event",
    {
      title: "Coordinate Household Event",
      description:
        "Submit a household event to AEGIS. It evaluates context and returns its decision and execution result. Do not claim an action succeeded unless the backend confirms it.",
      inputSchema: {
        type: z
          .enum([
            "DOORBELL",
            "QUIET_HOURS",
            "CONFLICTING_REQUEST",
            "DEVICE_FAILURE",
            "SAFETY_EMERGENCY",
          ])
          .describe("The type of household event"),
        description: z
          .string()
          .min(1)
          .describe("What happened in the household"),
        liveMatch: z
          .boolean()
          .optional()
          .describe("Whether the family is watching a live match"),
        quietHours: z
          .boolean()
          .optional()
          .describe("Whether quiet hours are active"),
        simulateFailure: z
          .boolean()
          .optional()
          .describe("Simulate primary action failure to test fallback recovery"),
      },
    },
    async ({
      type,
      description,
      liveMatch,
      quietHours,
      simulateFailure,
    }) => {
      try {
        const result = await callBackend("/household/events", {
          method: "POST",
          body: JSON.stringify({
            type,
            description,
            context: {
              liveMatch: liveMatch ?? false,
              quietHours: quietHours ?? false,
              currentActivity: liveMatch
                ? "Watching a live match"
                : undefined,
            },
            simulateFailure: simulateFailure ?? false,
          }),
        });

        return toolResult(result);
      } catch (error) {
        return toolError("coordinate_household_event", error);
      }
    },
  );

  return server;
}

// Lightweight health check for Render.
app.get("/", (_req, res) => {
  res.status(200).json({
    service: "aegis-emergency-coordinator",
    status: "running",
  });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.all("/mcp", async (req, res) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport();

  let closed = false;

  const closeResources = async () => {
    if (closed) return;
    closed = true;

    try {
      await transport.close();
    } catch (error) {
      console.error(
        "MCP transport close error:",
        error instanceof Error
          ? error.message.slice(0, MAX_ERROR_CHARS)
          : "Unknown error",
      );
    }

    try {
      await server.close();
    } catch (error) {
      console.error(
        "MCP server close error:",
        error instanceof Error
          ? error.message.slice(0, MAX_ERROR_CHARS)
          : "Unknown error",
      );
    }
  };

  res.on("close", () => {
    void closeResources();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error(
      "MCP request failed:",
      error instanceof Error
        ? error.message.slice(0, MAX_ERROR_CHARS)
        : "Unknown error",
    );

    if (!res.headersSent && !res.writableEnded) {
      res.status(500).json({ error: "MCP request failed" });
    }

    void closeResources();
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AEGIS MCP server listening on port ${PORT}`);
  console.log(`Nova backend API: ${API_BASE}`);
});
