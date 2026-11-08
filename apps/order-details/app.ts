import { z } from "zod";

export const app = {
  title: "订单详情",
  description: "Open this component with a supplied message.",
  inputSchema: z.strictObject({
    message: z.string().min(1).describe("The message to display"),
  }),
};
