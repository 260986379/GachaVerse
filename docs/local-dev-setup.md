# Local Development Setup

## Project Structure

```
D:\GachaVerse\
├── .git/
├── .gitignore
├── .vscode/
│   ├── extensions.json     ← recommended extensions
│   ├── launch.json         ← Node debugger config
│   └── settings.json       ← format-on-save, ESLint, etc.
├── backend/
│   ├── node_modules/
│   ├── .env                ← your real secrets (gitignored)
│   ├── .env.example        ← committed template
│   ├── .gitignore
│   ├── package.json
│   └── server.js
└── frontend/
    ├── node_modules/
    ├── src/
    │   └── App.jsx         ← fetches /api/hello
    ├── .gitignore
    ├── vite.config.js      ← proxy: /api → localhost:5000
    └── package.json
```

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | v20.6.0 | Works. Upgrade to v20.19+ later to unlock Vite 9 |
| npm | 10.1.0 | Good |
| Git | 2.42 | Good |
| PostgreSQL | — | See PostgreSQL Setup below |

---

## 1. Run the Backend

```powershell
cd D:\GachaVerse\backend
npm run dev
```

Expected output:
```
Server running on http://localhost:5000
PostgreSQL connection error: ...   ← expected until Postgres is set up
```

Test it: open `http://localhost:5000/api/hello` → `{ "message": "Hello from GachaVerse Backend!" }`

---

## 2. Run the Frontend

Open a **second terminal**:

```powershell
cd D:\GachaVerse\frontend
npm run dev
```

Open `http://localhost:5173` — you'll see:

> **Hello from GachaVerse Frontend!**
> Backend says: **Hello from GachaVerse Backend!**

The Vite proxy in `vite.config.js` forwards all `/api/*` requests to `localhost:5000` automatically — no CORS issues.

---

## 3. Configure DB Credentials

Edit `backend/.env` (already created, gitignored):

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gachaverse_dev
DB_USER=gachaverse_user
DB_PASSWORD=your_password_here
```

---

## 4. PostgreSQL Setup

**Install:** Download from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) — use the interactive installer, it includes pgAdmin.

**After install,** open **SQL Shell (psql)** or pgAdmin and run:

```sql
CREATE DATABASE gachaverse_dev;

CREATE USER gachaverse_user WITH PASSWORD 'your_password_here';

GRANT ALL PRIVILEGES ON DATABASE gachaverse_dev TO gachaverse_user;
```

Update `backend/.env` with the password you chose, then restart the backend. You'll see `PostgreSQL connected successfully` instead of the error.

---

## 5. VS Code Extensions

When you open `D:\GachaVerse` in VS Code it will prompt you to install the recommended extensions from `.vscode/extensions.json`:

| Extension | Purpose |
|---|---|
| `esbenp.prettier-vscode` | Auto-formatting |
| `dbaeumer.vscode-eslint` | Linting |
| `dsznajder.es7-react-js-snippets` | React snippets (`rafce`, etc.) |
| `ms-ossdata.vscode-postgresql` | PostgreSQL explorer |
| `mikestead.dotenv` | `.env` syntax highlighting |
| `humao.rest-client` | Test API endpoints without leaving VS Code |

**Debug the backend:** press `F5` — VS Code picks up the "Debug Backend" config in `launch.json` automatically.

---

## 6. Node Version Upgrade

When you're ready to upgrade Node (recommended: use [nvm-windows](https://github.com/coreybutler/nvm-windows)):

```powershell
nvm install 22
nvm use 22
```

After upgrading you can use `npm create vite@latest` without the pinned `@5`.
