export type FrontmatterValue = string | boolean | string[];

export interface ParsedDocument {
  data: Record<string, FrontmatterValue>;
  body: string;
  hasFrontmatter: boolean;
}

function scalar(raw: string): string | boolean {
  const value = raw.trim().replace(/\s+#.*$/, '');
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^(["']).*\1$/.test(value)) return value.slice(1, -1);
  return value;
}

/**
 * Minimal YAML frontmatter reader for HELEN files: `key: value`, `key: [a, b]`
 * and block lists (`key:` followed by `  - item`). That is the whole contract.
 */
export function parseFrontmatter(content: string): ParsedDocument {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(content);
  if (!match) return { data: {}, body: content, hasFrontmatter: false };

  const data: Record<string, FrontmatterValue> = {};
  let listKey: string | null = null;

  for (const line of match[1]!.split(/\r?\n/)) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && listKey) {
      (data[listKey] as string[]).push(String(scalar(item[1]!)));
      continue;
    }
    const pair = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!pair) continue;
    const [, key, raw] = pair as unknown as [string, string, string];
    if (raw.trim() === '') {
      data[key] = [];
      listKey = key;
    } else if (/^\[.*\]$/.test(raw.trim())) {
      data[key] = raw.trim().slice(1, -1).split(',').map(part => String(scalar(part))).filter(Boolean);
      listKey = null;
    } else {
      data[key] = scalar(raw);
      listKey = null;
    }
  }

  return { data, body: content.slice(match[0].length), hasFrontmatter: true };
}
