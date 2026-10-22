
import "dotenv/config";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const app = express();
app.use(express.json());

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3003";
const PORT = Number(process.env.MCP_PORT ?? 3002);

async function callBackend(path: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const text = await response.text();

  let result: unknown;
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = text;
  }

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}: ${text}`);
  }

  return result;
}

function toolResult(result: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
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
      const result = await callBackend("/emergencies", {
        method: "POST",
        body: JSON.stringify({}),
      });
      return toolResult(result);
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
      const result = await callBackend("/emergencies");
      return toolResult(result);
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
      const result = await callBackend(
        `/emergencies/${encodeURIComponent(id)}`,
      );
      return toolResult(result);
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
      const result = await callBackend(
        `/emergencies/${encodeURIComponent(id)}/respond`,
        {
          method: "POST",
          body: JSON.stringify({ response }),
        },
      );
      return toolResult(result);
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
      const result = await callBackend(
        `/emergencies/${encodeURIComponent(id)}/caregiver-ack`,
        {
          method: "POST",
          body: JSON.stringify({ caregiver }),
        },
      );
      return toolResult(result);
    },
  );

  server.registerTool(
    "coordinate_household_event",
    {
      title: "Coordinate Household Event",
      description:
        "Submit a household event to AEGIS. It evaluates the context, selects a simulated action, and returns the decision and execution result.",
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
          .describe("Simulate a primary action failure to test fallback recovery"),
      },
    },
    async ({
      type,
      description,
      liveMatch,
      quietHours,
      simulateFailure,
    }) => {
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
    },
  );

  return server;
}

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
      console.error("MCP transport close error:", error);
    }

    try {
      await server.close();
    } catch (error) {
      console.error("MCP server close error:", error);
    }
  };

  res.on("close", () => {
    void closeResources();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP request failed:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "MCP request failed",
      });
    }

    void closeResources();
  }
});

app.listen(PORT, () => {
  console.log(`AEGIS MCP server running at http://localhost:${PORT}/mcp`);
  console.log(`AEGIS backend API: ${API_BASE}`);
});
