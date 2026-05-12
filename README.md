# Event Scheduler for University Students

A fully functional event scheduling system designed for university students. It allows users to register, log in, create personal events, view them in a list or monthly calendar, receive notifications for upcoming events, backup data to CSV, restore from backup, and monitor system logs and performance metrics.

## 🚀 Live Demo

[https://event-scheduler-jeqs.onrender.com](https://event-scheduler-jeqs.onrender.com)

> *Render free tier spins down after 15 minutes of inactivity – the first request may take 30–50 seconds to wake up.*

## 📁 Repository

[https://github.com/kua-University/Event-Scheduler](https://github.com/kua-University/Event-Scheduler)

---

## ✨ Features

- **User authentication** – Register, login, JWT tokens, password hashing (bcrypt)
- **Event CRUD** – Create, read, update, delete personal events
- **Overlap prevention** – Cannot create two events on the same date and time
- **Calendar view** – Month grid with event chips, click to see event list
- **List view** – Upcoming events with edit/delete buttons
- **Notifications** – Toast appears for events within the next hour (checks every minute)
- **Backup & Restore** – Export all data to CSV, restore from CSV (via API or UI button)
- **Monitoring** – Real‑time logs (`/api/logs`) and system metrics (`/api/stats`)
- **Responsive design** – Works on desktop, tablet, and mobile
- **CI/CD** – Automatic deployment to Render on every `git push` (GitHub Actions)
- **Unit test** – Basic Jest test for health endpoint

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML, CSS, JavaScript (plain, no frameworks) |
| Backend | Node.js, Express.js |
| Database | PostgreSQL (local or cloud) |
| Authentication | JWT, bcrypt |
| Deployment | Render (cloud), GitHub Actions (CI/CD) |
| Testing | Jest, Supertest |
| Version control | Git, GitHub |

---

## 📦 Local Development Setup

### 1. Prerequisites

- Node.js (v18 or later)
- PostgreSQL (v14 or later)
- Git

### 2. Clone the repository

```bash
git clone https://github.com/kua-University/Event-Scheduler.git
cd Event-Scheduler
```

### 3. Install dependencies

```bash
npm install
```

### 4. Create a PostgreSQL database

```sql
CREATE DATABASE event_scheduler;
```

Then create the tables (or they will be auto‑created on first start):

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);
```

### 5. Configure environment variables

Create a `.env` file in the root directory:

```
PORT=3000
DB_USER=postgres
DB_HOST=127.0.0.1
DB_NAME=event_scheduler
DB_PASSWORD=admin123
DB_PORT=5432
JWT_SECRET=my_super_secret_key
BACKUP_KEY=my_backup_secret_123
```

> **Never commit `.env` to version control.** It is already ignored by `.gitignore`.

### 6. Run the server

```bash
node server.js
```

Open `http://localhost:3000` in your browser.

### 7. Run tests

```bash
npm test
```

---

## 📂 Project Structure

```
event-scheduler/
├── __tests__/               # Jest test files
├── backups/                 # CSV backup files (auto‑created)
├── db/                      # Database connection & repositories
│   ├── index.js
│   ├── userRepository.js
│   └── eventRepository.js
├── logs/                    # Application logs (auto‑created)
├── public/                  # Frontend static files
│   ├── index.html
│   ├── register.html
│   ├── dashboard.html
│   ├── edit-event.html
│   ├── style.css
│   └── script.js
├── routes/                  # API routes
│   ├── auth.js
│   ├── events.js
│   └── backup.js
├── utils/                   # Helper modules
│   └── logger.js
├── .dockerignore
├── .env                     
├── .gitignore
├── Dockerfile               
├── jest.config.js
├── package.json
└── server.js
```

---

## ☁️ Deployment (Render)

The project is already deployed at the live URL above. The deployment uses:

- **Render Web Service** – runs `npm install` and `node server.js`
- **Render PostgreSQL** – free database, internal connection string
- **GitHub Actions** – automatically redeploys on every push to `master`

To set up your own deployment:

1. Fork the repository.
2. Create a new Web Service on [Render](https://render.com).
3. Connect your GitHub repo.
4. Set environment variables (same as `.env` but without file).
5. Create a PostgreSQL database on Render (free tier) and use its internal connection string.
6. Enable auto‑deploy from GitHub.

---

## 🧪 API Endpoints (Examples)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/auth/register` | Register a new user |
| POST   | `/api/auth/login`    | Login, returns JWT token |
| GET    | `/api/events`        | Get all events of logged user |
| POST   | `/api/events`        | Create a new event |
| PUT    | `/api/events/:id`    | Update an event |
| DELETE | `/api/events/:id`    | Delete an event |
| GET    | `/api/backup/export` | Export users & events to CSV |
| POST   | `/api/backup/restore`| Restore from CSV files |
| GET    | `/api/logs`          | Get last 20 log lines |
| GET    | `/api/stats`         | Get API response time, uptime, active sessions |
| GET    | `/health`            | Health check |

> All event endpoints require a valid JWT token in the `Authorization` header (`Bearer <token>`).

---

## 🔒 Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens expire after 1 day
- All database queries use parameterised statements to prevent SQL injection
- Environment variables (`.env`) excluded from version control
- Render uses internal database connection (no public exposure)

---

## 📝 License

This project was developed as part of the Software Architecture and Design course at Mekelle University. For academic use only.

---

## 👤 Author

**Haftom Gebrehiwot**  
ID: ugr/188215/16  
Section: 2  
Submitted to: Mesele Niguse

---

## 🙏 Acknowledgements

- Node.js, Express, PostgreSQL communities
- Render for free hosting
- GitHub Actions for CI/CD

