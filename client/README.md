# AutoCustomizer React Client

This is a Create React App style client for the AutoCustomizer project. It includes Login and Signup pages that mirror the existing EJS templates and talk to the existing Express backend.

## Prerequisites

- Node.js 18+
- Backend running at http://localhost:3000 (that's what `server.js` uses)

## Install & Run (Windows PowerShell)

```powershell
cd "$PSScriptRoot\client"
npm install
npm start
```

This starts the React dev server on port 5173 and proxies API calls (e.g. `/signup`, `/login`) to `http://localhost:3000`.

## Routes

- `/login`: HTML form posts directly to `/login` on the backend so you still get role-based redirects (manager/customer/seller/service-provider)
- `/signup`: Uses `fetch` to POST JSON to `/signup`. On success, navigates to `/login`.
- `/forgot-password`: Request a password reset link. Posts email to `/forgot-password`.
- `/reset-password/:token`: Enter a new password after following the link from email/console.

## Styling

The client uses the same CSS classes as your EJS pages. The `style.css` is included via `public/` so components render consistently.

## Env/Config

If you need a different backend base URL, set the `proxy` value in `client/package.json`.

### Password Reset Setup

The backend implements the following endpoints mounted at the root (`authRoutes`):

- `POST /forgot-password` – Accepts `{ email }`. Always returns a generic success message. Generates a token valid for 15 minutes.
- `GET /reset-password/:token` – Validates token, returns `{ valid: true|false }`.
- `POST /reset-password/:token` – Accepts `{ password }` and updates the user password if token is valid.

To enable email sending, set these environment variables before starting the server:

```
SMTP_HOST=your.smtp.host
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-pass
SMTP_FROM="AutoCustomizer <no-reply@yourdomain.com>"
```

If SMTP is not configured, the reset link is logged to the server console. Example:

```
Password reset link (no SMTP configured): http://localhost:3000/reset-password/abcdef123...
```

Open that link in the browser (or navigate via the React app) to set a new password. After successful reset you are redirected to login.
