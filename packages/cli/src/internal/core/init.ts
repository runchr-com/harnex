import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_CONFIG } from "../shared/index.js";

export interface InitOptions {
  cwd?: string;
  force?: boolean;
}

export interface InitResult {
  root: string;
  created: string[];
  skipped: string[];
}

function writeJsonFile(path: string, value: unknown, force: boolean, result: InitResult): void {
  if (!force && existsSync(path)) {
    result.skipped.push(path);
    return;
  }
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  result.created.push(path);
}

export function initializeProject(options: InitOptions = {}): InitResult {
  const root = options.cwd ?? process.cwd();
  const force = options.force ?? false;
  const harnexDir = join(root, ".harnex");
  const profilesDir = join(harnexDir, "profiles");
  const promptsDir = join(harnexDir, "prompts");
  const tasksDir = join(harnexDir, "tasks");

  const result: InitResult = {
    root,
    created: [],
    skipped: []
  };

  mkdirSync(harnexDir, { recursive: true });
  mkdirSync(profilesDir, { recursive: true });
  mkdirSync(promptsDir, { recursive: true });
  mkdirSync(tasksDir, { recursive: true });

  writeJsonFile(join(harnexDir, "config.json"), DEFAULT_CONFIG, force, result);
  writeJsonFile(
    join(profilesDir, "default.json"),
    {
      name: "default",
      description: "Default shared run profile",
      provider: "ollama",
      model: "llama3"
    },
    force,
    result
  );
  writeJsonFile(
    join(harnexDir, "apps.json"),
    {
      apps: {}
    },
    force,
    result
  );

  return result;
}
