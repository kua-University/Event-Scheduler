const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { log } = require('../utils/logger');
const router = express.Router();

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

async function hasOverlap(userId, date, time, excludeEventId = null) {
    let query = 'SELECT id FROM events WHERE user_id = $1 AND event_date = $2 AND event_time = $3';
    const params = [userId, date, time];
    if (excludeEventId) {
        query += ' AND id != $4';
        params.push(excludeEventId);
    }
    const result = await pool.query(query, params);
    return result.rows.length > 0;
}

router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, title, event_date, event_time FROM events WHERE user_id = $1 ORDER BY event_date, event_time',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        log(`GET events error: ${err.message}`, 'ERROR');
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    const { title, date, time } = req.body;
    if (!title || !date || !time) {
        return res.status(400).json({ error: 'Title, date, and time required' });
    }
    try {
        const overlapping = await hasOverlap(req.user.id, date, time);
        if (overlapping) {
            return res.status(409).json({ error: 'Another event already exists at this date and time' });
        }
        await pool.query(
            'INSERT INTO events (title, event_date, event_time, user_id) VALUES ($1, $2, $3, $4)',
            [title, date, time, req.user.id]
        );
        log(`Event created: ${title} on ${date} at ${time} by user ${req.user.id}`, 'INFO');
        res.status(201).json({ message: 'Event added' });
    } catch (err) {
        log(`POST event error: ${err.message}`, 'ERROR');
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', authenticateToken, async (req, res) => {
    const eventId = parseInt(req.params.id);
    const { title, date, time } = req.body;
    if (!title || !date || !time) {
        return res.status(400).json({ error: 'Title, date, and time required' });
    }
    try {
        const overlapping = await hasOverlap(req.user.id, date, time, eventId);
        if (overlapping) {
            return res.status(409).json({ error: 'Another event already exists at this date and time' });
        }
        const result = await pool.query(
            'UPDATE events SET title = $1, event_date = $2, event_time = $3 WHERE id = $4 AND user_id = $5',
            [title, date, time, eventId, req.user.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        log(`Event updated: ID ${eventId} for user ${req.user.id}`, 'INFO');
        res.json({ message: 'Event updated' });
    } catch (err) {
        log(`PUT event error: ${err.message}`, 'ERROR');
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    const eventId = parseInt(req.params.id);
    try {
        const result = await pool.query('DELETE FROM events WHERE id = $1 AND user_id = $2', [eventId, req.user.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        log(`Event deleted: ID ${eventId} for user ${req.user.id}`, 'INFO');
        res.json({ message: 'Event deleted' });
    } catch (err) {
        log(`DELETE event error: ${err.message}`, 'ERROR');
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;