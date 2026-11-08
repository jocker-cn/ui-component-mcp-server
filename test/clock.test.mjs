import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

test("React components and Zod descriptions expose working MCP tools and resources", { timeout: 15_000 }, async (t) => {
  const server = spawn(process.execPath, ["dist/server/main.js"], {
    env: { ...process.env, HOST: "127.0.0.1", PORT: "0" },
    stdio: ["ignore", "pipe", "inherit"],
  });
  t.after(() => server.kill());

  const endpoint = await Promise.race([
    once(server.stdout, "data").then(([output]) => output.toString().trim().split(" ").at(-1)),
    once(server, "exit").then(([code]) => {
      throw new Error(`MCP Server exited before listening (code ${code})`);
    }),
  ]);

  const client = new Client({ name: "clock-smoke-test", version: "0.1.0" }, {
    capabilities: {
      extensions: { "io.modelcontextprotocol/ui": { mimeTypes: ["text/html;profile=mcp-app"] } },
    },
  });
  t.after(() => client.close());

  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint)));
  const { tools } = await client.listTools();
  const tool = tools.find(({ name }) => name === "get_server_time");
  const uri = tool?._meta?.ui?.resourceUri;
  assert.equal(uri, "ui://clock/index.html");

  const result = await client.callTool({ name: tool.name, arguments: {} });
  assert.ok(!result.isError);
  const time = result.structuredContent.time;
  assert.equal(new Date(time).toISOString(), time);
  assert.equal(result.content[0].text, time);

  const { contents: [resource] } = await client.readResource({ uri });
  assert.equal(resource.uri, uri);
  assert.equal(resource.mimeType, "text/html;profile=mcp-app");
  assert.equal(resource.text, await readFile("dist/views/clock/index.html", "utf8"));
  assert.doesNotMatch(resource.text, /<script[^>]+src=|<link[^>]+stylesheet/);

  const order = tools.find(({ name }) => name === "show_order_details");
  assert.equal(order?._meta?.ui?.resourceUri, "ui://order-details/index.html");
  assert.deepEqual(order.inputSchema.required, ["message"]);
  const input = { message: "订单 A123" };
  const orderResult = await client.callTool({ name: order.name, arguments: input });
  assert.deepEqual(orderResult.structuredContent, input);
  const invalid = await client.callTool({ name: order.name, arguments: {} })
    .catch(() => ({ isError: true }));
  assert.equal(invalid.isError, true);

  const { contents: [orderView] } = await client.readResource({ uri: order._meta.ui.resourceUri });
  assert.equal(orderView.mimeType, "text/html;profile=mcp-app");
  assert.equal(orderView.text, await readFile("dist/views/order-details/index.html", "utf8"));
  assert.doesNotMatch(orderView.text, /<script[^>]+src=|<link[^>]+stylesheet/);
  const dataset = {
    trend: [{ period: "1月", revenue: 9000 }, { period: "2月", revenue: 13000 }],
    regions: [{ name: "华东", orders: 18 }],
    channels: [{ name: "电商", orders: 18 }],
  };
  const records = [{ id: "SO-101", customer: "青禾商贸", status: "pending", amount: 3860 }];

  for (const [id, args] of [
    ["analytics-dashboard", { dataset }],
    ["record-picker", { records }],
  ]) {
    const name = `show_${id.replaceAll("-", "_")}`;
    const tool = tools.find((item) => item.name === name);
    assert.equal(tool?._meta?.ui?.resourceUri, `ui://${id}/index.html`);
    const result = await client.callTool({ name, arguments: args });
    assert.deepEqual(result.structuredContent, args);
    const { contents: [view] } = await client.readResource({ uri: tool._meta.ui.resourceUri });
    assert.equal(view.mimeType, "text/html;profile=mcp-app");
    assert.equal(view.text, await readFile(`dist/views/${id}/index.html`, "utf8"));
  }

  const duplicate = await client.callTool({
    name: "show_record_picker",
    arguments: { records: [records[0], records[0]] },
  }).catch(() => ({ isError: true }));
  assert.equal(duplicate.isError, true);
});
