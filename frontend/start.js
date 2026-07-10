/**
 * Smart start script: tries next start (production), falls back to next dev
 */
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const nextDir = path.join(__dirname, '.next');

// Check if build exists, if not build first
if (!fs.existsSync(nextDir) || !fs.existsSync(path.join(nextDir, 'BUILD_ID'))) {
  console.log('[start.js] No build found, running next build...');
  try {
    execSync('npx next build', { stdio: 'inherit', cwd: __dirname });
    console.log('[start.js] Build complete, starting production server...');
  } catch (e) {
    console.error('[start.js] Build failed, falling back to dev mode...');
    const dev = spawn('npx', ['next', 'dev', '-p', '3000', '-H', '0.0.0.0'], {
      stdio: 'inherit',
      cwd: __dirname,
    });
    dev.on('exit', (code) => process.exit(code));
    return;
  }
}

// Start production server
const prod = spawn('npx', ['next', 'start', '-p', '3000', '-H', '0.0.0.0'], {
  stdio: 'inherit',
  cwd: __dirname,
});
prod.on('exit', (code) => process.exit(code));
