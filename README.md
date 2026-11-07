# Edwin Dol — Portfolio

My website-designer portfolio plus a **project brief form** for new clients.

| Page | What it is |
|---|---|
| `index.html` | Portfolio: hero, work, services, process, about, contact form |
| `start.html` | Client project brief — send this link to customers (`yoursite.com/start`) |
| `api/send.js` | Vercel serverless function that emails form submissions to me via Resend |

No build step, no dependencies — plain HTML/CSS/JS.

---

## Deploy (GitHub → Vercel → Resend)

### 1. Push to GitHub
1. Create a new empty repo on github.com called `portfolio` (no README).
2. In this folder:
   ```bash
   git init
   git add .
   git commit -m "Initial portfolio"
   git branch -M main
   git remote add origin https://github.com/<your-username>/portfolio.git
   git push -u origin main
   ```

### 2. Resend (email)
1. Sign up at https://resend.com with **edwin13.raptor@gmail.com**.
2. **API Keys → Create API key** (permission: *Sending access*). Copy it (starts with `re_`).
3. Until you own a domain, the sender `onboarding@resend.dev` works — but it can only send **to your own Resend account email**, which is exactly what we need.
4. Later, when you buy a domain: **Domains → Add domain**, add the DNS records it shows, then change `FROM_EMAIL` to e.g. `Edwin Dol <hello@yourdomain.com>`.

### 3. Vercel (hosting)
1. Go to https://vercel.com → sign in with GitHub → **Add New → Project** → import `portfolio`.
2. Framework preset: **Other**. Leave build settings empty.
3. **Environment Variables** — add:
   - `RESEND_API_KEY` = your `re_...` key
   - `TO_EMAIL` = `edwin13.raptor@gmail.com`
   - `FROM_EMAIL` = `Portfolio <onboarding@resend.dev>`
4. **Deploy.** Every `git push` redeploys automatically.
5. Optional: **Settings → Domains** to add your own domain.

> If you add env vars after the first deploy, hit **Redeploy** so they take effect.

---

## Client workflow
1. Send customers the link: `https://<your-site>/start.html`
2. Their answers arrive in your inbox, with a **copy-paste brief** at the bottom.
3. Paste that brief into Claude to spin up a new session for that client's site (e.g. `D:\Claude\clients\<client-name>`).

## Customise
- Projects: edit the `<article class="project">` blocks in `index.html` (swap gradients for `<img>` screenshots).
- Photo: replace `.photo-placeholder` with `<img src="me.jpg" alt="Edwin Dol">`.
- Socials: update the `#` links in the contact section.
- Colours: change `--accent` etc. at the top of `styles.css`.
- Budget currency: edit the options in `start.html` (currently €).
