import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { parseConfig } from "../shared/index.js";
import { commandExists, readAppLinks } from "./apps.js";
import { generateDoctorReport } from "./detect.js";

export interface VerifyCheck {
  id: string;
  ok: boolean;
  message: string;
}

export interface VerifyReport {
  model: string;
  scope: "shared" | "apps" | "all";
  checks: VerifyCheck[];
  success: boolean;
}

export interface VerifyOptions {
  cwd?: string;
  model?: string;
  scope?: "shared" | "apps" | "all";
}

function runCheck(id: string, ok: boolean, passMessage: string, failMessage: string): VerifyCheck {
  return {
    id,
    ok,
    message: ok ? passMessage : failMessage
  };
}

function commandRuns(command: string, args: string[]): boolean {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return result.status === 0;
}

function modelExists(installedModels: string[], target: string): boolean {
  if (installedModels.includes(target)) return true;
  if (target.includes(":")) return false;
  return installedModels.some((name) => name === target || name.startsWith(`${target}:`));
}

function validateProjectConfig(cwd: string): { ok: boolean; message: string } {
  const path = join(cwd, ".harnex", "config.json");
  try {
    const raw = readFileSync(path, "utf8");
    parseConfig(JSON.parse(raw));
    return { ok: true, message: `config valid (${path})` };
  } catch {
    return { ok: false, message: `config missing or invalid (${path})` };
  }
}

export function generateVerifyReport(options: VerifyOptions = {}): VerifyReport {
  const cwd = options.cwd ?? process.cwd();
  const doctor = generateDoctorReport({ cwd });
  const targetModel = options.model ?? "llama3";
  const scope = options.scope ?? "all";
  const checks: VerifyCheck[] = [];

  if (scope === "shared" || scope === "all") {
    checks.push(
      runCheck(
        "opencode-installed",
        doctor.opencode.status === "installed",
        "opencode is installed",
        "opencode is missing or invalid"
      )
    );

    checks.push(
      runCheck(
        "opencode-command",
        doctor.opencode.status === "installed" && commandRuns("opencode", ["--help"]),
        "opencode command execution is healthy",
        "opencode command failed to execute"
      )
    );

    checks.push(
      runCheck(
        "ollama-installed",
        doctor.ollama.status === "installed",
        "ollama is installed",
        "ollama is missing or invalid"
      )
    );

    checks.push(
      runCheck(
        "ollama-server",
        doctor.ollamaServerReachable,
        "ollama server is reachable",
        "ollama server is not reachable"
      )
    );

    checks.push(
      runCheck(
        "model-available",
        modelExists(doctor.installedModels, targetModel),
        `model is available (${targetModel})`,
        `model not found (${targetModel})`
      )
    );

    const config = validateProjectConfig(cwd);
    checks.push({
      id: "config-valid",
      ok: config.ok,
      message: config.message
    });
  }

  if (scope === "apps" || scope === "all") {
    const links = readAppLinks(cwd);
    const linkedApps = Object.values(links.apps).filter(Boolean);
    if (linkedApps.length === 0) {
      checks.push({
        id: "apps-linked",
        ok: true,
        message: "no linked apps (skip)"
      });
    } else {
      for (const app of linkedApps) {
        checks.push(
          runCheck(
            `app-${app.app}-command`,
            commandExists(app.command),
            `${app.app} command is available (${app.command})`,
            `${app.app} command not found (${app.command})`
          )
        );
      }
    }
  }

  const success = checks.every((check) => check.ok);
  return { model: targetModel, scope, checks, success };
}
