import type { DoctorReport } from "../shared/index.js";

export type SetupActionType =
  | "install-opencode"
  | "install-ollama"
  | "pull-model"
  | "create-config"
  | "skip-existing"
  | "manual-guidance";

export interface SetupAction {
  type: SetupActionType;
  target: string;
  required: boolean;
}

export interface SetupPlan {
  actions: SetupAction[];
}

interface BuildSetupPlanOptions {
  model?: string;
  includeModel?: boolean;
  includeConfig?: boolean;
}

export function buildSetupPlan(
  report: DoctorReport,
  options: BuildSetupPlanOptions = {}
): SetupPlan {
  const includeModel = options.includeModel ?? false;
  const includeConfig = options.includeConfig ?? false;
  const model = options.model ?? "llama3";
  const actions: SetupAction[] = [];

  if (report.opencode.status !== "installed") {
    actions.push({ type: "install-opencode", target: "opencode", required: true });
  } else {
    actions.push({ type: "skip-existing", target: "opencode", required: true });
  }

  if (report.ollama.status !== "installed") {
    actions.push({ type: "install-ollama", target: "ollama", required: true });
  } else {
    actions.push({ type: "skip-existing", target: "ollama", required: true });
  }

  if (includeConfig && !report.configFound) {
    actions.push({ type: "create-config", target: ".harnex/config.json", required: true });
  }

  if (includeModel && !report.installedModels.includes(model)) {
    actions.push({ type: "pull-model", target: model, required: false });
  }

  if (actions.length === 0) {
    actions.push({ type: "manual-guidance", target: "no-op", required: false });
  }

  return { actions };
}
