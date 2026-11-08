import { readFile } from "node:fs/promises";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { appDefinition, toolName } from "../shared/app-definition.js";

const componentIds = z.array(z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/));
const emptyInput = z.strictObject({});

export async function loadApps() {
  const manifest = new URL("../apps.json", import.meta.url);
  const ids = componentIds.parse(JSON.parse(await readFile(manifest, "utf8")));
  const apps = [];
  const names = new Set<string>();

  for (const id of ids) {
    try {
      const entry = new URL(`../apps/${id}/app.js`, import.meta.url);
      const config = appDefinition.parse((await import(entry.href)).app);
      const name = toolName(id, config.name);
      if (name.length > 64) throw new Error("Tool name exceeds 64 characters.");
      if (names.has(name)) throw new Error(`Duplicate MCP tool name "${name}".`);

      const html = await readFile(new URL(`../views/${id}/index.html`, import.meta.url), "utf8");
      apps.push({ id, name, html, uri: `ui://${id}/index.html`, config });
      names.add(name);
    } catch (cause) {
      throw new Error(`Cannot load component "${id}".`, { cause });
    }
  }

  return apps;
}

export function registerApps(server: McpServer, apps: Awaited<ReturnType<typeof loadApps>>) {
  for (const { id, name, uri, html, config } of apps) {
    const title = config.title ?? id;
    registerAppTool(
      server,
      name,
      {
        title,
        description: config.description,
        inputSchema: config.inputSchema ?? emptyInput,
        annotations: { readOnlyHint: true },
        _meta: { ui: { resourceUri: uri } },
      },
      (input) => {
        if (id === "clock" && name === "get_server_time") {
          const time = new Date().toISOString();
          return { content: [{ type: "text", text: time }], structuredContent: { time } };
        }
        return {
          content: [{ type: "text", text: `${title} is ready to display.` }],
          structuredContent: input,
        };
      },
    );

    registerAppResource(server, title, uri, {}, async () => ({
      contents: [{
        uri,
        mimeType: RESOURCE_MIME_TYPE,
        text: html,
        ...(config.csp && { _meta: { ui: { csp: config.csp } } }),
      }],
    }));
  }
}
