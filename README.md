# MAD Studio

The MAD candle business app. It covers costing and quotes, invoices and quotations on the letterhead, the production batch log, and the brand reference. It runs in the browser and installs like an app on phone, iPad mini and laptop. Your data syncs between them through a free Supabase database.

## What's inside

| File / folder | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | The app |
| `manifest.webmanifest`, `sw.js`, `icons/` | Make it installable and work offline |
| `assets/` | Logo files, letterhead, icon pack (fixed brand files) |
| `supabase-setup.sql` | Creates the database table (run once) |

---

## Step 1 · Put the app on GitHub Pages (about 10 minutes)

1. Sign in at **github.com**. Create a free account first if you don't have one.
2. Click **+** (top right) → **New repository**.
   - Repository name: `mad-studio`
   - Choose **Public**. GitHub Pages is free for public repositories. Your business data is NOT stored here; it lives in Supabase behind your login.
   - Click **Create repository**.
3. On the new repository page, click **uploading an existing file**.
4. Unzip `mad-studio.zip` on your laptop. Open the `mad-studio` folder, select **everything inside it** (files and the `assets` and `icons` folders), and drag it into the upload box.
5. Scroll down and click **Commit changes**.
6. Go to **Settings** → **Pages** (left menu).
   - Under **Build and deployment** → **Source**, choose **Deploy from a branch**.
   - Branch: **main**, folder: **/ (root)** → **Save**.
7. Wait 1–2 minutes, then refresh. The page shows your site address, for example:
   `https://YOUR-USERNAME.github.io/mad-studio/`
8. Open that address. You should see the MAD calculator.

## Step 2 · Set up sync with Supabase (about 10 minutes)

1. Go to **supabase.com** → **Start your project** and sign in (GitHub sign-in works).
2. **New project** → name it `mad-studio` → set a database password (save it somewhere) → region **Mumbai** (closest to Bengaluru) → **Create**.
3. When it's ready, open **SQL Editor** → **New query**. Paste everything from `supabase-setup.sql` and click **Run**. It should say "Success".
4. Open **Authentication** → **URL Configuration**.
   - Set **Site URL** to your GitHub Pages address from Step 1. Confirmation emails then link back to your app.
5. Find your two connection values: click **Connect** at the top of the project, or go to **Settings** → **API Keys**.
   - **Project URL**: looks like `https://abcdefgh.supabase.co`
   - **Publishable key**: starts with `sb_publishable_`
   - Both are safe to use in the app. Never use the **secret** key.
6. In the MAD app, go to **Settings** → **Sync across devices**. Paste the Project URL and Publishable key → **Connect**.
7. Click **Create account (first time only)** with your email and a password. Open the confirmation email, click the link, come back, and **Sign in**.
8. Optional but recommended: in Supabase, open **Authentication** → **Sign In / Providers** and turn off **Allow new users to sign up**. That way nobody else can create an account in your project.

## Step 3 · Install on each device

| Device | How |
|---|---|
| **iPhone / iPad mini** | Open the address in **Safari** → **Share** button → **Add to Home Screen** → **Add** |
| **Android phone** | Open in **Chrome** → **⋮** menu → **Add to Home screen** / **Install app** |
| **Laptop (Chrome or Edge)** | Open the address → click the **install** icon at the right end of the address bar |

On each device, open the app once, go to **Settings** → **Sync across devices**, paste the same Project URL and Publishable key, and sign in with the same email. Everything then stays in step.

## How sync works

- Every change saves on the device straight away, so the app works offline.
- When you're signed in, changes upload to Supabase within a second, and the app pulls the latest whenever you open it.
- If the same record was edited on two devices, the most recent edit wins.
- **Settings → Download backup** saves everything to a file. Do this once a month as a safety copy.

## Updating the app later

1. In GitHub, open the repository → **Add file** → **Upload files** → drag in the changed files → **Commit changes**.
2. Open `sw.js` and change `const VERSION = 'mad-v1';` to `'mad-v2'` (then `v3`, and so on). Installed devices then fetch the new version.
3. On each device, close and reopen the app (twice if the old version still shows).

## Printing invoices and quotations

Open a document → **Print / PDF**. In the print dialog, set paper **A4**, margins **None**, turn on **Background graphics**, and choose **Save as PDF** to send it on WhatsApp or email. On iPhone/iPad: **Share → Print**, then pinch outwards on the preview to get a PDF to share.

## Help

- **The app shows "Local only"**: sync isn't connected on this device yet. See Step 2, point 6.
- **"Sync error"**: check internet. Make sure the SQL from Step 2 ran, and that you're signed in.
- **Forgot password**: Supabase → **Authentication** → **Users** → your email → **Send password recovery**.
