import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_CONFIG, parseConfig, type HarnexConfig } from "@runchr/shared";

interface LoadConfigResult {
  config: HarnexConfig;
  found: boolean;
  path: string;
}

interface ResolveConfigOptions {
  cwd?: string;
  overrides?: Partial<HarnexConfig>;
}

function mergeConfig(base: HarnexConfig, override?: Partial<HarnexConfig>): HarnexConfig {
  if (!override) return base;

  return {
    ...base,
    ...override,
    executor: { ...base.executor, ...override.executor },
    provider: { ...base.provider, ...override.provider },
    model: { ...base.model, ...override.model },
    workspace: { ...base.workspace, ...override.workspace },
    harness: { ...base.harness, ...override.harness }
  };
}

export function loadProjectConfig(cwd = process.cwd()): LoadConfigResult {
  const path = join(cwd, ".harnex", "config.json");

  try {
    const raw = readFileSync(path, "utf8");
    const parsed = parseConfig(JSON.parse(raw));
    return { config: parsed, found: true, path };
  } catch {
    return { config: DEFAULT_CONFIG, found: false, path };
  }
}

export function resolveConfig(options: ResolveConfigOptions = {}): HarnexConfig {
  const cwd = options.cwd ?? process.cwd();
  const { config } = loadProjectConfig(cwd);
  return mergeConfig(config, options.overrides);
}
