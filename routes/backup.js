const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const csv = require('csv-parser');
const pool = require('../db');
const router = express.Router();

const BACKUP_KEY = process.env.BACKUP_KEY || 'my_backup_secret_123';
const upload = multer({ dest: 'uploads/' });

// Helper: format a Date object to YYYY-MM-DD
function toISODate(date) {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
}

// Helper: extract time string HH:MM:SS from any messy input
function extractTime(timeStr) {
    if (!timeStr) return '00:00:00';
    const match = timeStr.match(/(\d{2}:\d{2}(?::\d{2})?)/);
    if (match) {
        let t = match[1];
        if (t.split(':').length === 2) t += ':00';
        return t;
    }
    return '00:00:00';
}

// Helper: parse various date formats into YYYY-MM-DD, return null if invalid year (>2100)
function parseDateSafe(dateStr) {
    if (!dateStr) return null;
    // Already ISO?
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    if (year > 2100) return null; // skip impossible years (e.g., 232233)
    return toISODate(d);
}

// EXPORT – stores clean ISO dates
router.get('/export', async (req, res) => {
    const key = req.query.key;
    if (key !== BACKUP_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const users = await pool.query('SELECT id, name, email, password FROM users');
        const events = await pool.query('SELECT id, title, event_date, event_time, user_id FROM events');
        
        const backupDir = path.join(__dirname, '../backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const usersFile = path.join(backupDir, `users_${timestamp}.csv`);
        const eventsFile = path.join(backupDir, `events_${timestamp}.csv`);
        
        // Write users
        const userRows = users.rows.map(u => `${u.id},${u.name},${u.email},${u.password}`).join('\n');
        fs.writeFileSync(usersFile, `id,name,email,password\n${userRows}`);
        
        // Write events with clean ISO dates
        const eventRows = events.rows.map(e => {
            const cleanDate = toISODate(e.event_date) || '';
            return `${e.id},${e.title},${cleanDate},${e.event_time},${e.user_id}`;
        }).join('\n');
        fs.writeFileSync(eventsFile, `id,title,date,time,user_id\n${eventRows}`);
        
        res.json({ message: 'Backup successful', files: [`users_${timestamp}.csv`, `events_${timestamp}.csv`] });
    } catch (err) {
        console.error('Backup error:', err);
        res.status(500).json({ error: 'Backup failed' });
    }
});

// RESTORE – handles messy CSV entries, skips bad data
router.post('/restore', upload.fields([{ name: 'users' }, { name: 'events' }]), async (req, res) => {
    const key = req.query.key;
    if (key !== BACKUP_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        await pool.query('DELETE FROM events');
        await pool.query('DELETE FROM users');
        
        // Restore users
        if (req.files['users']) {
            const usersFile = req.files['users'][0].path;
            const users = [];
            await new Promise((resolve, reject) => {
                fs.createReadStream(usersFile)
                    .pipe(csv())
                    .on('data', (row) => users.push(row))
                    .on('end', resolve)
                    .on('error', reject);
            });
            for (const user of users) {
                await pool.query(
                    'INSERT INTO users (id, name, email, password) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
                    [parseInt(user.id), user.name, user.email, user.password]
                );
            }
        }
        
        // Restore events, skipping invalid rows
        let skipped = 0;
        if (req.files['events']) {
            const eventsFile = req.files['events'][0].path;
            const events = [];
            await new Promise((resolve, reject) => {
                fs.createReadStream(eventsFile)
                    .pipe(csv())
                    .on('data', (row) => events.push(row))
                    .on('end', resolve)
                    .on('error', reject);
            });
            for (const ev of events) {
                const parsedDate = parseDateSafe(ev.date);
                if (!parsedDate) {
                    console.warn(`Skipping event with invalid date: ${ev.date}`);
                    skipped++;
                    continue;
                }
                const cleanedTime = extractTime(ev.time);
                await pool.query(
                    'INSERT INTO events (id, title, event_date, event_time, user_id) VALUES ($1, $2, $3, $4::time, $5) ON CONFLICT (id) DO NOTHING',
                    [parseInt(ev.id), ev.title, parsedDate, cleanedTime, parseInt(ev.user_id)]
                );
            }
        }
        
        // Cleanup uploaded files
        if (req.files['users']) fs.unlinkSync(req.files['users'][0].path);
        if (req.files['events']) fs.unlinkSync(req.files['events'][0].path);
        
        res.json({ message: `Restore successful. Skipped ${skipped} invalid events.` });
    } catch (err) {
        console.error('Restore error:', err);
        res.status(500).json({ error: 'Restore failed: ' + err.message });
    }
});

module.exports = router;