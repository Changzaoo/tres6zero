/**
 * Vercel build script – changes working directory to apps/web before building.
 * Uses Node.js child_process so the cwd change persists for all sub-commands.
 */
const { execSync } = require('child_process');
const path = require('path');

const webDir = path.join(__dirname, 'apps', 'web');
console.log('[build] chdir →', webDir);
process.chdir(webDir);

console.log('[build] npm install');
execSync('npm install', { stdio: 'inherit' });

console.log('[build] npm run build');
execSync('npm run build', { stdio: 'inherit' });

console.log('[build] done ✓');
