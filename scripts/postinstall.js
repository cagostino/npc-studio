#!/usr/bin/env node

const { spawn, spawnSync, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Only run this script in npm install context and skip in development
const isDevInstall = process.env.npm_config_dev || process.env.NODE_ENV === 'development';
const isGlobalInstall = process.env.npm_config_global === 'true';

// CLI COMMAND MUST BE npc-stu for npm users
const CLI_COMMAND = 'npc-stu';
const APP_NAME = 'npc-studio';

// Skip in development
if (isDevInstall && !isGlobalInstall) {
  console.log('Development install detected, skipping build steps.');
  process.exit(0);
}

console.log(`Running post-installation setup for ${APP_NAME}...`);
console.log('Note: Python dependencies will be downloaded on-demand when you run npc-stu for the first time.');

// Check if a command exists
const commandExists = (command) => {
  try {
    const result = spawnSync('which', [command], { stdio: 'pipe' });
    return result.status === 0;
  } catch (err) {
    return false;
  }
};

// Build the Vite app if needed
const buildApp = () => {
  console.log('Setting up application files...');
  
  try {
    // Check if dist directory already exists (pre-built)
    const distPath = path.join(__dirname, '..', 'dist');
    if (fs.existsSync(distPath)) {
      console.log('Pre-built files found, skipping build step.');
      return;
    }
    
    // Try to build with available tools
    if (commandExists('vite')) {
      console.log('Building with vite...');
      execSync('vite build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    } else if (commandExists('npx')) {
      console.log('Building with npx vite...');
      execSync('npx vite build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    } else {
      console.log('Vite not available, application will use runtime compilation.');
    }
    
    console.log('Application setup completed.');
  } catch (error) {
    console.error('Build failed:', error.message);
    console.log('Application will attempt to use runtime compilation.');
  }
};

// Main execution
try {
  buildApp();
  
  console.log(`\n✅ ${APP_NAME} installation completed!`);
  console.log(`\nTo get started, run: ${CLI_COMMAND}`);
  console.log('\nFor the Python setup, you will need:');
  console.log('• Python 3.8 or higher');
  console.log('• pip package manager'); 
  console.log('• python3-venv (on Ubuntu/Debian) or equivalent\n');
  
} catch (error) {
  console.error('Error during post-installation setup:', error);
}