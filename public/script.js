function getToken() { return localStorage.getItem('token'); }

// ========== LOGIN ==========
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('userName', data.userName);
                window.location.href = 'dashboard.html';
            } else {
                document.getElementById('message').innerText = data.error;
            }
        } catch (err) {
            alert('Network error: ' + err.message);
        }
    });
}

// ========== REGISTER ==========
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();
            if (res.ok) {
                alert('Registration successful! Please login.');
                window.location.href = 'index.html';
            } else {
                document.getElementById('message').innerText = data.error;
            }
        } catch (err) {
            alert('Network error: ' + err.message);
        }
    });
}

// ========== DASHBOARD ==========
if (window.location.pathname.includes('dashboard')) {
    const token = getToken();
    if (!token) window.location.href = 'index.html';

    const userName = localStorage.getItem('userName') || 'User';
    document.getElementById('userName').innerText = userName;
    document.getElementById('userAvatar').innerText = userName.charAt(0).toUpperCase();

    let currentEvents = [];
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();

    async function refreshAll() {
        try {
            const res = await fetch('/api/events', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to load events');
            currentEvents = await res.json();
            updateStats();
            renderEventList();
            renderCalendar();
        } catch (err) {
            console.error(err);
            alert('Could not load events. Is backend running?');
        }
    }

    function updateStats() {
        const today = new Date().toISOString().slice(0,10);
        const upcoming = currentEvents.filter(e => e.event_date >= today).length;
        const thisMonth = currentEvents.filter(e => e.event_date.startsWith(`${currentYear}-${String(currentMonth+1).padStart(2,'0')}`)).length;
        document.getElementById('totalEvents').innerText = currentEvents.length;
        document.getElementById('upcomingEvents').innerText = upcoming;
        document.getElementById('monthEvents').innerText = thisMonth;
    }

    function renderEventList() {
        const container = document.getElementById('eventList');
        if (!container) return;
        if (currentEvents.length === 0) {
            container.innerHTML = '<div class="event-row">No events yet. Create one!</div>';
            return;
        }
        container.innerHTML = currentEvents.map(ev => `
            <div class="event-row">
                <div class="event-info">
                    <div class="event-name">${escapeHtml(ev.title)}</div>
                    <div class="event-meta">${ev.event_date} at ${ev.event_time}</div>
                </div>
                <div class="event-actions">
                    <button class="icon-btn edit-event" data-id="${ev.id}" data-title="${escapeHtml(ev.title)}" data-date="${ev.event_date}" data-time="${ev.event_time}"><i class="ti ti-edit"></i></button>
                    <button class="icon-btn delete-event" data-id="${ev.id}"><i class="ti ti-trash"></i></button>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.edit-event').forEach(btn => {
            btn.addEventListener('click', () => {
                localStorage.setItem('editEventId', btn.dataset.id);
                localStorage.setItem('editTitle', btn.dataset.title);
                localStorage.setItem('editDate', btn.dataset.date);
                localStorage.setItem('editTime', btn.dataset.time);
                window.location.href = 'edit-event.html';
            });
        });
        document.querySelectorAll('.delete-event').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Delete this event?')) {
                    const id = btn.dataset.id;
                    const res = await fetch(`/api/events/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        await refreshAll();
                    } else {
                        alert('Delete failed');
                    }
                }
            });
        });
    }

    function renderCalendar() {
        const grid = document.getElementById('calendarGrid');
        if (!grid) return;
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        document.getElementById('monthYearDisplay').innerText = `${monthNames[currentMonth]} ${currentYear}`;
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth+1, 0).getDate();
        let html = '<div class="cal-grid">';
        for (let d of ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']) html += `<div class="cal-day-hdr">${d}</div>`;
        for (let i=0; i<firstDay; i++) html += `<div class="cal-day empty-day"></div>`;
        for (let d=1; d<=daysInMonth; d++) {
            const dateStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const dayEvents = currentEvents.filter(ev => ev.event_date === dateStr);
            const isToday = (d === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear());
            let eventsHtml = '';
            if (dayEvents.length > 0) {
                eventsHtml = '<div class="cal-event-list">';
                dayEvents.forEach(ev => {
                    eventsHtml += `<div class="cal-event-chip" title="${ev.title} at ${ev.event_time}">${ev.title.substring(0,12)}</div>`;
                });
                eventsHtml += '</div>';
            } else {
                eventsHtml = '<div class="cal-event-list"><span class="no-event"> </span></div>';
            }
            const hasEventClass = dayEvents.length > 0 ? 'has-event' : '';
            html += `<div class="cal-day ${isToday ? 'today' : ''} ${hasEventClass}" data-date="${dateStr}">
                        <div class="cal-day-num">${d}</div>
                        ${eventsHtml}
                     </div>`;
        }
        html += '</div>';
        grid.innerHTML = html;

        document.querySelectorAll('.cal-day[data-date]').forEach(day => {
            day.addEventListener('click', () => {
                const date = day.dataset.date;
                const events = currentEvents.filter(ev => ev.event_date === date);
                if (events.length === 0) {
                    alert(`No events on ${date}`);
                } else {
                    const msg = events.map(ev => `• ${ev.title} at ${ev.event_time}`).join('\n');
                    alert(`Events on ${date}:\n${msg}`);
                }
            });
        });
    }

    function changeMonth(delta) {
        let newMonth = currentMonth + delta, newYear = currentYear;
        if (newMonth < 0) { newMonth = 11; newYear--; }
        if (newMonth > 11) { newMonth = 0; newYear++; }
        currentMonth = newMonth;
        currentYear = newYear;
        renderCalendar();
    }

    const saveEventBtn = document.getElementById('saveEventBtn');
    if (saveEventBtn) {
        saveEventBtn.addEventListener('click', async () => {
            const title = document.getElementById('evTitle').value.trim();
            const date = document.getElementById('evDate').value;
            const time = document.getElementById('evTime').value;
            if (!title || !date || !time) { alert('Please fill all fields'); return; }
            try {
                const res = await fetch('/api/events', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ title, date, time })
                });
                const data = await res.json();
                if (res.ok) {
                    document.getElementById('evTitle').value = '';
                    document.getElementById('evDate').value = '';
                    document.getElementById('evTime').value = '';
                    await refreshAll();
                    window.showPage('dashboard');
                    const msgDiv = document.getElementById('save-msg');
                    if (msgDiv) { msgDiv.style.display = 'flex'; setTimeout(() => msgDiv.style.display = 'none', 2000); }
                } else {
                    const conflictDiv = document.getElementById('conflict-banner');
                    if (conflictDiv) { conflictDiv.style.display = 'flex'; setTimeout(() => conflictDiv.style.display = 'none', 3000); }
                    else alert('Error: ' + (data.error || 'Unknown'));
                }
            } catch (err) {
                alert('Network error: ' + err.message);
            }
        });
    }

    // ========== NOTIFICATION CHECK ==========
    async function checkNotifications() {
        try {
            const res = await fetch('/api/events', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const events = await res.json();
            const now = new Date();
            const today = now.toISOString().slice(0, 10);
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            for (const event of events) {
                if (event.event_date !== today) continue;
                const [hour, minute] = event.event_time.split(':').map(Number);
                const eventMinutes = hour * 60 + minute;
                const diff = eventMinutes - currentMinutes;
                if (diff > 0 && diff <= 60 && !localStorage.getItem(`notified_${event.id}`)) {
                    const toast = document.getElementById('notificationToast');
                    if (toast) {
                        toast.innerHTML = `<strong>${escapeHtml(event.title)}</strong> at ${event.event_time} on ${event.event_date}`;
                        toast.classList.add('show');
                        localStorage.setItem(`notified_${event.id}`, 'true');
                        setTimeout(() => toast.classList.remove('show'), 8000);
                    }
                }
            }
        } catch (err) {
            console.error('Notification error:', err);
        }
    }

    // ========== TEST TOAST BUTTON ==========
    const testToastBtn = document.getElementById('testToastBtn');
    if (testToastBtn) {
        testToastBtn.addEventListener('click', () => {
            const toast = document.getElementById('notificationToast');
            if (toast) {
                toast.innerHTML = '🔔 TEST NOTIFICATION (manual)';
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 3000);
            } else {
                alert('Toast element not found');
            }
        });
    }

    // ========== MONITORING LOGS ==========
    async function refreshLogs() {
        try {
            const res = await fetch('/api/logs');
            const data = await res.json();
            const logContainer = document.getElementById('logContainer');
            if (logContainer && data.logs) {
                logContainer.innerHTML = data.logs.map(line => {
                    let color = '#10b981';
                    if (line.includes('[ERROR]')) color = '#ef4444';
                    else if (line.includes('[WARN]')) color = '#f59e0b';
                    return `<div class="log-line" style="color:${color};">${escapeHtml(line)}</div>`;
                }).join('');
            }
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        }
    }

    // ========== MONITORING METRICS ==========
    async function updateMetrics() {
        try {
            const res = await fetch('/api/stats');
            const stats = await res.json();
            document.getElementById('apiTime').innerText = `${stats.avgApiTime} ms`;
            document.getElementById('activeSessions').innerText = stats.activeSessions;
            document.getElementById('uptime').innerText = stats.uptime;

            if (window.performance && window.performance.timing) {
                const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
                document.getElementById('pageLoad').innerText = `${loadTime} ms`;
                const loadPercent = Math.min(100, (loadTime / 2000) * 100);
                document.getElementById('loadFill').style.width = `${loadPercent}%`;
            } else {
                document.getElementById('pageLoad').innerText = 'N/A';
            }

            const apiPercent = Math.min(100, (stats.avgApiTime / 200) * 100);
            document.getElementById('apiFill').style.width = `${apiPercent}%`;
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    }

    // Backup buttons
    const backupBtn = document.getElementById('backupBtn');
    if (backupBtn) {
        backupBtn.addEventListener('click', async () => {
            try {
                const res = await fetch('/api/backup/export?key=my_backup_secret_123');
                const data = await res.json();
                alert(data.message || data.error || 'Backup completed');
            } catch (err) { alert('Network error: ' + err.message); }
        });
    }
    const backupPageBtn = document.getElementById('backupPageBtn');
    if (backupPageBtn) {
        backupPageBtn.addEventListener('click', async () => {
            try {
                const res = await fetch('/api/backup/export?key=my_backup_secret_123');
                const data = await res.json();
                const msgDiv = document.getElementById('backupMsg');
                if (msgDiv) msgDiv.innerText = data.message || data.error || 'Done';
            } catch (err) { alert('Network error: ' + err.message); }
        });
    }

    // ========== RESTORE BUTTON HANDLER (new) ==========
    const restoreBtn = document.getElementById('restoreBtn');
    if (restoreBtn) {
        restoreBtn.addEventListener('click', async () => {
            const usersFile = document.getElementById('restoreUsersFile').files[0];
            const eventsFile = document.getElementById('restoreEventsFile').files[0];
            if (!usersFile || !eventsFile) {
                alert('Please select both users and events CSV files');
                return;
            }
            if (!confirm('This will overwrite all existing data. Are you sure?')) return;

            const formData = new FormData();
            formData.append('users', usersFile);
            formData.append('events', eventsFile);

            try {
                const res = await fetch('/api/backup/restore?key=my_backup_secret_123', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                const msgDiv = document.getElementById('restoreMsg');
                if (res.ok) {
                    if (msgDiv) {
                        msgDiv.style.color = '#10b981';
                        msgDiv.innerText = data.message || 'Restore successful! Refresh the page to see changes.';
                    }
                    alert('Restore successful! Refresh the page to see changes.');
                } else {
                    if (msgDiv) {
                        msgDiv.style.color = '#ef4444';
                        msgDiv.innerText = 'Restore failed: ' + (data.error || 'Unknown error');
                    }
                    alert('Restore failed: ' + data.error);
                }
            } catch (err) {
                alert('Network error: ' + err.message);
            }
        });
    }

    // Navigation
    window.showPage = function(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`page-${pageId}`).classList.add('active');
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`.nav-item[data-page="${pageId}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        const titles = { dashboard: 'Dashboard', calendar: 'Calendar', create: 'Create event', backup: 'Backup', monitor: 'Monitoring' };
        document.getElementById('page-title').innerText = titles[pageId];
        if (pageId === 'calendar') renderCalendar();
        if (pageId === 'dashboard') updateStats();
        if (pageId === 'monitor') refreshLogs();
    };

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.getAttribute('data-page');
            if (page) window.showPage(page);
        });
    });
    document.getElementById('prevMonthBtn')?.addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonthBtn')?.addEventListener('click', () => changeMonth(1));
    document.getElementById('cancelCreateBtn')?.addEventListener('click', () => window.showPage('dashboard'));
    document.getElementById('logoutBtn')?.addEventListener('click', () => { localStorage.clear(); window.location.href = 'index.html'; });

    refreshAll();
    window.showPage('dashboard');
    setInterval(checkNotifications, 60000);
    checkNotifications();
    setInterval(refreshLogs, 5000);
    setInterval(updateMetrics, 5000);
    updateMetrics();
}

// ========== EDIT PAGE ==========
if (window.location.pathname.includes('edit-event.html')) {
    const token = getToken();
    if (!token) window.location.href = 'index.html';
    document.getElementById('editTitle').value = localStorage.getItem('editTitle') || '';
    document.getElementById('editDate').value = localStorage.getItem('editDate') || '';
    document.getElementById('editTime').value = localStorage.getItem('editTime') || '';
    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = localStorage.getItem('editEventId');
            const title = document.getElementById('editTitle').value;
            const date = document.getElementById('editDate').value;
            const time = document.getElementById('editTime').value;
            const res = await fetch(`/api/events/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title, date, time })
            });
            if (res.ok) {
                localStorage.removeItem('editEventId');
                localStorage.removeItem('editTitle');
                localStorage.removeItem('editDate');
                localStorage.removeItem('editTime');
                window.location.href = 'dashboard.html';
            } else alert('Update failed');
        });
    }
    document.getElementById('cancelEditBtn')?.addEventListener('click', () => window.location.href = 'dashboard.html');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : (m === '<' ? '&lt;' : '&gt;'));
}