# Edwin Dol — Portfolio

Dark, minimalist portfolio with a **built-in admin panel** and a **client project brief form**.

| File | What it is |
|---|---|
| `index.html`, `work.html`, `services.html`, `about.html`, `contact.html` | The site pages. Header, footer and all text/images are filled in by `site.js` from your saved content (or `content.json` as the default). |
| `motion.js` | Animations: word-by-word headings, custom cursor, magnetic buttons, parallax, count-ups, scroll progress. Turned off automatically for people who prefer reduced motion. |
| `api/rates.js` | Detects the visitor's country and returns live exchange rates, so prices show in their currency. |
| `start.html` | Client project brief — send this link to customers (`yoursite.com/start`). |
| `admin.js` / `admin.css` | Admin panel. Only loads when you open it. |
| `content.json` | Default content (used until you save something in the admin panel). |
| `api/send.js` | Emails contact messages + project briefs to you via Resend. |
| `api/auth.js` | Admin login/logout (password → secure cookie). |
| `api/content.js` | Loads/saves site content in Vercel Blob (keeps the last 20 versions). |
| `api/upload.js` | Image uploads to Vercel Blob. |

No build step — plain HTML/CSS/JS + Vercel functions.

---

## Admin panel

On the live site press **Ctrl + Shift + A** (Mac: **Cmd + Shift + A**) — or go to `yoursite.com/#admin`.

- Log in with your `ADMIN_PASSWORD`.
- Tabs: **General**, **Home**, **Work**, **Services** (pricing, packages, FAQ), **About**, **Contact**. The panel opens on the tab for the page you're on and stays open while you move between pages.
- Changes preview **live** on the page behind the panel. Click **Save changes** (or Ctrl+S) to publish.
- In headings, wrap words in `*stars*` to make them grey, e.g. `with *intention.*`
- **Backup** downloads all your content as `content.json`.
- **Esc** closes the panel.

> Some browsers use Ctrl+Shift+A for their own shortcut (e.g. tab search). If the panel doesn't open, click on the page first, or use `/#admin`.

---

## Deploy (GitHub → Vercel)

The repo is on GitHub: `edwin13raptor-droid/portfolio`. Every `git push` redeploys.

1. **Vercel** → sign in with GitHub → **Add New → Project** → import `portfolio` → Framework: **Other** → Deploy.
2. **Storage (for the admin panel):** in the project, **Storage → Create → Blob** → connect it to the project. This adds `BLOB_READ_WRITE_TOKEN` automatically.
3. **Settings → Environment Variables:**
   - `ADMIN_PASSWORD` — a long password only you know
   - `RESEND_API_KEY` — from resend.com → API Keys
   - `TO_EMAIL` — `edwin13.raptor@gmail.com`
   - `FROM_EMAIL` — `Portfolio <onboarding@resend.dev>` (until you verify your own domain in Resend)
4. **Deployments → ⋯ → Redeploy** so the new variables take effect.
5. Later: **Settings → Domains** to add your own domain.

---

## Client workflow
1. Send customers `https://<your-site>/start`.
2. Their answers arrive in your inbox, with a **copy-paste brief** at the bottom.
3. Paste that brief into Claude to start a new session for that client's site in its own folder, e.g. `D:\Claude\websites\<client-name>`.

---

## Pricing

Set in the admin panel → **Services** (amounts in your own currency, default **ZAR**):

| Rule | Default |
|---|---|
| Homepage | R1,000 |
| Each extra page | R1,500 |
| More than 6 pages | from R10,000 |

Visitors see prices converted to their own currency (detected from their region on Vercel, or their browser language), rounded to friendly numbers. They can switch currency with the picker on the Services page. There's also a page-count price calculator.