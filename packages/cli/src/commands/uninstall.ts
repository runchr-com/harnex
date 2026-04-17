import pc from "picocolors";
import { createInterface } from "node:readline/promises";
import { spawnSync } from "node:child_process";
import { stdin as input, stdout as output } from "node:process";
import {
  getUninstallGuidance,
  removeAppLink,
  resolveAppUninstallCommand,
  resolveUninstallCommands,
  type AppName
} from "@runchr/core";
import { resolveCommandCwd } from "../utils/cwd.js";

type UninstallTarget = "all" | "shared" | "apps" | "opencode" | "ollama" | "openwork" | "paperclipai";

interface UninstallOptions {
  yes?: boolean;
  nonInteractive?: boolean;
  dryRun?: boolean;
  json?: boolean;
  cwd?: string;
}

interface UninstallStep {
  target: "opencode" | "ollama" | "openwork" | "paperclipai";
  command: string;
  args: string[];
  method: string;
  removeLink?: boolean;
}

interface UninstallResult {
  target: string;
  command: string;
  args: string[];
  ok: boolean;
  code: number;
  status: "removed" | "already-absent" | "failed";
}

function parseTarget(input: string): UninstallTarget {
  const value = input as UninstallTarget;
  if (
    value === "all" ||
    value === "shared" ||
    value === "apps" ||
    value === "opencode" ||
    value === "ollama" ||
    value === "openwork" ||
    value === "paperclipai"
  ) {
    return value;
  }
  throw new Error(`Unsupported uninstall target: ${input}`);
}

function buildSteps(target: UninstallTarget): UninstallStep[] {
  const steps: UninstallStep[] = [];
  const addShared = target === "all" || target === "shared" || target === "opencode" || target === "ollama";
  const addApps =
    target === "all" || target === "apps" || target === "openwork" || target === "paperclipai";

  if (addShared && (target === "all" || target === "shared" || target === "opencode")) {
    for (const cmd of resolveUninstallCommands("opencode")) {
      steps.push({
        target: "opencode",
        command: cmd.command,
        args: cmd.args,
        method: cmd.method
      });
    }
  }

  if (addShared && (target === "all" || target === "shared" || target === "ollama")) {
    for (const cmd of resolveUninstallCommands("ollama")) {
      steps.push({
        target: "ollama",
        command: cmd.command,
        args: cmd.args,
        method: cmd.method
      });
    }
  }

  if (addApps && (target === "all" || target === "apps" || target === "openwork")) {
    const cmd = resolveAppUninstallCommand("openwork");
    steps.push({
      target: "openwork",
      command: cmd.command,
      args: cmd.args,
      method: cmd.method,
      removeLink: true
    });
  }

  if (addApps && (target === "all" || target === "apps" || target === "paperclipai")) {
    const cmd = resolveAppUninstallCommand("paperclipai");
    steps.push({
      target: "paperclipai",
      command: cmd.command,
      args: cmd.args,
      method: cmd.method,
      removeLink: true
    });
  }

  return steps;
}

function runStep(step: UninstallStep): { code: number; output: string } {
  const result = spawnSync(step.command, step.args, { encoding: "utf8" });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  const output = `${stdout}\n${stderr}`.toLowerCase();
  return { code: result.status ?? 1, output };
}

function isBenignUninstallFailure(step: UninstallStep, output: string): boolean {
  if (step.command === "brew" && output.includes("no such keg")) return true;
  if (step.command === "brew" && output.includes("is not installed")) return true;
  if (step.command === "brew" && output.includes("is not started")) return true;
  if (step.command === "winget" && output.includes("no installed package found")) return true;
  if (step.command === "npm" && output.includes("up to date")) return true;
  if (step.command === "npm" && output.includes("not found")) return true;
  if (step.command === "opencode" && output.includes("not installed")) return true;
  if (step.command === "sh" && output.includes("no such file or directory")) return true;
  return false;
}

async function confirmExecution(nonInteractive?: boolean): Promise<boolean> {
  if (nonInteractive) return false;
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question("This will uninstall existing tools. Continue? [y/N] ");
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

function removeLinkIfNeeded(step: UninstallStep, cwd: string): void {
  if (!step.removeLink) return;
  const app = step.target as AppName;
  removeAppLink(app, cwd);
}

export async function uninstallCommand(inputTarget: string, options: UninstallOptions): Promise<number> {
  const target = parseTarget(inputTarget);
  const cwd = resolveCommandCwd(options.cwd);
  const steps = buildSteps(target);

  if (steps.length === 0) {
    console.log(pc.yellow("No uninstall command is available for this target on current OS."));
    if (target === "opencode" || target === "ollama") {
      console.log(getUninstallGuidance(target));
    }
    return 1;
  }

  if (options.dryRun) {
    if (options.json) {
      console.log(
        JSON.stringify(
          steps.map((step) => ({
            target: step.target,
            method: step.method,
            command: step.command,
            args: step.args
          })),
          null,
          2
        )
      );
      return 0;
    }
    console.log(pc.bold("HARNEX Uninstall (dry-run)"));
    console.log("");
    for (const step of steps) {
      console.log(`- [${step.target}/${step.method}] ${step.command} ${step.args.join(" ")}`);
    }
    return 0;
  }

  const approved = options.yes ? true : await confirmExecution(options.nonInteractive);
  if (!approved) {
    if (options.nonInteractive) {
      console.log("Non-interactive mode requires `--yes` to perform uninstall.");
      return 1;
    }
    console.log("Uninstall canceled.");
    return 0;
  }

  const results: UninstallResult[] = [];
  for (const step of steps) {
    const execution = runStep(step);
    const benignFailure = execution.code !== 0 && isBenignUninstallFailure(step, execution.output);
    const ok = execution.code === 0 || benignFailure;
    results.push({
      target: step.target,
      command: step.command,
      args: step.args,
      ok,
      code: execution.code,
      status: ok ? (execution.code === 0 ? "removed" : "already-absent") : "failed"
    });

    if (!ok) {
      if (step.target === "opencode" || step.target === "ollama") {
        console.log(getUninstallGuidance(step.target));
      }
      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      }
      return execution.code;
    }

    removeLinkIfNeeded(step, cwd);
  }

  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
    return 0;
  }

  console.log(pc.bold("HARNEX Uninstall"));
  console.log("");
  for (const result of results) {
    if (result.status === "removed") {
      console.log(`${pc.green("✔")} removed ${result.target}: ${result.command} ${result.args.join(" ")}`);
    } else if (result.status === "already-absent") {
      console.log(`${pc.yellow("-")} already absent ${result.target}: ${result.command} ${result.args.join(" ")}`);
    }
  }
  return 0;
}
