export function resolveCommandCwd(override?: string): string {
  if (override) return override;
  if (process.env.INIT_CWD) return process.env.INIT_CWD;
  return process.cwd();
}
