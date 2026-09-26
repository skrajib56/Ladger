# Ledger — Personal Expense Tracker

A full-stack expense tracker with user authentication, category-based
organization, and interactive charts.

**Stack:** Node.js + Express (API) · SQLite via `better-sqlite3` (storage) ·
vanilla HTML/CSS/JS + Chart.js (frontend). No build step required.

## Features

- **Auth:** register/login with hashed passwords (bcrypt) and JWT-based sessions
- **Categorization:** 8 default categories seeded per user, plus custom categories via the API
- **Expenses:** add, edit, delete, and filter by category
- **Visualization:** pie chart of spending by category, bar chart of spending by month
- **Summary card:** running total and entry count for the current month

## Project structure

```
expense-tracker/
├── server.js              # Express app entry point
├── db.js                  # SQLite connection + schema + default category seeding
├── middleware/auth.js      # JWT verification middleware
├── routes/
│   ├── auth.js             # /api/auth/register, /api/auth/login
│   ├── categories.js       # /api/categories (list/create/delete)
│   └── expenses.js         # /api/expenses CRUD + /summary/by-category, /summary/by-month
└── public/
    ├── index.html          # Login / register screen
    ├── dashboard.html       # Main app screen
    ├── css/style.css
    └── js/
        ├── auth.js
        └── dashboard.js
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the env file and set a real secret:
   ```bash
   cp .env.example .env
   # then edit .env and set JWT_SECRET to a long random string
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open **http://localhost:3000** in your browser. Create an account, then
   you're on the dashboard.

The SQLite database file (`expense.db`) is created automatically on first run —
no separate database server to install.

## API reference

| Method | Endpoint                              | Auth | Description                        |
|--------|----------------------------------------|------|-------------------------------------|
| POST   | `/api/auth/register`                   | No   | Create account, returns JWT         |
| POST   | `/api/auth/login`                      | No   | Log in, returns JWT                 |
| GET    | `/api/categories`                      | Yes  | List this user's categories         |
| POST   | `/api/categories`                      | Yes  | Create a custom category            |
| DELETE | `/api/categories/:id`                  | Yes  | Delete a category                   |
| GET    | `/api/expenses`                        | Yes  | List expenses (`?category=&from=&to=`) |
| POST   | `/api/expenses`                        | Yes  | Create an expense                   |
| PUT    | `/api/expenses/:id`                    | Yes  | Update an expense                   |
| DELETE | `/api/expenses/:id`                    | Yes  | Delete an expense                   |
| GET    | `/api/expenses/summary/by-category`    | Yes  | Totals per category (pie chart)     |
| GET    | `/api/expenses/summary/by-month`       | Yes  | Totals per month (bar chart)        |

Authenticated requests need `Authorization: Bearer <token>`.

## Switching to MySQL instead of SQLite

The app was built on SQLite (via `better-sqlite3`) so it runs with zero
external setup. If you'd rather use MySQL:

1. Replace `better-sqlite3` with `mysql2` in `package.json`.
2. Rewrite `db.js` to open a MySQL connection pool and run the same `CREATE
   TABLE` statements (MySQL syntax is nearly identical — swap
   `AUTOINCREMENT` for `AUTO_INCREMENT` and `datetime('now')` for `NOW()`).
3. The route files use plain SQL strings via `db.prepare(...).run/get/all(...)`;
   with `mysql2`'s promise pool you'd change these to `await pool.execute(sql,
   params)` calls. The query logic and endpoints themselves don't need to change.

## Security notes

- Passwords are hashed with bcrypt (10 rounds); never stored in plain text.
- JWTs expire after 7 days.
- Set a strong, random `JWT_SECRET` in production — never use the example value.
- Add HTTPS (e.g. behind a reverse proxy) before deploying publicly.
