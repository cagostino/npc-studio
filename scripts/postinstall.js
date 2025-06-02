#!/usr/bin/env node

const { spawn, spawnSync, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const readline = require('readline');

// Only run this script in npm install context and skip in development
const isDevInstall = process.env.npm_config_dev || !process.env.npm_config_production;
const isGlobalInstall = process.env.npm_config_global === 'true';

// CLI COMMAND MUST BE npc-stu for npm users
const CLI_COMMAND = 'npc-stu';      // The CLI command users will type
const APP_NAME = 'npc-studio';      // Internal name remains the same
const APP_DIR = '.npcsh';           // Directory remains the same

// Skip vite build if we're running in development or during optional dependency installation
if (isDevInstall && !isGlobalInstall) {
  console.log('Development install detected, skipping build steps.');
  process.exit(0);
}

console.log(`Running post-installation setup for ${APP_NAME}...`);
console.log('Note: No Python components are bundled with this npm package.');
console.log(`Python dependencies will be downloaded on-demand when you run ${CLI_COMMAND} for the first time.`);

// Check if a command exists
const commandExists = (command) => {
  try {
    const result = spawnSync('which', [command], { stdio: 'pipe' });
    return result.status === 0;
  } catch (err) {
    return false;
  }
};

// Check if we're running in an environment where we can build the app
const canBuildVite = () => {
  // For global installs, we need to check if vite is available
  if (isGlobalInstall) {
    return commandExists('vite') || commandExists('npx');
  }
  return true;
};

// Check for electron and build Vite project if possible
const buildApp = () => {
  // Only attempt to build if we have the right environment
  if (canBuildVite()) {
    console.log('Building Vite app...');
    
    try {
      // First check if we can use local vite
      if (commandExists('vite')) {
        execSync('vite build', { stdio: 'inherit' });
      } 
      // Otherwise try with npx
      else if (commandExists('npx')) {
        execSync('npx vite build', { stdio: 'inherit' });
      } 
      // If neither works, skip building and use pre-built files if available
      else {
        console.log('Could not find vite or npx. Skipping build step.');
        console.log('Pre-built files will be used if available.');
      }
      
      console.log('Vite app build completed successfully or skipped.');
    } catch (error) {
      console.error('Failed to build Vite app:', error.message);
      console.log('Pre-built files will be used if available.');
    }
  } else {
    console.log('Skipping build step for global installation. Using pre-built files.');
  }
};

// Skip electron-builder install-app-deps for global installs
const runElectronBuilderSetup = () => {
  if (!isGlobalInstall && commandExists('electron-builder')) {
    try {
      console.log('Running electron-builder app dependency installation...');
      execSync('electron-builder install-app-deps', { stdio: 'inherit' });
    } catch (error) {
      console.error('Failed to run electron-builder:', error.message);
    }
  } else {
    console.log('Skipping electron-builder setup for global installation.');
  }
};

// Ask if user wants to install Python dependencies
const askForPythonInstall = () => {
  // Skip in CI/CD environments
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    console.log('CI environment detected, skipping Python dependency installation prompt');
    return;
  }
  
  // Only ask in interactive terminals
  if (!process.stdin.isTTY) {
    console.log('Non-interactive environment detected, skipping Python dependency installation prompt');
    return;
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Would you like to set up Python dependencies now? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      console.log('You chose to install Python dependencies');
      console.log(`Please run "${CLI_COMMAND}" after installation to complete the setup`);
      
      // Inform about what's needed for Python dependency installation
      console.log('\nFor the Python setup, you will need:');
      console.log('1. Python 3.8 or higher installed on your system');
      console.log('2. pip package manager');
      console.log('3. python-venv package (or equivalent for your system)');
    } else {
      console.log('Skipping Python dependency installation');
      console.log(`You can set up Python dependencies later by running "${CLI_COMMAND}"`);
    }
    rl.close();
  });
};

// Main execution
try {
  buildApp();
  runElectronBuilderSetup();
  askForPythonInstall();
} catch (error) {
  console.error('Error during post-installation setup:', error);
}