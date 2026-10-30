// Barra a publicação se o pacote passar de 5 MB (INST-08).
// Uso: tsx scripts/check-size.ts [pasta]   (padrão: dist)
// MB decimal (1.000.000 bytes): a leitura mais restritiva de "5 MB".
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const LIMIT_BYTES = 5_000_000;
const dir = process.argv[2] ?? 'dist';

let total = 0;
for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
  if (entry.isFile()) total += statSync(join(entry.parentPath, entry.name)).size;
}

const mb = (bytes: number) => `${(bytes / 1_000_000).toFixed(2).replace('.', ',')} MB`;

if (total <= LIMIT_BYTES) {
  console.log(`${dir}: ${mb(total)} (limite ${mb(LIMIT_BYTES)}).`);
} else {
  console.error(`${dir}: ${mb(total)}, acima do limite de ${mb(LIMIT_BYTES)}.`);
  process.exitCode = 1;
}
