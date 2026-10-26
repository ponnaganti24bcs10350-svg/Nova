
import "dotenv/config";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const app = express();

app.use(express.json({ limit: "1mb" }));

// Configure this in Render to point to the Nova API service.
const API_BASE = (
  process.env.API_BASE_URL ?? "http://localhost:3003"
).replace(/\/+$/, "");

const PORT = Number(process.env.PORT ?? process.env.MCP_PORT ?? 3002);
const BACKEND_TIMEOUT_MS = 15_000;
const MAX_TOOL_OUTPUT_LENGTH = 12_000;
const MAX_ERROR_LENGTH = 500;

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("Invalid PORT configuration.");
}

if (!API_BASE) {
  throw new Error("API_BASE_URL must be configured.");
}

type JsonRecord = Record<string, unknown>;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, MAX_ERROR_LENGTH);
  }

  return String(error).slice(0, MAX_ERROR_LENGTH);
}

function createToolResult(result: unknown) {
  let output: string;

  try {
    output = JSON.stringify(result, null, 2);
  } catch {
    output = JSON.stringify({
      error: "The backend returned an unserializable response.",
    });
  }

  if (output.length > MAX_TOOL_OUTPUT_LENGTH) {
    output = JSON.stringify({
      truncated: true,
      message:
        "The response was too large. Request a more specific result.",
      preview: output.slice(0, 2_000),
    });
  }

  return {
    content: [{ type: "text" as const, text: output }],
  };
}

async function callBackend(
  path: string,
  options: RequestInit = {}
): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "Nova backend request timed out."
        : `Could not connect to Nova backend: ${getErrorMessage(error)}`;

    throw new Error(message);
  }

  const text = await response.text();

  if (!response.ok) {
    const excerpt = text
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_ERROR_LENGTH);

    throw new Error(
      `Nova backend returned HTTP ${response.status}` +
        (excerpt ? `: ${excerpt}` : ".")
    );
  }

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(
      "Nova backend returned an invalid JSON response."
    );
  }
}

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "aegis-emergency-coordinator",
    version: "1.1.0",
  });

  server.registerTool(
    "create_emergency",
    {
      title: "Create Emergency",
      description:
        "Create a simulated emergency in AEGIS and begin its response workflow.",
      inputSchema: {},
    },
    async () => {
      const result = await callBackend("/emergencies", {
        method: "POST",
      });

      return createToolResult(result);
    }
  );

  server.registerTool(
    "list_emergencies",
    {
      title: "List Emergencies",
      description:
        "List current AEGIS emergency incidents and their statuses.",
      inputSchema: {},
    },
    async () => {
      const result = await callBackend("/emergencies");

      return createToolResult(result);
    }
  );

  server.registerTool(
    "get_emergency",
    {
      title: "Get Emergency Details",
      description:
        "Retrieve one emergency and its response timeline.",
      inputSchema: {
        id: z.string().min(1).describe("The emergency incident ID"),
      },
    },
    async ({ id }) => {
      const result = await callBackend(
        `/emergencies/${encodeURIComponent(id)}`
      );

      return createToolResult(result);
    }
  );

  server.registerTool(
    "respond_to_emergency",
    {
      title: "Respond to Emergency",
      description:
        "Record that the person is okay or that no response was received. NO_RESPONSE triggers caregiver escalation.",
      inputSchema: {
        id: z.string().min(1).describe("The emergency incident ID"),
        response: z
          .enum(["OKAY", "NO_RESPONSE"])
          .describe("The person's response"),
      },
    },
    async ({ id, response }) => {
      const result = await callBackend(
        `/emergencies/${encodeURIComponent(id)}/respond`,
        {
          method: "POST",
          body: JSON.stringify({ response }),
        }
      );

      return createToolResult(result);
    }
  );

  server.registerTool(
    "acknowledge_caregiver",
    {
      title: "Acknowledge Caregiver Alert",
      description:
        "Record acknowledgement of a primary or backup caregiver alert.",
      inputSchema: {
        id: z.string().min(1).describe("The emergency incident ID"),
        caregiver: z
          .enum(["PRIMARY", "BACKUP"])
          .describe("Which caregiver acknowledges the alert"),
      },
    },
    async ({ id, caregiver }) => {
      const result = await callBackend(
        `/emergencies/${encodeURIComponent(id)}/caregiver-ack`,
        {
          method: "POST",
          body: JSON.stringify({ caregiver }),
        }
      );

      return createToolResult(result);
    }
  );

  server.registerTool(
    "coordinate_household_event",
    {
      title: "Coordinate Household Event",
      description:
        "Submit a household event to Nova. Evaluate household context and return the selected decision and execution result.",
      inputSchema: {
        type: z
          .enum([
            "DOORBELL",
            "QUIET_HOURS",
            "CONFLICTING_REQUEST",
            "DEVICE_FAILURE",
          ])
          .describe("The type of household event"),

        description: z
          .string()
          .trim()
          .min(1)
          .max(2_000)
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
          .describe(
            "Whether to simulate action failure and test fallback recovery"
          ),
      },
    },
    async ({
      type,
      description,
      liveMatch,
      quietHours,
      simulateFailure,
    }) => {
      const body: JsonRecord = {
        type,
        description,
        context: {
          liveMatch: liveMatch ?? false,
          quietHours: quietHours ?? false,
          ...(liveMatch
            ? { currentActivity: "Watching a live match" }
            : {}),
        },
        simulateFailure: simulateFailure ?? false,
      };

      const result = await callBackend("/household/events", {
        method: "POST",
        body: JSON.stringify(body),
      });

      return createToolResult(result);
    }
  );

  return server;
}

// Health check for Render.
app.get("/", (_req, res) => {
  res.json({
    name: "AEGIS MCP Server",
    status: "running",
  });
});

app.get("/health", (_req, res) => {
  res.json({
    healthy: true,
    service: "aegis-mcp",
  });
});

// Streamable HTTP MCP endpoint.
app.all("/mcp", async (req, res) => {
  const server = createMcpServer();

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  let cleanedUp = false;

  const cleanup = async () => {
    if (cleanedUp) return;
    cleanedUp = true;

    try {
      await transport.close();
    } catch (error) {
      console.error("MCP transport cleanup failed:", getErrorMessage(error));
    }

    try {
      await server.close();
    } catch (error) {
      console.error("MCP server cleanup failed:", getErrorMessage(error));
    }
  };

  res.on("close", () => {
    void cleanup();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP request failed:", getErrorMessage(error));

    if (!res.headersSent) {
      res.status(500).json({
        error: "MCP request failed.",
        message: getErrorMessage(error),
      });
    }

    await cleanup();
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AEGIS MCP server listening on port ${PORT}`);
  console.log(`Nova API configured: ${API_BASE}`);
});
