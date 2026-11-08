import { z } from "zod";

const label = z.string().trim().min(1).max(40);
const count = z.number().int().nonnegative();

export const analyticsDataset = z.strictObject({
  trend: z.array(z.strictObject({
    period: label,
    revenue: z.number().nonnegative(),
  })).min(2).max(24),
  regions: z.array(z.strictObject({
    name: label,
    orders: count,
  })).min(1).max(12),
  channels: z.array(z.strictObject({
    name: label,
    orders: count,
  })).min(1).max(8),
}).describe("真实经营数据，包含收入趋势、各区域订单和各渠道订单。没有真实数据时省略，页面会标注示例数据。");

export const app = {
  title: "经营分析看板",
  description: "用户想查看经营看板、收入走势、区域订单对比或渠道占比时打开。提供真实统计数据时传 dataset，没有时可打开带标记的示例看板。",
  inputSchema: z.strictObject({ dataset: analyticsDataset.optional() }),
};
