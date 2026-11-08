import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { app as definition } from "@component/app";
import View from "@component/view";
import { toolName } from "../shared/app-definition.js";

const name = toolName(__COMPONENT_ID__, definition.name);
const title = definition.title ?? __COMPONENT_ID__;

function HostedView() {
  const [data, setData] = useState<Record<string, unknown>>();
  const [error, setError] = useState<string>();
  const [isRunning, setIsRunning] = useState(false);
  const running = useRef(false);

  function showResult(result: { isError?: boolean; structuredContent?: unknown }) {
    const next = result.structuredContent;
    if (result.isError || !next || typeof next !== "object" || Array.isArray(next)) {
      setError("Could not load the component data.");
      return;
    }
    setData(next as Record<string, unknown>);
    setError(undefined);
  }

  const { app, isConnected, error: connectionError } = useApp({
    appInfo: { name: title, version: "0.1.0" },
    capabilities: {},
    onAppCreated(createdApp) {
      createdApp.addEventListener("toolresult", showResult);
      createdApp.addEventListener("toolcancelled", () => setError("The tool call was cancelled."));
    },
  });

  const canCall = isConnected && Boolean(app?.getHostCapabilities()?.serverTools);

  async function call(input: Record<string, unknown> = {}) {
    if (!app || !canCall || running.current) return;

    running.current = true;
    setIsRunning(true);
    setError(undefined);
    try {
      showResult(await app.callServerTool({ name, arguments: input }));
    } catch {
      setError("Could not call the component tool.");
    } finally {
      running.current = false;
      setIsRunning(false);
    }
  }

  const emit = app && isConnected
    ? (event: string, payload: Record<string, unknown>) => app.notification({
        method: `notifications/mcp-component-server/${event}`,
        params: { ...payload, appId: __COMPONENT_ID__ },
      })
    : undefined;

  return (
    <View
      data={data}
      error={connectionError?.message ?? error}
      isPreview={false}
      isConnecting={!isConnected && !connectionError}
      isRunning={isRunning}
      call={canCall ? call : undefined}
      emit={emit}
    />
  );
}

document.title = title;
const root = document.getElementById("root");
if (!root) throw new Error("Missing app root element.");
createRoot(root).render(window.parent === window
  ? <View isPreview isConnecting={false} isRunning={false} />
  : <HostedView />);
