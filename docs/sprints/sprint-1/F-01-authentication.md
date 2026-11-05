# F-01 Authentication

| | |
|---|---|
| Requirements | FR-01, FR-02, FR-03, BR-15, NFR-01, NFR-03 |
| Depends on | F-08 |
| Version | 1.0, 2026-11-05 |

## 1. Behaviour

A seeded user signs in with email and password, stays signed in for up to 8 hours, can see who they are,
and signs out. After sign-out, the old session cannot be used again, even by someone who copied the
cookie. A failed sign-in never says whether the email exists.

**Workflow.**
1. The user submits email and password.
2. The API lowercases and trims the email, looks up an active user, and compares the password with the
   bcrypt hash.
3. On success the API creates a session: a random 32-byte token, of which only the SHA-256 hash is stored,
   with an expiry 8 hours ahead. The token is sent in the `cf_session` cookie (`HttpOnly`, `SameSite=Lax`,
   `Path=/`, `Secure` when `NODE_ENV=production`, `Max-Age` 8 hours).
4. Every protected request reads the cookie, hashes it, finds a session that has not expired, and loads its
   user. If the session is expired it is deleted and the request gets 401. If the user is no longer active
   the request gets 401.
5. Logout deletes the session row and clears the cookie.

**Rules and boundary cases.**
- A wrong password, an unknown email and an inactive account all give the same 401 and the same message.
- A missing or empty email or password gives 400, before any database lookup.
- Login rate limiting is out of scope for Sprint 1 (recorded in known limitations).
- The password hash never appears in any response or log.

## 2. API

**`POST /api/auth/login`** (public)

```json
{ "email": "camille@cafe.test", "password": "..." }
```

| Result | Status | Body |
|---|---|---|
| Success | 200 | `{"data":{"id":1,"name":"Camille Martin","email":"camille@cafe.test","role":"SURVEY_OWNER"}}`, with `Set-Cookie: cf_session=...` |
| Missing field | 400 | `{"error":{"code":"VALIDATION_ERROR","message":"Email and password are required.","fields":{"email":"Required"}}}` |
| Wrong credentials | 401 | `{"error":{"code":"INVALID_CREDENTIALS","message":"Email or password is incorrect."}}` |

**`GET /api/auth/me`** (signed in): `200 {"data":{"id","name","email","role"}}`, or `401 UNAUTHENTICATED`.

**`POST /api/auth/logout`** (signed in): `204` with the cookie cleared, or `401 UNAUTHENTICATED`.

## 3. UI

- **Login screen.** Labelled email and password fields, a "Sign in" button that is disabled and shows
  "Signing in…" while the request runs, and the generic error message under the form on failure. The
  entered email stays in the field after a failure.
- **After sign-in.** A Survey Owner lands on "My surveys" and a Respondent on "Open surveys".
- **Header.** The user's name and role, and a "Sign out" button.
- **Page load.** The application calls `GET /api/auth/me` to restore the session. While it waits it shows a
  loading state. Any 401 from the API sends the user back to the login screen.

## 4. Data

Migration `init_auth`:
- `User`: id, name, email (unique), passwordHash, role (enum `SURVEY_OWNER`, `RESPONDENT`), isActive
  (default true), createdAt.
- `Session`: id, userId (foreign key, deleted with the user), tokenHash (unique), expiresAt, createdAt;
  index on userId.

## 5. Acceptance criteria

| ID | Criterion |
|---|---|
| AC-F01-01 | With a correct email and password, login returns 200, sets an `HttpOnly` `cf_session` cookie, and returns the user's id, name, email and role. |
| AC-F01-02 | A wrong password and an unknown email both return 401 with the identical code and message, and no cookie. |
| AC-F01-03 | `GET /api/auth/me` with a valid session returns the user's identity and role, and the body contains no password hash. |
| AC-F01-04 | After logout, a request made with the old cookie value returns 401. |
| AC-F01-05 | Every protected route (all routes except login, health and ready), called without a session, returns 401 `UNAUTHENTICATED` and no survey or response data. |
| AC-F01-06 | Every stored password is a bcrypt hash (starts with `$2`, cost at least 10) and no stored value equals the plaintext password. |

## 6. Tests

| Test | AC | Level | Precondition or input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-F01-01 | AC-F01-01 | API | Seeded active owner | Login with the right password | 200, identity in body, `Set-Cookie` with `HttpOnly` and `cf_session` |
| TEST-F01-02 | AC-F01-02 | API | Seeded user; an email that does not exist | Login with a wrong password, then with the unknown email | Both 401 `INVALID_CREDENTIALS`, same message, no `Set-Cookie` |
| TEST-F01-03 | AC-F01-03 | API | Signed-in respondent | `GET /api/auth/me` | 200 with id, name, email, role; no `passwordHash` key anywhere in the body |
| TEST-F01-04 | AC-F01-04 | API | Signed-in user, cookie value saved | Logout, then `GET /api/auth/me` with the saved cookie | Logout 204; the later call 401 |
| TEST-F01-05 | AC-F01-05 | API | No cookie | Call each protected route in the API overview | Every call 401 `UNAUTHENTICATED`; no `title`, `answers` or `questions` key in any body |
| TEST-F01-06 | AC-F01-06 | Integration (DB) | Seeded database | Read every `passwordHash` | Each starts with `$2`, has a cost of 10 or more, and none equals `SEED_PASSWORD` |
| TEST-F01-07 | AC-F01-02 | API (boundary) | none | Login with an empty body, then with an empty password | 400 `VALIDATION_ERROR` |
| UI-01 | AC-F01-02 | UI component | API mocked to answer 401 | Submit the login form | Generic message shown, email kept, button enabled again |

## 7. Revision history

| Version | Date | Change | Reason |
|---|---|---|---|
| 1.0 | 2026-11-05 | First version | Written before implementation |
