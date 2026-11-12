import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { McpServer } from "@modelcontextprotocol/server";
import { loadApps, registerApps } from "./catalog.js";

const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? "3001");
const corsOrigins = new Set(process.env.MCP_CORS_ORIGINS?.split(",").map((origin) => origin.trim()));
const app = createMcpExpressApp({ host });
const components = await loadApps();

app.all("/mcp", (request, response, next) => {
  response.vary("Origin");
  const origin = request.get("Origin");
  if (origin && corsOrigins.has(origin)) {
    response.set("Access-Control-Allow-Origin", origin);
    if (request.method === "OPTIONS") {
      response.set("Access-Control-Allow-Methods", "GET, POST, DELETE");
      response.set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, Last-Event-ID, Mcp-Method, Mcp-Name, Mcp-Protocol-Version, Mcp-Session-Id");
      response.status(204).end();
      return;
    }
  }
  next();
});

app.all("/mcp", async (request, response) => {
  const server = new McpServer({ name: "mcp-component-server", version: "0.1.0" });
  registerApps(server, components);

  const transport = new NodeStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  response.once("close", () => {
    void server.close().catch((error) => console.error("MCP close failed", error));
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(request, response, request.body);
  } catch (error) {
    console.error("MCP request failed", error);
    if (!response.headersSent) {
      response.status(500).json({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32603, message: "Internal server error" },
      });
    }
  }
});

const httpServer = app.listen(port, host, (error) => {
  if (error) {
    console.error(error);
    process.exitCode = 1;
    return;
  }

  const address = httpServer.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  console.log(`MCP Server listening at http://${host}:${actualPort}/mcp`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => httpServer.close());
}
