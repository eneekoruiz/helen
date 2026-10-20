import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'dist', 'cli.js');

describe('helen assistant (CLI)', () => {
  let home: string;
  beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-cli-home-')); });
  afterEach(() => fs.rmSync(home, { recursive: true, force: true }));

  function run(args: string[], json = true) {
    const execArgs = fs.existsSync(cli)
      ? [cli, ...args, ...(json ? ['--json'] : [])]
      : [path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs'), path.join(root, 'src', 'cli.ts'), ...args, ...(json ? ['--json'] : [])];
    const result = spawnSync(process.execPath, execArgs, { cwd: home, encoding: 'utf8', timeout: 60_000, env: { ...process.env, HELEN_HOME: home, HELEN_TOKEN: '' } });
    expect(result.error).toBeUndefined();
    return { status: result.status, stdout: result.stdout, body: json ? JSON.parse(result.stdout) : null };
  }

  it('keeps memory, reminders and lists, and answers in plain words', () => {
    expect(run(['assistant', 'config', 'set', 'timezone', 'Europe/Madrid']).status).toBe(0);
    expect(run(['assistant', 'config', 'set', 'timezone', 'Mars/Olympus']).status).toBe(1);
    const remembered = run(['remember', 'El', 'wifi', 'de', 'casa', 'se', 'llama', 'Movistar_5G', '--tags', 'casa']);
    expect(remembered.body.data).toMatchObject({ kind: 'note', tags: ['casa'], visibility: 'private' });
    expect(run(['remember', 'la contraseña del banco es Pepe1234']).status).toBe(1);
    expect(run(['recall', 'wifi']).body.data.results[0].title).toBe('El wifi de casa se llama Movistar_5G');
    expect(run(['remind', 'llamar', 'a', 'mamá', 'mañana', 'a', 'las', '9']).body.data.reminder.text).toBe('llamar a mamá');
    expect(run(['todo', '--list', 'compra', 'leche,', 'huevos', 'y', 'pan']).body.data.added).toHaveLength(3);
    expect(run(['todo', 'done', 'huevos']).body.data.text).toBe('huevos');
    expect(run(['todo', 'list', '--list', 'compra']).body.data.tasks.map((task: { text: string }) => task.text)).toEqual(['leche', 'pan']);
    expect(run(['reminders']).body.data.reminders).toHaveLength(1);
    expect(run(['agenda', 'mañana']).body.data.text).toContain('llamar a mamá');
    const answer = run(['ask', '¿cuál', 'es', 'el', 'wifi', 'de', 'casa?']);
    expect(answer.body.data.text).toContain('Movistar_5G');
    expect(run(['reminders', 'cancel', 'mamá']).body.data.status).toBe('cancelled');
    const id = remembered.body.data.id as string;
    expect(run(['forget', id]).status).toBe(0);
    expect(run(['notes']).body.data.notes).toEqual([]);
  }, 120_000);

  it('prints a valid Alexa interaction model and the setup steps', () => {
    const model = JSON.parse(run(['assistant', 'alexa', 'model', '--locale', 'es-ES'], false).stdout);
    expect(model.interactionModel.languageModel.invocationName).toBe('asistente helen');
    expect(run(['assistant', 'alexa', 'setup'], false).stdout).toContain('helen assistant config set alexa.skillIds');
    expect(run(['assistant', 'telegram', 'allow', '12345']).body.data.allowedChats).toEqual([12345]);
    expect(run(['assistant', 'token']).body.data.token).toMatch(/^.{4}….{4}$/);
    if (process.platform !== 'win32') expect(fs.statSync(path.join(home, 'token')).mode & 0o777).toBe(0o600);
    const exported = JSON.parse(run(['assistant', 'export'], false).stdout);
    expect(Object.keys(exported)).toEqual(['exported', 'memory', 'reminders', 'tasks']);
  }, 120_000);
});
