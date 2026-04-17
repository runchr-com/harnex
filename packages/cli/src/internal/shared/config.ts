import { z } from "zod";
import type { HarnexConfig } from "./types.js";

export const HarnexConfigSchema = z
  .object({
    executor: z.object({
      name: z.literal("opencode"),
      command: z.string().optional()
    }),
    provider: z.object({
      name: z.literal("ollama")
    }),
    model: z.object({
      default: z.string().min(1)
    }),
    workspace: z
      .object({
        root: z.string().optional()
      })
      .optional(),
    harness: z
      .object({
        default: z.enum(["openwork", "paperclip"]).optional()
      })
      .optional()
  })
  .strict();

export const DEFAULT_CONFIG: HarnexConfig = {
  executor: {
    name: "opencode",
    command: "opencode"
  },
  provider: {
    name: "ollama"
  },
  model: {
    default: "llama3"
  },
  workspace: {
    root: "."
  },
  harness: {
    default: "openwork"
  }
};

export function parseConfig(input: unknown): HarnexConfig {
  return HarnexConfigSchema.parse(input);
}
