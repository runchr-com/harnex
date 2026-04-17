import pc from "picocolors";
import { generateDoctorReport } from "@runchr/core";
import { resolveCommandCwd } from "../utils/cwd.js";

interface DoctorOptions {
  cwd?: string;
  json?: boolean;
  quiet?: boolean;
  strict?: boolean;
}

export async function doctorCommand(options: DoctorOptions): Promise<number> {
  const detectOptions: { cwd?: string } = {};
  detectOptions.cwd = resolveCommandCwd(options.cwd);
  const report = generateDoctorReport(detectOptions);
  const ok =
    report.opencode.status === "installed" &&
    report.ollama.status === "installed" &&
    report.ollamaServerReachable;

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return options.strict && !ok ? 1 : 0;
  }

  if (!options.quiet) {
    console.log(pc.bold("HARNEX Doctor"));
    console.log("");
    console.log(`OS: ${report.os}`);
    console.log(`Shell: ${report.shell ?? "unknown"}`);
    console.log(
      `OpenCode: ${report.opencode.status}${report.opencode.path ? ` (${report.opencode.path})` : ""}`
    );
    console.log(`Ollama: ${report.ollama.status}${report.ollama.path ? ` (${report.ollama.path})` : ""}`);
    console.log(`Ollama Server: ${report.ollamaServerReachable ? "reachable" : "not reachable"}`);
    console.log(`Models: ${report.installedModels.length ? report.installedModels.join(", ") : "none"}`);
    console.log(`Config: ${report.configFound ? "found" : "not found"}`);
  }

  return options.strict && !ok ? 1 : 0;
}
