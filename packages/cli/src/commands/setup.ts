import pc from "picocolors";
import { createInterface } from "node:readline/promises";
import { spawn } from "node:child_process";
import { stdin as input, stdout as output } from "node:process";
import {
  buildSetupPlan,
  generateDoctorReport,
  getInstallGuidance,
  resolveInstallCommand,
  type InstallCommand,
  type InstallMethod
} from "../internal/core/index.js";
import type { SetupAction } from "../internal/core/index.js";
import { resolveCommandCwd } from "../utils/cwd.js";

interface SetupOptions {
  yes?: boolean;
  withModel?: boolean;
  withConfig?: boolean;
  model?: string;
  method?: InstallMethod;
  nonInteractive?: boolean;
  json?: boolean;
  cwd?: string;
}

function runInstall(command: InstallCommand): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const child = spawn(command.command, command.args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code: number | null) => resolve(code ?? 1));
  });
}

function getInstallActions(actions: SetupAction[]): SetupAction[] {
  return actions.filter(
    (action) => action.type === "install-opencode" || action.type === "install-ollama"
  );
}

async function confirmExecution(nonInteractive?: boolean): Promise<boolean> {
  if (nonInteractive) return false;

  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question("Install missing prerequisites now? [y/N] ");
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

export async function setupCommand(options: SetupOptions): Promise<number> {
  const detectOptions: { cwd?: string } = {};
  detectOptions.cwd = resolveCommandCwd(options.cwd);
  const report = generateDoctorReport(detectOptions);

  const planOptions: { model?: string; includeModel?: boolean; includeConfig?: boolean } = {};
  if (options.model) {
    planOptions.model = options.model;
  }
  if (options.withModel) {
    planOptions.includeModel = true;
  }
  if (options.withConfig) {
    planOptions.includeConfig = true;
  }

  const plan = buildSetupPlan(report, planOptions);

  if (options.json) {
    console.log(JSON.stringify(plan, null, 2));
    return 0;
  }

  console.log(pc.bold("HARNEX Setup (Phase 1: prerequisites)"));
  console.log("");
  for (const action of plan.actions) {
    const required = action.required ? "required" : "optional";
    console.log(`- ${action.type} (${required}): ${action.target}`);
  }

  const installActions = getInstallActions(plan.actions);
  if (installActions.length === 0) {
    console.log("");
    console.log(pc.green("No prerequisite installs needed. opencode/ollama already satisfied."));
    console.log("Deferred: openwork/paperclip setup should run after doctor/verify confirmation.");
    return 0;
  }

  const approved = options.yes ? true : await confirmExecution(options.nonInteractive);
  if (!approved) {
    console.log("");
    if (options.nonInteractive) {
      console.log("Non-interactive mode requires `--yes` to perform installs.");
      return 1;
    }
    console.log("Install canceled.");
    return 0;
  }

  console.log("");
  for (const action of installActions) {
    if (action.type === "install-opencode") {
      const command = resolveInstallCommand({ target: "opencode", method: options.method ?? "auto" });
      if (!command) {
        console.log(pc.red("No supported installer found for opencode on this OS."));
        console.log(getInstallGuidance("opencode"));
        return 1;
      }
      console.log(`Installing opencode via ${command.method}...`);
      const code = await runInstall(command);
      if (code !== 0) {
        console.log(pc.red("Failed to install opencode."));
        return code;
      }
    }
    if (action.type === "install-ollama") {
      const command = resolveInstallCommand({ target: "ollama", method: options.method ?? "auto" });
      if (!command) {
        console.log(pc.red("No supported installer found for ollama on this OS."));
        console.log(getInstallGuidance("ollama"));
        return 1;
      }
      console.log(`Installing ollama via ${command.method}...`);
      const code = await runInstall(command);
      if (code !== 0) {
        console.log(pc.red("Failed to install ollama."));
        return code;
      }
    }
  }

  console.log("");
  console.log(pc.green("Prerequisite install phase completed."));
  console.log("Next: run `harnex init`, then `harnex install <openwork|paperclipai>`, then `harnex link <app>`.");

  return 0;
}
