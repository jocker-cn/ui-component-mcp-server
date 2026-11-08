import { useState } from "react";
import type { z } from "zod";
import type { AppViewProps } from "../../ui/view-props.js";
import type { recordSchema } from "./app.js";
import "./style.css";

type OrderRecord = z.output<typeof recordSchema>;

const example: OrderRecord[] = [
  { id: "SO-24061", customer: "青禾商贸", status: "pending", amount: 3860 },
  { id: "SO-24062", customer: "海桐科技", status: "processing", amount: 12480 },
  { id: "SO-24063", customer: "西岭供应链", status: "completed", amount: 7950 },
  { id: "SO-24064", customer: "星舟零售", status: "processing", amount: 2180 },
  { id: "SO-24065", customer: "远川工业", status: "completed", amount: 15600 },
];

const statusLabels: Record<OrderRecord["status"], string> = {
  pending: "待处理",
  processing: "处理中",
  completed: "已完成",
};

const currency = new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" });
const emptySelection = new Set<string>();

export default function RecordPicker({ data, isPreview, error, emit }: AppViewProps<{ records?: OrderRecord[] }>) {
  const [selection, setSelection] = useState<{ rows: OrderRecord[]; ids: Set<string> }>();
  const [deliveryError, setDeliveryError] = useState(false);

  if (!data && !isPreview) {
    return <main className="record-picker"><p role="status">{error ?? "正在加载订单记录…"}</p></main>;
  }

  const rows = data?.records ?? example;
  const selected = selection?.rows === rows ? selection.ids : emptySelection;
  const allSelected = rows.length > 0 && selected.size === rows.length;
  const partiallySelected = selected.size > 0 && !allSelected;
  const interactive = isPreview || Boolean(emit);

  function updateSelection(ids: Set<string>) {
    setSelection({ rows, ids });
    setDeliveryError(false);
    if (emit) {
      const selectedRecords = rows.filter(({ id }) => ids.has(id));
      void emit("selection-changed", { selectedRecords }).catch(() => setDeliveryError(true));
    }
  }

  function toggleRecord(id: string, checked: boolean) {
    const ids = new Set(selected);
    if (checked) ids.add(id);
    else ids.delete(id);
    updateSelection(ids);
  }

  return (
    <main className="record-picker">
      <header className="record-header">
        <div>
          <p className="record-eyebrow">订单工作台</p>
          <h1>订单记录选择器</h1>
          <p className="record-subtitle">勾选要交给宿主的记录。</p>
        </div>
        {!data?.records && <span className="record-badge">示例数据</span>}
      </header>
      <section className="record-card" aria-label="可选订单">
        <div className="record-toolbar">
          <p role="status" aria-live="polite">已选 <strong>{selected.size}</strong> / {rows.length} 条</p>
          <button type="button" disabled={!interactive || selected.size === 0} onClick={() => updateSelection(new Set())}>
            清空选择
          </button>
        </div>
        <div className="record-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">
                  <input
                    type="checkbox"
                    aria-label="全选记录"
                    ref={(element) => { if (element) element.indeterminate = partiallySelected; }}
                    checked={allSelected}
                    disabled={!interactive || rows.length === 0}
                    onChange={(event) => updateSelection(new Set(event.target.checked ? rows.map(({ id }) => id) : []))}
                  />
                </th>
                <th scope="col">订单号</th>
                <th scope="col">客户</th>
                <th scope="col">状态</th>
                <th scope="col" className="record-amount">金额</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} data-selected={selected.has(row.id)}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`选择订单 ${row.id}`}
                      checked={selected.has(row.id)}
                      disabled={!interactive}
                      onChange={(event) => toggleRecord(row.id, event.target.checked)}
                    />
                  </td>
                  <th scope="row" className="record-id">{row.id}</th>
                  <td>{row.customer}</td>
                  <td><span className={`record-status record-status-${row.status}`}>{statusLabels[row.status]}</span></td>
                  <td className="record-amount">{currency.format(row.amount)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="record-empty">没有可选的订单记录。</td></tr>}
            </tbody>
          </table>
        </div>
        {deliveryError && <p className="record-error" role="alert">选择已更新，通知发送失败。</p>}
      </section>
    </main>
  );
}
