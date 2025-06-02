#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const readline = require('readline');
const https = require('https');
const { execSync } = require('child_process');

// Get the package root directory
const packageRoot = path.resolve(__dirname, '..');

// Check if we're running from a globally installed package or locally
const isGlobalInstall = __dirname.includes('node_modules');

// THIS IS THE NPM CLI COMMAND - MUST BE npc-stu
// The internal app name and directories remain npc-studio and .npcsh
const CLI_COMMAND = 'npc-stu'; // For npm installation
const APP_NAME = 'npc-studio'; // Internal name remains the same
const APP_DIR = '.npcsh';      // Directory remains the same

console.log(`Starting ${APP_NAME}...`);

// Download a file from a URL
const downloadFile = (url, destination) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${url} to ${destination}`);
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(destination, () => {}); // Delete the file on error
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlink(destination, () => {}); // Delete the file on error
      reject(err);
    });
  });
};

// Handle Python dependency setup
const setupPython = async () => {
  const appDir = path.join(os.homedir(), APP_DIR);
  const pythonConfigPath = path.join(appDir, 'config.json');
  
  // Create config directory if it doesn't exist
  if (!fs.existsSync(appDir)) {
    fs.mkdirSync(appDir, { recursive: true });
  }
  
  // Check if Python dependencies are already set up
  let shouldSetup = true;
  if (fs.existsSync(pythonConfigPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(pythonConfigPath, 'utf8'));
      shouldSetup = !config.pythonSetupComplete;
    } catch (err) {
      console.error('Error reading config file:', err);
    }
  }

  // If setup is required, ask user if they want to install Python dependencies
  if (shouldSetup) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    try {
      const answer = await new Promise((resolve) => {
        rl.question(`Would you like to install Python dependencies for ${APP_NAME}? (y/n): `, (answer) => {
          resolve(answer.toLowerCase());
        });
      });

      if (answer === 'y' || answer === 'yes') {
        console.log('Setting up Python environment...');
        
        // Create a virtual environment
        const venvPath = path.join(appDir, 'venv');
        console.log(`Creating virtual environment at ${venvPath}...`);
        
        try {
          // Check for Python/pip availability
          spawn('python3', ['-c', 'import sys; print(sys.executable)'], {
            stdio: 'inherit'
          }).on('exit', (code) => {
            if (code !== 0) {
              console.error('Python 3 not found. Please install Python 3 and try again.');
              process.exit(1);
            }
            
            // Create virtual environment
            spawn('python3', ['-m', 'venv', venvPath], {
              stdio: 'inherit'
            }).on('exit', async (code) => {
              if (code !== 0) {
                console.error('Failed to create virtual environment. Please install python3-venv and try again.');
                process.exit(1);
              }
              
              // Platform-specific path to pip
              const pipPath = process.platform === 'win32' ? 
                path.join(venvPath, 'Scripts', 'pip') :
                path.join(venvPath, 'bin', 'pip');
              
              // Download requirements.txt from GitHub repository
              const requirementsUrl = 'https://raw.githubusercontent.com/cagostino/npc-studio/main/requirements.txt';
              const tempRequirementsPath = path.join(appDir, 'requirements.txt');
              
              try {
                // Download requirements.txt
                await downloadFile(requirementsUrl, tempRequirementsPath);
                
                // Install requirements
                spawn(pipPath, ['install', '-r', tempRequirementsPath], {
                  stdio: 'inherit'
                }).on('exit', (code) => {
                  if (code !== 0) {
                    console.error('Failed to install Python dependencies.');
                  } else {
                    console.log('Python dependencies installed successfully!');
                    
                    // Save config indicating setup is complete
                    fs.writeFileSync(pythonConfigPath, JSON.stringify({
                      pythonSetupComplete: true,
                      venvPath: venvPath,
                      setupDate: new Date().toISOString()
                    }));
                  }
                  
                  // Launch the application
                  launchApp(venvPath);
                });
              } catch (err) {
                console.error('Error downloading requirements:', err);
                launchApp();
              }
            });
          });
        } catch (err) {
          console.error('Error setting up Python environment:', err);
          launchApp();
        }
      } else {
        console.log('Skipping Python dependency installation.');
        launchApp();
      }
    } finally {
      rl.close();
    }
  } else {
    // Python already set up, just launch the app
    const config = JSON.parse(fs.readFileSync(pythonConfigPath, 'utf8'));
    launchApp(config.venvPath);
  }
};

// Start the Python backend server
const startPythonBackend = (venvPath) => {
  if (!venvPath) {
    console.log('No Python environment found, skipping backend server start');
    return null;
  }
  
  try {
    const pythonPath = process.platform === 'win32' ? 
      path.join(venvPath, 'Scripts', 'python') : 
      path.join(venvPath, 'bin', 'python');
    
    console.log('Starting Python backend server...');
    const backendProcess = spawn(pythonPath, ['-m', 'npcpy.serve', '-p', '5337', '-c', 'localhost:5173'], {
      stdio: 'inherit',
      detached: false
    });
    
    backendProcess.on('error', (err) => {
      console.error('Failed to start Python backend:', err);
    });
    
    // Give the server a moment to start
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Backend server started');
        resolve(backendProcess);
      }, 2000);
    });
  } catch (err) {
    console.error('Error starting Python backend:', err);
    return null;
  }
};

// Launch the Electron application
const launchApp = async (venvPath) => {
  // Start the Python backend first
  const backendProcess = await startPythonBackend(venvPath);
  
  // Determine the correct path to the main.js file
  const mainPath = isGlobalInstall 
    ? path.join(packageRoot, 'src', 'main.js') 
    : path.join(packageRoot, 'src', 'main.js');

  try {
    // Set up environment variables for the Electron process
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      ELECTRON_RUN_AS_NODE: '0'
    };
    
    // Get the path to the Electron executable
    const electron = require('electron');
    
    // Start the Electron process with the main.js file
    const electronProcess = spawn(electron, [mainPath], {
      stdio: 'inherit',
      env
    });
    
    electronProcess.on('close', (code) => {
      console.log(`NPC Studio exited with code ${code}`);
      
      // Kill the backend process if it exists
      if (backendProcess) {
        console.log('Stopping Python backend server...');
        if (!backendProcess.killed) {
          backendProcess.kill();
        }
      }
      
      process.exit(code);
    });
    
    // Handle termination signals
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, () => {
        if (electronProcess && !electronProcess.killed) {
          electronProcess.kill();
        }
        
        if (backendProcess && !backendProcess.killed) {
          backendProcess.kill();
        }
      });
    });
  } catch (error) {
    console.error('Error launching Electron app:', error);
    process.exit(1);
  }
};

// Start the setup process
setupPython();