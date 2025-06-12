const { spawn } = require('child_process');
const path = require('path');

// Function to start a process
function startProcess(file) {
    const proc = spawn('node', [path.join(__dirname, file)], {
        stdio: 'inherit'
    });

    proc.on('error', (error) => {
        console.error(`Error starting ${file}:`, error);
    });

    return proc;
}

// Start both processes
const deployProcess = startProcess('deploy-commands.js');
const botProcess = startProcess('index.js');

// Handle cleanup on exit
process.on('SIGINT', () => {
    botProcess.kill();
    deployProcess.kill();
    process.exit();
});
