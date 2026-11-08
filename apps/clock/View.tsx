import { useState } from "react";
import type { AppViewProps } from "../../ui/view-props.js";

export default function Clock({ data, error, isPreview, isConnecting, isRunning, call }: AppViewProps<{ time: string }>) {
  const [previewTime, setPreviewTime] = useState(() => new Date().toISOString());
  const time = isPreview ? previewTime : data?.time;
  const status = isPreview ? "Local preview · browser time" :
    isConnecting ? "Connecting to host…" : isRunning ? "Refreshing…" : "UTC";

  function refresh() {
    if (isPreview) setPreviewTime(new Date().toISOString());
    else void call?.();
  }

  return (
    <main className="clock">
      <style>{":root {\n  color-scheme: light dark;\n  font-family: system-ui, sans-serif;\n}\n\nbody {\n  margin: 0;\n  padding: 1rem;\n}\n\n.clock {\n  border: 1px solid GrayText;\n  border-radius: 0.75rem;\n  margin: 0 auto;\n  max-width: 28rem;\n  padding: 1rem;\n}\n\n.clock h1 {\n  font-size: 1rem;\n  margin: 0;\n}\n\n.clock-time {\n  font-family: ui-monospace, monospace;\n  overflow-wrap: anywhere;\n}\n\n.clock-actions {\n  align-items: center;\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.75rem;\n}\n\n.clock-actions button {\n  font: inherit;\n}"}</style>
      <h1>Server Clock</h1>
      <p className="clock-time" aria-live="polite">
        {time ? <time dateTime={time}>{time}</time> : "Waiting for time…"}
      </p>
      <div className="clock-actions">
        <button type="button" onClick={refresh} disabled={isRunning || (!isPreview && !call)}>
          Refresh time
        </button>
        <span role="status">{error ?? status}</span>
      </div>
    </main>
  );
}
