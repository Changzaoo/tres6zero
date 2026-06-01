const { execSync } = require('node:child_process');
const { cpSync, existsSync, mkdirSync, rmSync } = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const webDir = path.join(repoRoot, 'apps', 'web');
const webDist = path.join(webDir, 'dist');
const localDist = path.join(__dirname, 'dist');
const legacyDist = path.join(__dirname, 'apps', 'web', 'dist');

if (!existsSync(webDir)) {
  console.error(`[vercel] Web workspace not found at ${webDir}`);
  process.exit(1);
}

console.log('[vercel] Installing frontend workspace');
execSync('npm install --workspace=@tres6zero/web --include-workspace-root=false', {
  cwd: repoRoot,
  stdio: 'inherit',
});

console.log('[vercel] Building frontend workspace');
execSync('npm run build:web', { cwd: repoRoot, stdio: 'inherit' });

for (const target of [localDist, legacyDist]) {
  rmSync(target, { force: true, recursive: true });
  mkdirSync(path.dirname(target), { recursive: true });
  cpSync(webDist, target, { recursive: true });
}

console.log('[vercel] Frontend build copied for apps/server root deployments');
