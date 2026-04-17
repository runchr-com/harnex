import pc from "picocolors";
import { initializeProject } from "../internal/core/index.js";
import { resolveCommandCwd } from "../utils/cwd.js";

interface InitOptions {
  cwd?: string;
  force?: boolean;
  json?: boolean;
}

export async function initCommand(options: InitOptions): Promise<number> {
  const initOptions: { cwd: string; force?: boolean } = {
    cwd: resolveCommandCwd(options.cwd)
  };
  if (typeof options.force === "boolean") {
    initOptions.force = options.force;
  }
  const result = initializeProject(initOptions);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  console.log(pc.bold("HARNEX Init"));
  console.log("");
  console.log(`Root: ${result.root}`);
  for (const path of result.created) {
    console.log(`${pc.green("✔")} created: ${path}`);
  }
  for (const path of result.skipped) {
    console.log(`${pc.yellow("-")} skipped: ${path}`);
  }

  console.log("");
  console.log("Next: run `harnex verify`.");
  return 0;
}
