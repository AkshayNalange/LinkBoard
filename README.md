# LinkBoard — Reference & Training Hub

A full-stack link-sharing board where admins post resources and users browse them.
Built for Vercel Free tier + Vercel KV (Redis).

---

## 🏗 Project Structure

```
linkboard/
├── index.html          ← Public reader page
├── admin.html          ← Admin panel (password-protected)
├── css/style.css       ← All styles + animations
├── js/main.js          ← Public page logic
├── js/admin.js         ← Admin panel logic
├── api/
│   ├── posts.js        ← GET all posts (public endpoint)
│   └── post.js         ← POST create / DELETE (admin only)
├── package.json
├── vercel.json
└── README.md
```

---

## 🚀 Step-by-Step Setup

### STEP 1 — Create a GitHub Repository

1. Go to https://github.com and log in (or sign up free)
2. Click **"New"** repository
3. Name it: `linkboard`
4. Set to **Public** (required for free Vercel import)
5. Click **"Create repository"**
6. On your computer, open a terminal in the `linkboard/` folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/linkboard.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

### STEP 2 — Deploy to Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Click **"Add New → Project"**
3. Find and select your `linkboard` repository
4. Click **"Import"**
5. Leave all settings as default (Framework: **Other**)
6. Click **"Deploy"** — wait ~60 seconds
7. ✅ Your site is now live at `https://linkboard-xxxx.vercel.app`

---

### STEP 3 — Create Vercel KV Database (Free Storage)

1. In Vercel dashboard, go to **Storage** tab (top nav)
2. Click **"Create Database"**
3. Choose **"KV"** (Upstash Redis)
4. Name it: `linkboard-kv`
5. Region: Choose closest to you
6. Plan: **Free** ✅
7. Click **"Create"**

Now connect it to your project:
1. Go to your `linkboard` project in Vercel
2. Click **"Storage"** tab inside the project
3. Click **"Connect Store"** → select `linkboard-kv`
4. Click **"Connect"**

This automatically adds these environment variables to your project:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`

---

### STEP 4 — Set Admin Password

1. In Vercel project dashboard, go to **Settings → Environment Variables**
2. Click **"Add New"**
3. Name: `ADMIN_PASSWORD`
4. Value: `YourSecretPassword123` (choose something strong!)
5. Environment: check **Production**, **Preview**, **Development**
6. Click **"Save"**

---

### STEP 5 — Redeploy

After setting env variables, trigger a fresh deploy:
1. Go to **Deployments** tab in Vercel
2. Click the 3-dot menu on the latest deployment
3. Click **"Redeploy"**
4. ✅ Done!

---

### STEP 6 — Test Your App

1. Visit: `https://your-app.vercel.app` — public page (should show empty state)
2. Visit: `https://your-app.vercel.app/admin.html` — admin panel
3. Enter your `ADMIN_PASSWORD` to log in
4. Create a test post and verify it appears on the public page

---

## 🔒 Security Notes

- The admin password is verified server-side via `x-admin-key` header
- Admin sessions are stored in `sessionStorage` (cleared on tab close)
- Never share your `ADMIN_PASSWORD`
- For production, consider adding rate limiting

---

## 📝 Adding More Categories

Categories are created automatically when you post. Just type any category name when creating a post.

---

## 🔧 Local Development

```bash
npm install -g vercel    # Install Vercel CLI
npm install              # Install dependencies
vercel dev               # Start local dev server with KV connected
```

You'll need to link your local project to Vercel first:
```bash
vercel link
vercel env pull .env.local
```

---

## 🆓 Free Tier Limits (Vercel + KV)

| Resource | Free Limit |
|----------|-----------|
| KV Storage | 256 MB |
| KV Requests | 500,000/month |
| Serverless Functions | 100 GB-hours/month |
| Bandwidth | 100 GB/month |

More than enough for a team reference board!
