const { execSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');

const repoRoot = __dirname;
const webDir = path.join(repoRoot, 'apps', 'web');

if (!existsSync(webDir)) {
  console.error(`[vercel] Web workspace not found at ${webDir}`);
  process.exit(1);
}

console.log('[vercel] Building @six3/web');
execSync('npm run build:web', { cwd: repoRoot, stdio: 'inherit' });
console.log('[vercel] Build complete');
