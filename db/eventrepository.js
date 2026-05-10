const pool = require('./index');

async function getEventsByUser(userId) {
    const result = await pool.query(
        'SELECT id, title, event_date, event_time FROM events WHERE user_id = $1 ORDER BY event_date, event_time',
        [userId]
    );
    return result.rows;
}

async function createEvent(title, date, time, userId) {
    await pool.query(
        'INSERT INTO events (title, event_date, event_time, user_id) VALUES ($1, $2, $3, $4)',
        [title, date, time, userId]
    );
}

async function updateEvent(eventId, title, date, time, userId) {
    const result = await pool.query(
        'UPDATE events SET title = $1, event_date = $2, event_time = $3 WHERE id = $4 AND user_id = $5',
        [title, date, time, eventId, userId]
    );
    return result.rowCount > 0;
}

async function deleteEvent(eventId, userId) {
    const result = await pool.query(
        'DELETE FROM events WHERE id = $1 AND user_id = $2',
        [eventId, userId]
    );
    return result.rowCount > 0;
}

// Check for overlapping events for the same user on the same day
async function hasOverlap(userId, date, time, excludeEventId = null) {
    let query = `
        SELECT id FROM events 
        WHERE user_id = $1 AND event_date = $2 AND event_time = $3
    `;
    const params = [userId, date, time];
    if (excludeEventId) {
        query += ` AND id != $4`;
        params.push(excludeEventId);
    }
    const result = await pool.query(query, params);
    return result.rows.length > 0;
}

module.exports = { getEventsByUser, createEvent, updateEvent, deleteEvent, hasOverlap };