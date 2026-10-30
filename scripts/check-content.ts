// Barra a publicação enquanto houver texto pendente no conteúdo (HIST-07).
// Uso: tsx scripts/check-content.ts [pasta]   (padrão: src/content)
import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

const MARKER = '{{PENDENTE}}';
const dir = process.argv[2] ?? 'src/content';

const found: string[] = [];
for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const file = join(entry.parentPath, entry.name);
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((text, i) => {
    if (text.includes(MARKER)) found.push(`${file.split(sep).join('/')}:${i + 1}`);
  });
}

if (found.length === 0) {
  console.log(`Nenhum ${MARKER} em ${dir}.`);
} else {
  console.error(`Conteúdo pendente: ${found.length} marcador(es) ${MARKER}.`);
  for (const position of found) console.error(`  ${position}`);
  process.exitCode = 1;
}
