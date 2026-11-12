# MCP Component Server

用 React 和 TypeScript 开发组件，用 Zod 描述 MCP 工具。每个组件目录只需要两个入口文件：

```text
apps/order-details/
  View.tsx    # 默认导出 React 组件
  app.ts      # 导出工具描述和可选的 Zod 输入 schema
```

## 开发和启动

需要 Node.js 22.12 或更新版本。

```sh
npm ci
npm run dev -- order-details
```

Vite 会输出所选组件的预览地址。准备发布时运行：

```sh
npm run build
npm test
npm start
```
构建时项目会生成单文件 HTML，服务启动后用官方 MCP Apps SDK 注册工具和资源。新增组件时，将这两个入口放进 `apps/<id>/`，然后重新构建并启动服务。

默认通过 Streamable HTTP 监听 `http://127.0.0.1:3001/mcp`。可通过 `HOST` 和 `PORT` 配置监听地址和端口。发布时复制 `dist/`、`package.json` 和 `package-lock.json`，再运行 `npm ci --omit=dev` 和 `npm start`。远程访问由部署环境控制。

本地浏览器页面跨域访问 `/mcp` 时，启动服务前用 `MCP_CORS_ORIGINS` 指定页面的 Origin，包含协议和端口。多个 Origin 用逗号分隔。默认不开放跨域访问。

```sh
MCP_CORS_ORIGINS=http://localhost:5173 npm start
```

## 声明工具

`app.ts` 导出 `app`。`description` 写清楚什么时候打开组件，`inputSchema` 用 Zod 声明参数。只有 `description` 必填。

```ts
import { z } from "zod";

export const app = {
  title: "订单详情",
  description: "用户想查看某笔订单时打开。订单号不明确时先询问。",
  inputSchema: z.object({
    orderId: z.string().describe("用户提供的订单号"),
  }),
};
```

目录名 `order-details` 默认生成工具名 `show_order_details` 和资源 `ui://order-details/index.html`。可选字段 `name` 可覆盖工具名。页面依赖外部资源时可通过 `csp` 声明域名。

## 写 React 组件

`View.tsx` 默认导出组件。服务将通过 Zod 校验的工具参数作为 `data` props 传给页面：

```tsx
export default function OrderDetails({ data }: { data?: { orderId: string } }) {
  return <p>{data?.orderId ?? "等待订单号…"}</p>;
}
```

可以用自己的 props 类型，也可以复用 `ui/view-props.ts` 中的 `AppViewProps<Data>`。共享入口还提供 `isPreview`、`isConnecting`、`isRunning`、`error` 和可选的 `call(input)`，供有需要的组件使用。内置时钟保留原来的 `get_server_time` 工具和服务器 UTC 时间结果。

## 经营看板和记录选择器

```sh
npm run dev -- analytics-dashboard
npm run dev -- record-picker
```

`show_analytics_dashboard` 展示收入折线图、区域订单条形图和渠道订单环形图。可以传 `dataset` 给看板，省略时显示标记为示例的数据。

`show_record_picker` 展示可勾选的订单表格。可以传 `records`，省略时显示示例记录，传空数组时显示空表。

### 宿主按需监听表格选择

表格在勾选、取消勾选、全选和清空时发送 JSON-RPC 通知 `notifications/mcp-component-server/selection-changed`。通知参数包含 `appId` 和本次选中的完整记录 `selectedRecords`，清空时列表为 `[]`。这是项目定义的单向通知，宿主可按需注册处理器，表格在宿主忽略通知时也能正常选择。

使用 MCP Apps `AppBridge` 的宿主可在连接前注册：

```ts
import { z } from "zod";

bridge.setNotificationHandler(
  "notifications/mcp-component-server/selection-changed",
  {
    params: z.object({
      appId: z.literal("record-picker"),
      selectedRecords: z.array(z.object({
        id: z.string(),
        customer: z.string(),
        status: z.enum(["pending", "processing", "completed"]),
        amount: z.number(),
      })),
    }),
  },
  ({ selectedRecords }) => {
    // 在宿主自己的状态里保存当前选中的记录。
    updateSelectedRecords(selectedRecords);
  },
);
```

组件用共享的 `emit(event, payload)` prop 发送通知。共享页面入口会为事件方法加上 `notifications/mcp-component-server/` 前缀，并附带当前组件 ID。
