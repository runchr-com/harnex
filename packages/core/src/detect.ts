import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import type { BinaryDetectionResult, DoctorReport } from "@runchr/shared";

interface DetectOptions {
  cwd?: string;
}

function commandLocator(): string {
  return process.platform === "win32" ? "where" : "which";
}

function resolveCommandPath(command: string): string | undefined {
  const found = spawnSync(commandLocator(), [command], { encoding: "utf8" });
  if (found.status !== 0) return undefined;

  const output = found.stdout.trim().split(/\r?\n/).find(Boolean);
  return output || undefined;
}

function detectVersion(command: string): string | undefined {
  const result = spawnSync(command, ["--version"], { encoding: "utf8" });
  if (result.status !== 0) return undefined;

  const line = `${result.stdout}${result.stderr}`.trim().split(/\r?\n/)[0];
  return line || undefined;
}

function detectBinary(name: "opencode" | "ollama"): BinaryDetectionResult {
  const path = resolveCommandPath(name);
  if (!path) return { name, status: "missing", message: `${name} not found` };

  const version = detectVersion(name);
  if (!version) {
    return {
      name,
      path,
      status: "invalid",
      message: `${name} found but version check failed`
    };
  }

  return { name, status: "installed", path, version };
}

function detectOllamaServer(): { reachable: boolean; models: string[] } {
  const list = spawnSync("ollama", ["list"], { encoding: "utf8" });
  if (list.status !== 0) return { reachable: false, models: [] };

  const lines = list.stdout.trim().split(/\r?\n/).slice(1);
  const models = lines.flatMap((line: string) => {
    const name = line.trim().split(/\s+/)[0];
    return name ? [name] : [];
  });

  return { reachable: true, models };
}

export function generateDoctorReport(options: DetectOptions = {}): DoctorReport {
  const cwd = options.cwd ?? process.cwd();
  const configPath = join(cwd, ".harnex", "config.json");
  const opencode = detectBinary("opencode");
  const ollama = detectBinary("ollama");

  const ollamaRuntime =
    ollama.status === "installed" ? detectOllamaServer() : { reachable: false, models: [] };

  return {
    os: process.platform,
    ...(process.env.SHELL ? { shell: process.env.SHELL } : {}),
    opencode,
    ollama,
    ollamaServerReachable: ollamaRuntime.reachable,
    installedModels: ollamaRuntime.models,
    configFound: existsSync(configPath)
  };
}
