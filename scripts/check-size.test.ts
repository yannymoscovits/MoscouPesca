// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..');
const TSX = join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SCRIPT = join(ROOT, 'scripts', 'check-size.ts');

// INST-08 diz "no máximo 5 MB"; usamos MB decimal (1 MB = 1.000.000 bytes),
// a leitura mais restritiva, que também cumpre a leitura binária.
const MB = 1_000_000;

let work: string;

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), 'mf-check-size-'));
  mkdirSync(join(work, 'dist', 'assets'), { recursive: true });
});

afterEach(() => {
  rmSync(work, { recursive: true, force: true });
});

// O total fica dividido entre dois arquivos em pastas diferentes: o script tem de somar tudo.
function fillDist(totalBytes: number) {
  const page = Math.round(totalBytes * 0.2);
  writeFileSync(join(work, 'dist', 'index.html'), Buffer.alloc(page));
  writeFileSync(join(work, 'dist', 'assets', 'app.js'), Buffer.alloc(totalBytes - page));
}

function run() {
  const result = spawnSync(process.execPath, [TSX, SCRIPT, 'dist'], {
    cwd: work,
    encoding: 'utf8',
  });
  return { code: result.status, output: result.stdout + result.stderr };
}

describe('check-size (INST-08)', () => {
  it('pasta de 4,9 MB passa com código 0', () => {
    fillDist(4.9 * MB);

    expect(run().code).toBe(0);
  }, 20_000);

  it('pasta de exatamente 5 MB passa com código 0 ("no máximo 5 MB")', () => {
    fillDist(5 * MB);

    expect(run().code).toBe(0);
  }, 20_000);

  it('pasta de 5,1 MB falha com código 1 e mostra o total', () => {
    fillDist(5.1 * MB);

    const { code, output } = run();

    expect(code).toBe(1);
    expect(output).toContain('5,10 MB');
  }, 20_000);
});
