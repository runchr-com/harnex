import pc from "picocolors";
import { generateVerifyReport } from "../internal/core/index.js";
import { resolveCommandCwd } from "../utils/cwd.js";

interface VerifyOptions {
  model?: string;
  scope?: "shared" | "apps" | "all";
  json?: boolean;
  cwd?: string;
}

export async function verifyCommand(options: VerifyOptions): Promise<number> {
  const verifyOptions: { model?: string; cwd?: string; scope?: "shared" | "apps" | "all" } = {};
  if (options.model) verifyOptions.model = options.model;
  if (options.scope) verifyOptions.scope = options.scope;
  verifyOptions.cwd = resolveCommandCwd(options.cwd);

  const report = generateVerifyReport(verifyOptions);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return report.success ? 0 : 1;
  }

  console.log(pc.bold("HARNEX Verify"));
  console.log("");
  console.log(`Scope: ${report.scope}`);
  console.log("");
  for (const check of report.checks) {
    const mark = check.ok ? pc.green("✔") : pc.red("✖");
    console.log(`${mark} ${check.message}`);
  }
  console.log("");
  console.log(`Target model: ${report.model}`);

  if (!report.success) {
    console.log("");
    console.log("Next step: run `harnex setup --yes` and then `harnex verify` again.");
  }

  return report.success ? 0 : 1;
}
