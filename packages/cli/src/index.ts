#!/usr/bin/env node
import { Command } from "commander";
import { doctorCommand } from "./commands/doctor.js";
import { initCommand } from "./commands/init.js";
import { installCommand } from "./commands/install.js";
import { linkCommand } from "./commands/link.js";
import { runCommand } from "./commands/run.js";
import { setupCommand } from "./commands/setup.js";
import { uninstallCommand } from "./commands/uninstall.js";
import { updateCommand } from "./commands/update.js";
import { verifyCommand } from "./commands/verify.js";

const program = new Command();

program.name("harnex").description("CLI-first harness layer for OpenCode and Ollama.").version("0.1.0");

program
  .command("doctor")
  .description("Read-only environment diagnostics")
  .option("--json", "print as JSON")
  .option("--quiet", "minimal output")
  .option("--strict", "return non-zero exit code when required dependencies are missing")
  .option("--cwd <path>", "target working directory")
  .action(async (options) => {
    const code = await doctorCommand(options);
    process.exitCode = code;
  });

program
  .command("setup")
  .description("Install missing opencode/ollama prerequisites")
  .option("--yes", "approve all actions")
  .option("--with-model", "include model pull in planning output")
  .option("--with-config", "include config scaffold action in planning output")
  .option("--model <name>", "target model")
  .option("--method <name>", "install method: auto|brew|npm|winget|ollama-script")
  .option("--non-interactive", "disable prompts")
  .option("--json", "print plan as JSON")
  .option("--cwd <path>", "target working directory")
  .action(async (options) => {
    const code = await setupCommand(options);
    process.exitCode = code;
  });

program
  .command("run")
  .description("Run OpenCode using shared HARNEX config")
  .option("--task <text>", "task prompt")
  .option("--model <name>", "override model")
  .option("--provider <name>", "override provider")
  .option("--cwd <path>", "target working directory")
  .option("--dry-run", "print command only")
  .option("--json", "print command as JSON")
  .action(async (options) => {
    const code = await runCommand(options);
    process.exitCode = code;
  });

program
  .command("install")
  .description("Install app layer components (openwork|paperclipai|all)")
  .argument("<app>", "openwork | paperclipai | all")
  .option("--yes", "approve install")
  .option("--non-interactive", "disable prompts")
  .option("--json", "print result as JSON")
  .action(async (app, options) => {
    const code = await installCommand(app, options);
    process.exitCode = code;
  });

program
  .command("update")
  .description("Update shared/app layer components")
  .argument("<target>", "all | shared | apps | opencode | ollama | openwork | paperclipai")
  .option("--yes", "approve update")
  .option("--non-interactive", "disable prompts")
  .option("--dry-run", "print update commands without executing")
  .option("--json", "print result as JSON")
  .action(async (target, options) => {
    const code = await updateCommand(target, options);
    process.exitCode = code;
  });

program
  .command("uninstall")
  .description("Uninstall shared/app layer components")
  .argument("<target>", "all | shared | apps | opencode | ollama | openwork | paperclipai")
  .option("--yes", "approve uninstall")
  .option("--non-interactive", "disable prompts")
  .option("--dry-run", "print uninstall commands without executing")
  .option("--json", "print result as JSON")
  .option("--cwd <path>", "target working directory")
  .action(async (target, options) => {
    const code = await uninstallCommand(target, options);
    process.exitCode = code;
  });

program
  .command("link")
  .description("Link installed app to shared layer")
  .argument("<app>", "openwork | paperclipai")
  .option("--json", "print result as JSON")
  .option("--cwd <path>", "target working directory")
  .action(async (app, options) => {
    const code = await linkCommand(app, options);
    process.exitCode = code;
  });

program
  .command("verify")
  .description("End-to-end readiness checks for run")
  .option("--scope <name>", "verify scope: shared|apps|all")
  .option("--model <name>", "target model")
  .option("--json", "print report as JSON")
  .option("--cwd <path>", "target working directory")
  .action(async (options) => {
    const code = await verifyCommand(options);
    process.exitCode = code;
  });

program
  .command("init")
  .description("Initialize .harnex project scaffold")
  .option("--force", "overwrite scaffold files if they already exist")
  .option("--json", "print result as JSON")
  .option("--cwd <path>", "target working directory")
  .action(async (options) => {
    const code = await initCommand(options);
    process.exitCode = code;
  });

void program.parseAsync(process.argv);
