// utils/logger.js
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../logs/app.log');

// Ensure logs directory exists
if (!fs.existsSync(path.dirname(logFile))) {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
}

function log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${type}] ${message}\n`;
    fs.appendFileSync(logFile, logLine);
    console.log(logLine.trim());
}

module.exports = { log };