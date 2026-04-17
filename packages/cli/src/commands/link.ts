import pc from "picocolors";
import {
  commandExists,
  getAppCommand,
  writeAppLink,
  type AppName
} from "../internal/core/index.js";
import { resolveCommandCwd } from "../utils/cwd.js";

interface LinkOptions {
  cwd?: string;
  json?: boolean;
}

function isSupportedApp(value: string): value is AppName {
  return value === "openwork" || value === "paperclipai";
}

export async function linkCommand(app: string, options: LinkOptions): Promise<number> {
  if (!isSupportedApp(app)) {
    console.log(pc.red(`Unsupported app: ${app}`));
    return 1;
  }

  const command = getAppCommand(app);
  if (!commandExists(command)) {
    console.log(pc.red(`${app} is not installed (missing command: ${command}).`));
    console.log(`Run \`harnex install ${app}\` first.`);
    return 1;
  }

  const linked = writeAppLink(app, resolveCommandCwd(options.cwd));

  if (options.json) {
    console.log(JSON.stringify(linked, null, 2));
    return 0;
  }

  console.log(pc.bold("HARNEX Link"));
  console.log("");
  console.log(`${pc.green("✔")} linked ${linked.app} (command: ${linked.command})`);
  console.log("Next: run `harnex verify --scope all`.");
  return 0;
}
