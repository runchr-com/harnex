export type ComponentStatus =
  | "missing"
  | "installed"
  | "invalid"
  | "outdated"
  | "optional-missing";

export interface BinaryDetectionResult {
  name: "opencode" | "ollama";
  status: ComponentStatus;
  path?: string;
  version?: string;
  message?: string;
}

export interface DoctorReport {
  os: string;
  shell?: string;
  opencode: BinaryDetectionResult;
  ollama: BinaryDetectionResult;
  ollamaServerReachable: boolean;
  installedModels: string[];
  configFound: boolean;
}

export interface HarnexConfig {
  executor: {
    name: "opencode";
    command?: string | undefined;
  };
  provider: {
    name: "ollama";
  };
  model: {
    default: string;
  };
  workspace?:
    | {
        root?: string | undefined;
      }
    | undefined;
  harness?:
    | {
        default?: "openwork" | "paperclip" | undefined;
      }
    | undefined;
}
