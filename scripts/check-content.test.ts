// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..');
const TSX = join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SCRIPT = join(ROOT, 'scripts', 'check-content.ts');

let work: string;

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), 'mf-check-content-'));
  mkdirSync(join(work, 'content'));
});

afterEach(() => {
  rmSync(work, { recursive: true, force: true });
});

function write(name: string, lines: string[]) {
  writeFileSync(join(work, 'content', name), lines.join('\n'));
}

function run() {
  const result = spawnSync(process.execPath, [TSX, SCRIPT, 'content'], {
    cwd: work,
    encoding: 'utf8',
  });
  return { code: result.status, output: result.stdout + result.stderr };
}

describe('check-content (HIST-07)', () => {
  it('sai com código 0 quando nenhum texto tem {{PENDENTE}}', () => {
    write('chapter1.ts', ["export const fala = 'Bora pescar, pai!';"]);
    write('messages.ts', ["export const carta = 'Te amo.';"]);

    expect(run().code).toBe(0);
  }, 20_000);

  it('sai com código 1 e lista arquivo:linha de cada marcador', () => {
    write('chapter1.ts', [
      'export const falas = [',
      "  'Bora pescar, pai!',",
      "  '{{PENDENTE}}',",
      '];',
    ]);
    write('messages.ts', ['export const cartas = [', "  'Querido Adilson, {{PENDENTE}}',", '];']);

    const { code, output } = run();

    expect(code).toBe(1);
    const positions = (output.match(/[\w./-]+\.ts:\d+/g) ?? []).sort();
    expect(positions).toEqual(['content/chapter1.ts:3', 'content/messages.ts:2']);
  }, 20_000);
});
