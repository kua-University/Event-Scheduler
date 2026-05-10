# Event Scheduler for University Students

Live demo: [https://event-scheduler-jeqs.onrender.com](https://event-scheduler-jeqs.onrender.com)

## Features
- User registration & login (JWT)
- Create, edit, delete events
- Calendar view (month grid)
- Notifications for upcoming events (toast)
- Backup (export to CSV) & restore from CSV
- Monitoring (logs, API response time, uptime)

## Tech stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: PostgreSQL
- Deployment: Render + GitHub Actions CI/CD

## Run locally
1. Clone repo
2. Create `.env` file (see `.env.example`)
3. Run `npm install`
4. Start PostgreSQL
5. Run `node server.js`
