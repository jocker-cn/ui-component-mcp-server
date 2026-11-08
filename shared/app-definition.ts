import { z } from "zod";

export const appDefinition = z.strictObject({
  description: z.string().trim().min(1),
  name: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/).optional(),
  title: z.string().trim().min(1).optional(),
  inputSchema: z.instanceof(z.ZodObject).optional(),
  csp: z.strictObject({
    resourceDomains: z.array(z.string()).optional(),
    connectDomains: z.array(z.string()).optional(),
    frameDomains: z.array(z.string()).optional(),
    baseUriDomains: z.array(z.string()).optional(),
  }).optional(),
});

export type AppDefinition = z.infer<typeof appDefinition>;

export function toolName(id: string, name?: string) {
  return name ?? `show_${id.replaceAll("-", "_")}`;
}
