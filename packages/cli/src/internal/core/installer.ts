import { spawnSync } from "node:child_process";

export type InstallTarget = "opencode" | "ollama";
export type InstallMethod = "auto" | "brew" | "npm" | "winget" | "ollama-script";
export type UninstallMethod = "brew" | "npm" | "winget" | "opencode-cli" | "shell";
export type UpdateMethod = "brew" | "npm" | "winget" | "opencode-cli" | "ollama-script";

export interface InstallCommand {
  method: Exclude<InstallMethod, "auto">;
  target: InstallTarget;
  command: string;
  args: string[];
}

export interface UninstallCommand {
  method: UninstallMethod;
  target: InstallTarget;
  command: string;
  args: string[];
}

export interface UpdateCommand {
  method: UpdateMethod;
  target: InstallTarget;
  command: string;
  args: string[];
}

function commandLocator(): string {
  return process.platform === "win32" ? "where" : "which";
}

function hasCommand(command: string): boolean {
  return spawnSync(commandLocator(), [command], { stdio: "ignore" }).status === 0;
}

export function isCommandAvailable(command: string): boolean {
  return hasCommand(command);
}

function resolveAutoMethod(target: InstallTarget): Exclude<InstallMethod, "auto"> | undefined {
  if (target === "opencode") {
    if (hasCommand("npm")) return "npm";
    if (hasCommand("brew")) return "brew";
    return undefined;
  }

  if (process.platform === "darwin" && hasCommand("brew")) return "brew";
  if (process.platform === "linux" && hasCommand("curl") && hasCommand("sh")) return "ollama-script";
  if (process.platform === "win32" && hasCommand("winget")) return "winget";
  return undefined;
}

function supportsMethodForTarget(
  method: Exclude<InstallMethod, "auto">,
  target: InstallTarget
): boolean {
  if (method === "brew") return hasCommand("brew");
  if (method === "npm") return target === "opencode" && hasCommand("npm");
  if (method === "winget") return target === "ollama" && hasCommand("winget");
  if (method === "ollama-script") {
    return target === "ollama" && process.platform === "linux" && hasCommand("curl") && hasCommand("sh");
  }
  return false;
}

export function resolveInstallCommand(input: {
  target: InstallTarget;
  method: InstallMethod;
}): InstallCommand | undefined {
  const method = input.method === "auto" ? resolveAutoMethod(input.target) : input.method;
  if (!method) return undefined;
  if (!supportsMethodForTarget(method, input.target)) return undefined;

  if (method === "brew") {
    return {
      method,
      target: input.target,
      command: "brew",
      args: ["install", input.target]
    };
  }

  if (method === "npm") {
    return {
      method,
      target: input.target,
      command: "npm",
      args: ["install", "-g", "opencode-ai"]
    };
  }

  if (method === "winget") {
    return {
      method,
      target: input.target,
      command: "winget",
      args: ["install", "--id", "Ollama.Ollama", "-e"]
    };
  }

  return {
    method,
    target: input.target,
    command: "sh",
    args: ["-c", "curl -fsSL https://ollama.com/install.sh | sh"]
  };
}

export function getInstallGuidance(target: InstallTarget): string {
  if (target === "opencode") {
    return "Install manually via `npm install -g opencode-ai` or `brew install opencode`.";
  }

  if (process.platform === "darwin") {
    return "Install manually via `brew install ollama`.";
  }
  if (process.platform === "linux") {
    return "Install manually via `curl -fsSL https://ollama.com/install.sh | sh`.";
  }
  if (process.platform === "win32") {
    return "Install manually via `winget install --id Ollama.Ollama -e`.";
  }

  return "Install Ollama manually from https://ollama.com/download.";
}

export function resolveUninstallCommands(target: InstallTarget): UninstallCommand[] {
  if (target === "opencode") {
    const commands: UninstallCommand[] = [];
    if (hasCommand("opencode")) {
      commands.push({
        method: "opencode-cli",
        target,
        command: "opencode",
        args: ["uninstall", "--force"]
      });
    }
    if (hasCommand("brew")) {
      commands.push({
        method: "brew",
        target,
        command: "brew",
        args: ["uninstall", "opencode"]
      });
    }
    if (hasCommand("npm")) {
      commands.push({
        method: "npm",
        target,
        command: "npm",
        args: ["uninstall", "-g", "opencode-ai"]
      });
    }
    return commands;
  }

  if (process.platform === "darwin" && hasCommand("brew")) {
    const commands: UninstallCommand[] = [
      {
        method: "brew",
        target,
        command: "brew",
        args: ["services", "stop", "ollama"]
      },
      {
        method: "brew",
        target,
        command: "brew",
        args: ["uninstall", "ollama"]
      }
    ];
    commands.push({
      method: "shell",
      target,
      command: "sh",
      args: [
        "-c",
        "osascript -e 'quit app \"Ollama\"' >/dev/null 2>&1 || true; rm -f /usr/local/bin/ollama; rm -rf /Applications/Ollama.app"
      ]
    });
    return commands;
  }

  if (process.platform === "win32" && hasCommand("winget")) {
    return [
      {
        method: "winget",
        target,
        command: "winget",
        args: ["uninstall", "--id", "Ollama.Ollama", "-e"]
      }
    ];
  }

  return [];
}

export function getUninstallGuidance(target: InstallTarget): string {
  if (target === "opencode") {
    return "Try `opencode uninstall --force`, then `npm uninstall -g opencode-ai`, then `brew uninstall opencode`.";
  }
  if (process.platform === "darwin") {
    return "Try `brew services stop ollama`, `brew uninstall ollama`, then remove `/Applications/Ollama.app` and `/usr/local/bin/ollama`.";
  }
  if (process.platform === "win32") {
    return "Try `winget uninstall --id Ollama.Ollama -e`.";
  }
  return "Linux Ollama uninstall differs by install method. Remove using your package manager or service setup.";
}

export function resolveUpdateCommands(target: InstallTarget): UpdateCommand[] {
  if (target === "opencode") {
    const commands: UpdateCommand[] = [];
    if (hasCommand("opencode")) {
      commands.push({
        method: "opencode-cli",
        target,
        command: "opencode",
        args: ["upgrade"]
      });
    }
    if (hasCommand("npm")) {
      commands.push({
        method: "npm",
        target,
        command: "npm",
        args: ["update", "-g", "opencode-ai"]
      });
    }
    if (hasCommand("brew")) {
      commands.push({
        method: "brew",
        target,
        command: "brew",
        args: ["upgrade", "opencode"]
      });
    }
    return commands;
  }

  if (process.platform === "darwin" && hasCommand("brew")) {
    return [
      {
        method: "brew",
        target,
        command: "brew",
        args: ["upgrade", "ollama"]
      }
    ];
  }

  if (process.platform === "win32" && hasCommand("winget")) {
    return [
      {
        method: "winget",
        target,
        command: "winget",
        args: ["upgrade", "--id", "Ollama.Ollama", "-e"]
      }
    ];
  }

  if (process.platform === "linux" && hasCommand("curl") && hasCommand("sh")) {
    return [
      {
        method: "ollama-script",
        target,
        command: "sh",
        args: ["-c", "curl -fsSL https://ollama.com/install.sh | sh"]
      }
    ];
  }

  return [];
}

export function getUpdateGuidance(target: InstallTarget): string {
  if (target === "opencode") {
    return "Try `opencode upgrade`, `npm update -g opencode-ai`, or `brew upgrade opencode`.";
  }
  if (process.platform === "darwin") {
    return "Try `brew upgrade ollama`.";
  }
  if (process.platform === "win32") {
    return "Try `winget upgrade --id Ollama.Ollama -e`.";
  }
  return "Try rerunning `curl -fsSL https://ollama.com/install.sh | sh` to refresh Ollama.";
}
