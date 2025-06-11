#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting npc-studio...');

// Get the package installation directory
const packageDir = path.resolve(__dirname, '..');
const mainPath = path.join(packageDir, 'src', 'main.js');

console.log('Package directory:', packageDir);
console.log('Main path:', mainPath);

// Find Electron executable - try multiple locations
let electronPath;
const possibleElectronPaths = [
  path.join(packageDir, 'node_modules', '.bin', 'electron'),
  path.join(packageDir, 'node_modules', 'electron', 'dist', 'electron'),
  path.join(__dirname, '..', 'node_modules', '.bin', 'electron')
];

for (const possiblePath of possibleElectronPaths) {
  if (fs.existsSync(possiblePath)) {
    electronPath = possiblePath;
    break;
  }
}

if (!electronPath) {
  console.error('Electron not found in any of these locations:');
  possibleElectronPaths.forEach(p => console.error('  -', p));
  process.exit(1);
}

if (!fs.existsSync(mainPath)) {
  console.error('Main file not found at:', mainPath);
  process.exit(1);
}

console.log('Found Electron:', electronPath);
console.log('Starting Electron using shell execution...');

// Set up environment for Electron
const env = {
  ...process.env,
  NODE_ENV: 'production',
  ELECTRON_RUN_AS_NODE: '0',
  ELECTRON_IS_DEV: '0'
};

// Use shell execution instead of spawn - this mimics the working approach
const command = `cd "${packageDir}" && "${electronPath}" .`;

const electronProcess = exec(command, {
  env: env,
  cwd: packageDir
});

// Pipe output to console
electronProcess.stdout.pipe(process.stdout);
electronProcess.stderr.pipe(process.stderr);

electronProcess.on('close', (code) => {
  console.log(`NPC Studio exited with code ${code}`);
  process.exit(code);
});

electronProcess.on('error', (err) => {
  console.error('Failed to start Electron:', err.message);
  process.exit(1);
});