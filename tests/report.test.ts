import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generateReportData, renderReportHtml, writeReport } from '../src/core/report.js';

describe('helen report', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-report-test-'));
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'report-test', version: '1.0.0' }));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('generates structured report data with project metadata and health checks', () => {
    const data = generateReportData(tmp);
    expect(data.project.name).toBe('report-test');
    expect(data.health.total).toBeGreaterThan(0);
    expect(Array.isArray(data.health.checks)).toBe(true);
    expect(Array.isArray(data.skills)).toBe(true);
  });

  it('renders valid standalone HTML with dashboard components', () => {
    const data = generateReportData(tmp);
    const html = renderReportHtml(data);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('HELEN Project Dashboard');
    expect(html).toContain('report-test');
    expect(html).toContain('Health:');
  });

  it('writes report.html into .helen directory', () => {
    const { filePath } = writeReport(tmp);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(filePath).toContain('.helen');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('HELEN Project Dashboard');
  });
});
