import pc from "picocolors";
import { spawn } from "node:child_process";
import {
  getAppInstallGuidance,
  resolveAppInstallCommand,
  type AppName
} from "@runchr/core";

interface InstallOptions {
  yes?: boolean;
  nonInteractive?: boolean;
  json?: boolean;
}

interface InstallResult {
  app: AppName;
  ok: boolean;
  method: string;
}

function runInstall(command: string, args: string[]): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code: number | null) => resolve(code ?? 1));
  });
}

function parseApps(target: string): AppName[] {
  if (target === "all") return ["openwork", "paperclipai"];
  if (target === "openwork" || target === "paperclipai") return [target];
  throw new Error(`Unsupported app: ${target}`);
}

export async function installCommand(target: string, options: InstallOptions): Promise<number> {
  const apps = parseApps(target);
  const results: InstallResult[] = [];

  for (const app of apps) {
    const plan = resolveAppInstallCommand(app);
    const code = await runInstall(plan.command, plan.args);
    const ok = code === 0;
    results.push({ app, ok, method: plan.method });
    if (!ok) {
      console.log(pc.red(`Failed to install ${app}.`));
      console.log(getAppInstallGuidance(app));
      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      }
      return code;
    }
  }

  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
    return 0;
  }

  console.log(pc.bold("HARNEX App Install"));
  console.log("");
  for (const result of results) {
    console.log(`${pc.green("✔")} ${result.app} installed via ${result.method}`);
  }
  console.log("");
  if (apps.length === 1) {
    console.log(`Next: run \`harnex link ${apps[0]}\`.`);
  } else {
    console.log("Next: run `harnex link openwork` and `harnex link paperclipai`.");
  }
  return 0;
}
