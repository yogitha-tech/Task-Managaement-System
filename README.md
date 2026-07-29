# Task Manager Pro (Simple Edition)

A lightweight task management web app: Node.js + Express backend, SQLite database, plain HTML/CSS/JS frontend. No build step, no auth — just create, edit, filter, search, and track tasks.

## Features
- Create, edit, delete tasks
- Priority: LOW / MEDIUM / HIGH
- Status: TODO / IN_PROGRESS / DONE (with quick inline status change)
- Search by title/description
- Filter by status and priority
- Sort by date, due date, priority, or title
- Dashboard stats (total, todo, in progress, done)
- Delete confirmation modal
- Toast notifications
- Server-side validation with clear error messages

## Tech Stack
- **Backend:** Node.js, Express, better-sqlite3
- **Frontend:** Plain HTML, CSS, JavaScript (no framework, no build step)
- **Database:** SQLite (single file, `tasks.db`, created automatically)

## Project Structure
```
task-manager-pro/
├── server.js          # Express app entry point
├── db.js              # SQLite connection + schema
├── routes/
│   └── tasks.js        # All /api/tasks routes (CRUD, search, filter)
├── public/
│   ├── index.html       # UI markup
│   ├── style.css        # Styling
│   └── app.js            # Frontend logic (fetch calls, rendering)
├── package.json
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+

### Install & Run
```bash
npm install
npm start
```

The app will be available at **http://localhost:3000**. The SQLite database file (`tasks.db`) is created automatically on first run.

Optional: set a custom port with the `PORT` environment variable:
```bash
PORT=4000 npm start
```

## API Reference

| Method | Endpoint              | Description                          |
|--------|------------------------|---------------------------------------|
| GET    | /api/tasks              | List tasks (supports `?status=`, `?priority=`, `?sortBy=`, `?order=`) |
| GET    | /api/tasks/search?q=    | Search tasks by title/description     |
| GET    | /api/tasks/:id           | Get a single task                     |
| POST   | /api/tasks               | Create a task                         |
| PUT    | /api/tasks/:id           | Update a task (partial updates ok)    |
| DELETE | /api/tasks/:id           | Delete a task                         |
| GET    | /api/health               | Health check                          |

### Task object
```json
{
  "id": 1,
  "title": "Write tests",
  "description": "Cover all endpoints",
  "priority": "HIGH",
  "status": "TODO",
  "dueDate": "2026-08-05",
  "createdAt": "2026-07-28 16:03:26",
  "updatedAt": "2026-07-28 16:03:26"
}
```

### Validation rules
- `title` — required, non-empty
- `description` — required, non-empty
- `dueDate` — required, valid date
- `priority` — one of `LOW`, `MEDIUM`, `HIGH` (defaults to `MEDIUM`)
- `status` — one of `TODO`, `IN_PROGRESS`, `DONE` (defaults to `TODO`)

## Notes
- This is a deliberately simple, single-user app — no login/authentication.
- The database is a single SQLite file, so it's easy to inspect, back up, or delete (`rm tasks.db`) to reset.
