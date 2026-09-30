export interface JsonEnvelope<T = unknown> {
  ok: boolean;
  command: string;
  data: T;
  warnings: string[];
  errors: string[];
}

let jsonModeEnabled = false;
const globalWarnings: string[] = [];
const globalErrors: string[] = [];

export function setJsonMode(enabled: boolean): void {
  jsonModeEnabled = enabled;
}

export function isJsonMode(): boolean {
  return jsonModeEnabled;
}

export function addWarning(warning: string): void {
  if (!globalWarnings.includes(warning)) {
    globalWarnings.push(warning);
  }
}

export function addError(error: string): void {
  if (!globalErrors.includes(error)) {
    globalErrors.push(error);
  }
}

export function clearJsonBuffers(): void {
  globalWarnings.length = 0;
  globalErrors.length = 0;
}

export function formatJsonEnvelope<T = unknown>(
  command: string,
  data: T,
  options?: {
    ok?: boolean;
    warnings?: string[];
    errors?: string[];
  }
): JsonEnvelope<T> {
  const warnings = [...globalWarnings, ...(options?.warnings ?? [])];
  const errors = [...globalErrors, ...(options?.errors ?? [])];
  const ok = options?.ok !== undefined ? options.ok : errors.length === 0;

  return {
    ok,
    command,
    data,
    warnings,
    errors,
  };
}

export function printJsonAndExit<T = unknown>(
  command: string,
  data: T,
  options?: {
    ok?: boolean;
    warnings?: string[];
    errors?: string[];
    exitCode?: number;
  }
): void {
  const envelope = formatJsonEnvelope(command, data, options);
  process.stdout.write(JSON.stringify(envelope, null, 2) + '\n');

  if (options?.exitCode !== undefined) {
    process.exitCode = options.exitCode;
    return;
  }

  if (!envelope.ok || envelope.errors.length > 0) {
    process.exitCode = 1;
  } else if (envelope.warnings.length > 0) {
    process.exitCode = 2;
  } else {
    process.exitCode = 0;
  }
}
