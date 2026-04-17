import { spawn } from "node:child_process";

export interface BuildRunCommandInput {
  executor: "opencode";
  provider: "ollama";
  model: string;
  task?: string;
  cwd: string;
}

export interface RunCommand {
  command: string;
  args: string[];
  cwd: string;
}

function buildModelSpec(provider: string, model: string): string {
  if (model.includes("/")) return model;
  return `${provider}/${model}`;
}

export function buildRunCommand(input: BuildRunCommandInput): RunCommand {
  const model = buildModelSpec(input.provider, input.model);
  const args: string[] = [];

  if (input.task) {
    args.push("run", "--dir", input.cwd, "--model", model, input.task);
  } else {
    args.push(input.cwd, "--model", model);
  }

  return {
    command: input.executor,
    args,
    cwd: input.cwd
  };
}

export async function executeRunCommand(command: RunCommand): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const child = spawn(command.command, command.args, {
      cwd: command.cwd,
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("close", (code: number | null) => resolve(code ?? 1));
  });
}
