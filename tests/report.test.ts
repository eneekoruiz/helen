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

  it('rejects a report directory linked outside the project', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-report-outside-'));
    try {
      fs.symlinkSync(outside, path.join(tmp, '.helen'), process.platform === 'win32' ? 'junction' : 'dir');
      expect(() => writeReport(tmp)).toThrow('inside the project');
      expect(fs.readdirSync(outside)).toEqual([]);
    } finally {
      fs.rmSync(path.join(tmp, '.helen'), { force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  it('escapes project, step and diagnostic text instead of executing markup', () => {
    const data = generateReportData(tmp);
    const payload = '<img src=x onerror="alert(1)">';
    data.project.name = payload;
    data.phase.current = payload;
    data.steps = [{ number: 1, kind: payload, ref: payload, why: payload, status: 'pending', isCheckpoint: false }];
    data.health.checks = [{ label: payload, message: payload, status: 'ok" onclick="alert(1)' }];
    const html = renderReportHtml(data);
    expect(html).not.toContain(payload);
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(html).not.toContain('class="status-ok" onclick=');
  });
});
