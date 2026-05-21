# PostgreSQL Setup

## 1. Install PostgreSQL

- **Windows:** Download the installer from https://www.postgresql.org/download/windows/
- **macOS:** `brew install postgresql@16`
- **Linux (Ubuntu/Debian):** `sudo apt install postgresql`

## 2. Start PostgreSQL

- **Windows:** Starts automatically as a service after install, or use pgAdmin.
- **macOS:** `brew services start postgresql@16`
- **Linux:** `sudo service postgresql start`

## 3. Open psql

```bash
# Windows: use the "SQL Shell (psql)" shortcut installed with PostgreSQL
# macOS / Linux:
psql -U postgres
```

## 4. Create the user and database

Run these commands inside `psql`:

```sql
CREATE USER gachauser WITH PASSWORD 'gachapass';
CREATE DATABASE gachaverse_db OWNER gachauser;
GRANT ALL PRIVILEGES ON DATABASE gachaverse_db TO gachauser;
\q
```

## 5. Verify the connection

The backend reads `DATABASE_URL` from `backend/.env`. The default value is:

```
postgresql://gachauser:gachapass@localhost:5432/gachaverse_db
```

Update `backend/.env` if your credentials differ.

## 6. Run the backend

```bash
cd backend
npm run dev
```

On first start, the server will create all tables and seed ZZZ and NIKKE data automatically.
