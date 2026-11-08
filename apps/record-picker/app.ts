import { z } from "zod";

export const recordSchema = z.strictObject({
  id: z.string().trim().min(1).max(64),
  customer: z.string().trim().min(1).max(80),
  status: z.enum(["pending", "processing", "completed"]),
  amount: z.number().nonnegative(),
});

export const app = {
  title: "订单记录选择器",
  description: "用户想查看并勾选一批订单记录时打开。可以传实际订单 records，省略时显示示例数据。",
  inputSchema: z.strictObject({
    records: z.array(recordSchema).max(100).refine(
      (rows) => new Set(rows.map(({ id }) => id)).size === rows.length,
      { message: "Record IDs must be unique." },
    ).optional().describe("待选择的订单记录，id 必须唯一。传空数组显示空表。"),
  }),
};
