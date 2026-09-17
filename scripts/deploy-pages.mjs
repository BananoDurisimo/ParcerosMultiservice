/**
 * Publica el sitio compilado en la rama `gh-pages` sin pasar por GitHub Actions.
 *
 *   npm run deploy
 *
 * El flujo normal es el workflow .github/workflows/deploy.yml, que publica solo
 * con cada push a main. Este script existe como alternativa manual para cuando
 * Actions no esta disponible en la cuenta.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, rmSync, mkdirSync, copyFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RAMA = 'gh-pages';
const TMP = join(process.cwd(), '.git', 'gh-pages-build');

const git = (...args) => execFileSync('git', args, { stdio: 'inherit' });
const gitOut = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

console.log('1/4  Compilando…');
execFileSync('npm', ['run', 'build'], { stdio: 'inherit', shell: true });

console.log(`2/4  Preparando la rama ${RAMA}…`);
try {
  git('worktree', 'remove', TMP, '--force');
} catch {
  /* no existia */
}
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
git('worktree', 'add', '-q', '-B', RAMA, TMP);

// Se vacia la rama y se deja solo el contenido de dist/.
for (const f of readdirSync(TMP)) {
  if (f !== '.git') rmSync(join(TMP, f), { recursive: true, force: true });
}
cpSync('dist', TMP, { recursive: true });

// GitHub Pages no reescribe rutas: sin 404.html, recargar /app/pedidos da error.
copyFileSync(join(TMP, 'index.html'), join(TMP, '404.html'));
// Evita que Pages procese el sitio con Jekyll (ignoraria carpetas con guion bajo).
writeFileSync(join(TMP, '.nojekyll'), '');

console.log('3/4  Registrando el cambio…');
execFileSync('git', ['add', '-A'], { cwd: TMP, stdio: 'inherit' });
const hayCambios = execFileSync('git', ['status', '--porcelain'], { cwd: TMP, encoding: 'utf8' }).trim();

if (!hayCambios) {
  console.log('     Sin cambios respecto a lo publicado.');
} else {
  const commit = gitOut('rev-parse', '--short', 'HEAD');
  execFileSync('git', ['commit', '-q', '-m', `Sitio compilado desde ${commit}`], { cwd: TMP, stdio: 'inherit' });
  console.log('4/4  Publicando…');
  execFileSync('git', ['push', 'origin', RAMA], { cwd: TMP, stdio: 'inherit' });
}

git('worktree', 'remove', TMP, '--force');
console.log('\nListo. El sitio tarda alrededor de un minuto en actualizarse:');
console.log('https://bananodurisimo.github.io/ParcerosMultiservice/');
