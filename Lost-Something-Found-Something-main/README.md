# LostFound

A campus lost & found platform. Students report lost or found items, browse listings, and submit claims; admins review claims and manage listings.

## Stack
- **Backend:** Flask, Flask-SQLAlchemy, Flask-Login
- **Database:** PostgreSQL
- **Frontend:** Server-rendered Jinja2 templates + vanilla JS (fetch-based API calls)

## Project structure
```
backend/       Flask app, models, config
database/      SQL schema (also auto-created via SQLAlchemy on first run)
frontend/      Templates, CSS, JS
docker-compose.yml
```

## Run locally (without Docker)
1. Create a PostgreSQL database named `lostfound`.
2. `cd backend && cp .env.example .env` and fill in your DB credentials.
3. `python -m venv venv && source venv/bin/activate` (Windows: `venv\Scripts\activate`)
4. `pip install -r requirements.txt`
5. `python app.py` — runs on http://localhost:5000

## Run with Docker
```
cp backend/.env.example backend/.env
docker compose up --build
```
App: http://localhost:5000 · Postgres: localhost:5432

## Making a user an admin
There's no admin signup UI by design. After registering, set the flag directly:
```sql
UPDATE users SET is_admin = TRUE WHERE email = 'you@example.com';
```

## API overview
| Method | Route | Description |
|---|---|---|
| POST | /api/register | Create account |
| POST | /api/login | Log in |
| POST | /api/logout | Log out |
| GET | /api/items | List items (filter by `type`, `status`, `category`, `q`) |
| POST | /api/items | Create item (auth required, multipart for image) |
| PUT/DELETE | /api/items/`<id>` | Update/delete own item |
| POST | /api/items/`<id>`/claims | Submit a claim |
| GET | /api/dashboard | Current user's items + claims |
| GET | /api/admin/items, /api/admin/claims | Admin only |
| POST | /api/admin/claims/`<id>`/approve\|reject | Admin only |

## Notes
- `.env` is git-ignored — never commit real secrets. Use `.env.example` as the template.
- Uploaded images are saved to `frontend/static/uploads/`.
