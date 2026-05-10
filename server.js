require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const backupRoutes = require('./routes/backup');
const { log } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Metrics storage ----------
let requestTimes = []; // store last 10 response times (ms)
const activeUsers = new Set(); // user IDs that have made a request in last 60 minutes
const USER_ACTIVE_TIMEOUT = 60 * 60 * 1000; // 1 hour

// Middleware to track API response time and active sessions
app.use((req, res, next) => {
    const start = Date.now();
    // Capture original end function
    const originalEnd = res.end;
    res.end = function(...args) {
        const duration = Date.now() - start;
        // Only track API routes (not static files)
        if (req.path.startsWith('/api/')) {
            requestTimes.push(duration);
            if (requestTimes.length > 20) requestTimes.shift(); // keep last 20
        }
        // Track active user (if token present)
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userId = decoded.id;
                activeUsers.add(userId);
                // Schedule removal after 1 hour (simplified: we'll just clear old entries later)
                setTimeout(() => {
                    activeUsers.delete(userId);
                }, USER_ACTIVE_TIMEOUT);
            } catch(e) { /* ignore invalid tokens */ }
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

// Logs endpoint (already there)
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

// Stats endpoint for monitoring page
app.get('/api/stats', (req, res) => {
    const uptimeSeconds = process.uptime();
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);
    const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

    const avgApiTime = requestTimes.length ? requestTimes.reduce((a,b)=>a+b,0) / requestTimes.length : 0;

    res.json({
        uptime: uptimeStr,
        activeSessions: activeUsers.size,
        avgApiTime: Math.round(avgApiTime),
        // Page load time is measured client-side; we'll return server uptime as extra
    });
});

// Catch‑all – serve index.html
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    log(`Server running at http://localhost:${PORT}`, 'INFO');
});