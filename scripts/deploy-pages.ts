// Publica o jogo no GitHub Pages: faz o build com o caminho do repositório (/<repositório>/) e manda
// a pasta dist/ para o ramo gh-pages do origin. O build é feito aqui na máquina, então as músicas de
// musicas/ (fora do git) entram no jogo publicado sem entrar no código do repositório.
import { execSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = (cmd: string, cwd?: string, env?: NodeJS.ProcessEnv) =>
  execSync(cmd, { stdio: 'inherit', cwd, env: { ...process.env, ...env } });

const remote = execSync('git remote get-url origin').toString().trim();
const repo = remote.replace(/\.git$/, '').split(/[/:]/).pop();
if (!repo) throw new Error(`Não achei o nome do repositório em ${remote}`);

run('npm run build', undefined, { BASE_PATH: `/${repo}/` });
run('npm run check:size');
writeFileSync('dist/.nojekyll', ''); // o Pages entrega os arquivos como estão, sem o Jekyll

const site = mkdtempSync(join(tmpdir(), 'moscoufishing-pages-'));
try {
  cpSync('dist', site, { recursive: true });
  run('git init -q -b gh-pages', site);
  run('git add -A', site);
  run(`git commit -q -m "chore(pages): publica o jogo"`, site);
  // O ramo gh-pages só guarda o jogo pronto da última publicação.
  run(`git push -f "${remote}" gh-pages`, site);
} finally {
  rmSync(site, { recursive: true, force: true });
}
console.log(`Publicado. Endereço: https://<usuário>.github.io/${repo}/`);
