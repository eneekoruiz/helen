/** Repository text is untrusted data. These lexical hints are not compiler facts. */
export interface CodeMapNotice {
  code: string;
  message: string;
  path?: string;
}

export interface CodeMapOptions {
  maxFiles?: number;
  maxFileBytes?: number;
  maxTotalBytes?: number;
  maxEntries?: number;
  maxParseTokens?: number;
}

export interface CodeMapLimits {
  maxFiles: number;
  maxFileBytes: number;
  maxTotalBytes: number;
  maxEntries: number;
  maxParseTokens: number;
}

export interface CodeMapImport {
  specifier: string;
  kind: "import" | "export" | "require" | "dynamic-import";
  line: number;
  resolvedPath?: string;
  resolution: "local" | "external" | "unresolved" | "unsafe";
}

export interface CodeMapSymbol {
  name: string;
  kind: string;
  line: number;
  exported: boolean;
}

export interface CodeMapRoute {
  method: string;
  route?: string;
  line: number;
  kind: "call" | "handler" | "file";
}

export interface CodeMapFile {
  path: string;
  language: string;
  bytes: number;
  hash: string;
  imports: CodeMapImport[];
  dependencies: string[];
  dependents: string[];
  symbols: CodeMapSymbol[];
  contracts: CodeMapSymbol[];
  routes: CodeMapRoute[];
  analysis: "lexical" | "reference-only";
}

export interface CodeMap {
  version: 1;
  root: string;
  fingerprint: string;
  complete: boolean;
  limits: CodeMapLimits;
  files: CodeMapFile[];
  notices: CodeMapNotice[];
  limitations: string[];
  scannedBytes: number;
}

export interface TaskContextRequest {
  task?: string;
  /** Repository-relative files or directory prefixes; traversal is rejected. */
  paths?: string[];
  keywords?: string[];
  /** Dependency and reverse-dependency hops, default 1, maximum 4. */
  depth?: number;
  maxFiles?: number;
  maxCharacters?: number;
  /** Approximation only: ceil(rendered characters / 4), not a provider tokenizer. */
  maxTokens?: number;
  /** Explicit caller authorization to include bounded repository source text. */
  includeSource?: boolean;
  maxSourceCharacters?: number;
}

export interface TaskContextFile {
  path: string;
  language: string;
  hash: string;
  reasons: string[];
  dependencies: string[];
  dependents: string[];
  symbols: CodeMapSymbol[];
  contracts: CodeMapSymbol[];
  routes: CodeMapRoute[];
  source?: string;
  sourceTruncated?: boolean;
}

export interface TaskContext {
  version: 1;
  fingerprint: string;
  complete: boolean;
  mode: "references" | "source";
  files: TaskContextFile[];
  notices: CodeMapNotice[];
  limitations: string[];
  omittedFiles: number;
  budget: { maxFiles: number; maxCharacters: number; maxTokens: number };
  characters: number;
  estimatedTokens: number;
  /** Deterministic, bounded representation suitable for a prompt snapshot. */
  text: string;
}
