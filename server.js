require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pool = require('./db');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const backupRoutes = require('./routes/backup');
const { log } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Create tables automatically (if they don't exist) ----------
const createTables = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            );
            CREATE TABLE IF NOT EXISTS events (
                id SERIAL PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                event_date DATE NOT NULL,
                event_time TIME NOT NULL,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        console.log('✅ Tables verified/created successfully.');
    } catch (err) {
        console.error('❌ Error creating tables:', err.message);
    }
};
createTables();

// ---------- Middleware to track API response time and active sessions ----------
let requestTimes = [];
const activeUsers = new Set();
const USER_ACTIVE_TIMEOUT = 60 * 60 * 1000;

app.use((req, res, next) => {
    const start = Date.now();
    const originalEnd = res.end;
    res.end = function(...args) {
        const duration = Date.now() - start;
        if (req.path.startsWith('/api/')) {
            requestTimes.push(duration);
            if (requestTimes.length > 20) requestTimes.shift();
        }
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userId = decoded.id;
                activeUsers.add(userId);
                setTimeout(() => activeUsers.delete(userId), USER_ACTIVE_TIMEOUT);
            } catch(e) {}
        }
        originalEnd.apply(res, args);
    };
    next();
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/backup', backupRoutes);

// Logs endpoint
app.get('/api/logs', (req, res) => {
    const logFile = path.join(__dirname, 'logs', 'app.log');
    if (!fs.existsSync(logFile)) {
        return res.json({ logs: ['No logs yet.'] });
    }
    try {
        const content = fs.readFileSync(logFile, 'utf8');
        const lines = content.trim().split('\n').filter(l => l.trim());
        const lastLines = lines.slice(-20);
        res.json({ logs: lastLines });
    } catch (err) {
        log(`Failed to read logs: ${err.message}`, 'ERROR');
        res.status(500).json({ error: 'Could not read logs' });
    }
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
    const uptimeSeconds = process.uptime();
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);
    const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;
    const avgApiTime = requestTimes.length ? requestTimes.reduce((a,b) => a+b,0) / requestTimes.length : 0;
    res.json({
        uptime: uptimeStr,
        activeSessions: activeUsers.size,
        avgApiTime: Math.round(avgApiTime)
    });
});

// Catch‑all – serve index.html
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    log(`Server running at http://localhost:${PORT}`, 'INFO');
});