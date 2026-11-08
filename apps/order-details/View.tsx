import type { z } from "zod";
import type { AppViewProps } from "../../ui/view-props.js";
import type { app } from "./app.js";

type OrderData = z.output<typeof app.inputSchema>;

export default function OrderDetails({ data, error, isPreview }: AppViewProps<OrderData>) {
  return (
    <main>
      <h1>订单详情</h1>
      <p id="message">{error ?? data?.message ?? (isPreview ? "本地预览" : "等待数据…")}</p>
    </main>
  );
}
