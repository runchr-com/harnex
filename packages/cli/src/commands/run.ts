import pc from "picocolors";
import { buildRunCommand, executeRunCommand, resolveConfig } from "@runchr/core";
import { resolveCommandCwd } from "../utils/cwd.js";

interface RunOptions {
  task?: string;
  model?: string;
  provider?: string;
  cwd?: string;
  dryRun?: boolean;
  json?: boolean;
}

export async function runCommand(options: RunOptions): Promise<number> {
  const cwd = resolveCommandCwd(options.cwd);
  const overrides: {
    provider?: { name: "ollama" };
    model?: { default: string };
  } = {};

  if (options.provider === "ollama") {
    overrides.provider = { name: "ollama" };
  }
  if (options.model) {
    overrides.model = { default: options.model };
  }

  const resolved = resolveConfig({
    cwd,
    overrides
  });

  const runInput: {
    executor: "opencode";
    provider: "ollama";
    model: string;
    cwd: string;
    task?: string;
  } = {
    executor: resolved.executor.name,
    provider: resolved.provider.name,
    model: resolved.model.default,
    cwd
  };
  if (options.task) {
    runInput.task = options.task;
  }

  const command = buildRunCommand(runInput);

  if (options.json) {
    console.log(JSON.stringify(command, null, 2));
    return 0;
  }

  if (options.dryRun) {
    console.log(pc.bold("HARNEX Run (dry-run)"));
    console.log(`${command.command} ${command.args.join(" ")}`);
    return 0;
  }

  return await executeRunCommand(command);
}
