# Tests

Basic pytest setup for the LostFound backend.

## Setup
```
pip install pytest
```

## Suggested first tests (`tests/test_api.py`)
- `POST /api/register` then `POST /api/login` succeeds with correct credentials
- `POST /api/items` fails with 401 when not logged in
- `POST /api/items` succeeds when logged in, item appears in `GET /api/items`
- `POST /api/items/<id>/claims` fails when claiming your own item
- Admin-only routes return 403 for non-admin users

Point tests at a separate test database (e.g. `lostfound_test`) rather than your dev database.
