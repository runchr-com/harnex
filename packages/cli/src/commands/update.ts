import pc from "picocolors";
import { createInterface } from "node:readline/promises";
import { spawnSync } from "node:child_process";
import { stdin as input, stdout as output } from "node:process";
import {
  getUpdateGuidance,
  resolveAppUpdateCommand,
  resolveUpdateCommands
} from "../internal/core/index.js";

type UpdateTarget = "all" | "shared" | "apps" | "opencode" | "ollama" | "openwork" | "paperclipai";

interface UpdateOptions {
  yes?: boolean;
  nonInteractive?: boolean;
  dryRun?: boolean;
  json?: boolean;
}

interface UpdateStep {
  target: "opencode" | "ollama" | "openwork" | "paperclipai";
  method: string;
  command: string;
  args: string[];
}

interface UpdateResult {
  target: string;
  method: string;
  command: string;
  args: string[];
  ok: boolean;
  code: number;
  status: "updated" | "already-latest" | "failed";
}

function parseTarget(inputTarget: string): UpdateTarget {
  const value = inputTarget as UpdateTarget;
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
  throw new Error(`Unsupported update target: ${inputTarget}`);
}

function buildSteps(target: UpdateTarget): UpdateStep[] {
  const steps: UpdateStep[] = [];
  const addShared = target === "all" || target === "shared" || target === "opencode" || target === "ollama";
  const addApps =
    target === "all" || target === "apps" || target === "openwork" || target === "paperclipai";

  if (addShared && (target === "all" || target === "shared" || target === "opencode")) {
    for (const cmd of resolveUpdateCommands("opencode")) {
      steps.push({
        target: "opencode",
        method: cmd.method,
        command: cmd.command,
        args: cmd.args
      });
    }
  }

  if (addShared && (target === "all" || target === "shared" || target === "ollama")) {
    for (const cmd of resolveUpdateCommands("ollama")) {
      steps.push({
        target: "ollama",
        method: cmd.method,
        command: cmd.command,
        args: cmd.args
      });
    }
  }

  if (addApps && (target === "all" || target === "apps" || target === "openwork")) {
    const cmd = resolveAppUpdateCommand("openwork");
    steps.push({
      target: "openwork",
      method: cmd.method,
      command: cmd.command,
      args: cmd.args
    });
  }

  if (addApps && (target === "all" || target === "apps" || target === "paperclipai")) {
    const cmd = resolveAppUpdateCommand("paperclipai");
    steps.push({
      target: "paperclipai",
      method: cmd.method,
      command: cmd.command,
      args: cmd.args
    });
  }

  return steps;
}

async function confirmExecution(nonInteractive?: boolean): Promise<boolean> {
  if (nonInteractive) return false;
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question("Run update commands now? [y/N] ");
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

function runStep(step: UpdateStep): { code: number; output: string } {
  const result = spawnSync(step.command, step.args, { encoding: "utf8" });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  return {
    code: result.status ?? 1,
    output: `${stdout}\n${stderr}`.toLowerCase()
  };
}

function isBenignUpdateFailure(step: UpdateStep, output: string): boolean {
  if (step.command === "brew" && output.includes("already installed")) return true;
  if (step.command === "brew" && output.includes("already up-to-date")) return true;
  if (step.command === "brew" && output.includes("not installed")) return true;
  if (step.command === "npm" && output.includes("up to date")) return true;
  if (step.command === "winget" && output.includes("no available upgrade found")) return true;
  if (step.command === "winget" && output.includes("no installed package found")) return true;
  if (step.command === "opencode" && output.includes("already up to date")) return true;
  return false;
}

export async function updateCommand(inputTarget: string, options: UpdateOptions): Promise<number> {
  const target = parseTarget(inputTarget);
  const steps = buildSteps(target);

  if (steps.length === 0) {
    console.log(pc.yellow("No update command is available for this target on current OS."));
    if (target === "opencode" || target === "ollama") {
      console.log(getUpdateGuidance(target));
    }
    return 1;
  }

  if (options.dryRun) {
    const payload = steps.map((step) => ({
      target: step.target,
      method: step.method,
      command: step.command,
      args: step.args
    }));
    if (options.json) {
      console.log(JSON.stringify(payload, null, 2));
      return 0;
    }
    console.log(pc.bold("HARNEX Update (dry-run)"));
    console.log("");
    for (const step of steps) {
      console.log(`- [${step.target}/${step.method}] ${step.command} ${step.args.join(" ")}`);
    }
    return 0;
  }

  const approved = options.yes ? true : await confirmExecution(options.nonInteractive);
  if (!approved) {
    if (options.nonInteractive) {
      console.log("Non-interactive mode requires `--yes` to perform updates.");
      return 1;
    }
    console.log("Update canceled.");
    return 0;
  }

  const results: UpdateResult[] = [];
  for (const step of steps) {
    const execution = runStep(step);
    const benignFailure = execution.code !== 0 && isBenignUpdateFailure(step, execution.output);
    const ok = execution.code === 0 || benignFailure;
    results.push({
      target: step.target,
      method: step.method,
      command: step.command,
      args: step.args,
      ok,
      code: execution.code,
      status: ok ? (execution.code === 0 ? "updated" : "already-latest") : "failed"
    });

    if (!ok) {
      if (step.target === "opencode" || step.target === "ollama") {
        console.log(getUpdateGuidance(step.target));
      }
      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      }
      return execution.code;
    }
  }

  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
    return 0;
  }

  console.log(pc.bold("HARNEX Update"));
  console.log("");
  for (const result of results) {
    if (result.status === "updated") {
      console.log(`${pc.green("✔")} updated ${result.target}: ${result.command} ${result.args.join(" ")}`);
    } else if (result.status === "already-latest") {
      console.log(
        `${pc.yellow("-")} already latest ${result.target}: ${result.command} ${result.args.join(" ")}`
      );
    }
  }
  return 0;
}
