import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

export type AppName = "openwork" | "paperclipai";

export interface AppInstallCommand {
  app: AppName;
  method: "npm";
  command: string;
  args: string[];
}

export interface AppUninstallCommand {
  app: AppName;
  method: "npm";
  command: string;
  args: string[];
}

export interface AppUpdateCommand {
  app: AppName;
  method: "npm";
  command: string;
  args: string[];
}

export interface LinkedApp {
  app: AppName;
  command: string;
  linkedAt: string;
}

export interface AppLinksFile {
  apps: Partial<Record<AppName, LinkedApp>>;
}

function commandLocator(): string {
  return process.platform === "win32" ? "where" : "which";
}

export function commandExists(command: string): boolean {
  return spawnSync(commandLocator(), [command], { stdio: "ignore" }).status === 0;
}

export function getAppCommand(app: AppName): string {
  if (app === "openwork") return "openwrk";
  return "paperclipai";
}

export function resolveAppInstallCommand(app: AppName): AppInstallCommand {
  if (app === "openwork") {
    return {
      app,
      method: "npm",
      command: "npm",
      args: ["install", "-g", "openwrk"]
    };
  }

  return {
    app,
    method: "npm",
    command: "npm",
    args: ["install", "-g", "paperclipai"]
  };
}

export function resolveAppUninstallCommand(app: AppName): AppUninstallCommand {
  if (app === "openwork") {
    return {
      app,
      method: "npm",
      command: "npm",
      args: ["uninstall", "-g", "openwrk"]
    };
  }

  return {
    app,
    method: "npm",
    command: "npm",
    args: ["uninstall", "-g", "paperclipai"]
  };
}

export function resolveAppUpdateCommand(app: AppName): AppUpdateCommand {
  if (app === "openwork") {
    return {
      app,
      method: "npm",
      command: "npm",
      args: ["update", "-g", "openwrk"]
    };
  }

  return {
    app,
    method: "npm",
    command: "npm",
    args: ["update", "-g", "paperclipai"]
  };
}

export function getAppInstallGuidance(app: AppName): string {
  if (app === "openwork") {
    return [
      "OpenWork desktop is distributed via GitHub Releases.",
      "Headless CLI host can be installed with: npm install -g openwrk"
    ].join(" ");
  }
  return "Install Paperclip CLI with: npm install -g paperclipai";
}

export function getLinksFilePath(cwd = process.cwd()): string {
  return join(cwd, ".harnex", "apps.json");
}

export function readAppLinks(cwd = process.cwd()): AppLinksFile {
  const path = getLinksFilePath(cwd);
  if (!existsSync(path)) return { apps: {} };
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as AppLinksFile;
    return parsed.apps ? parsed : { apps: {} };
  } catch {
    return { apps: {} };
  }
}

export function writeAppLink(app: AppName, cwd = process.cwd()): LinkedApp {
  const dir = join(cwd, ".harnex");
  mkdirSync(dir, { recursive: true });

  const command = getAppCommand(app);
  const entry: LinkedApp = {
    app,
    command,
    linkedAt: new Date().toISOString()
  };

  const current = readAppLinks(cwd);
  current.apps[app] = entry;
  writeFileSync(getLinksFilePath(cwd), `${JSON.stringify(current, null, 2)}\n`, "utf8");
  return entry;
}

export function removeAppLink(app: AppName, cwd = process.cwd()): void {
  const current = readAppLinks(cwd);
  if (!current.apps[app]) return;
  delete current.apps[app];
  mkdirSync(join(cwd, ".harnex"), { recursive: true });
  writeFileSync(getLinksFilePath(cwd), `${JSON.stringify(current, null, 2)}\n`, "utf8");
}
