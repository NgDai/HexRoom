# Auth – Google login (Supabase)

## Setup

1. **Env:** Create `.env` from `.env.example` and set:
   - `VITE_SUPABASE_URL` – Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` – Supabase anon (public) key

2. **Supabase Dashboard:** Enable Google provider:
   - Authentication → Providers → Google → Enable
   - Add Google OAuth Client ID and Secret (from Google Cloud Console)

3. **Google Cloud Console:**
   - Create OAuth 2.0 Client (Web application)
   - Add redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - For local dev you can use the same (Supabase accepts localhost via Site URL in Supabase → Auth → URL Configuration)

4. **Supabase Auth → URL Configuration:**
   - Site URL: your app origin (e.g. `http://localhost:5173`)
   - Redirect URLs: add `http://localhost:5173/**` and your production URL

After that, “Đăng nhập với Google” on `/login` will redirect to Google and back with a session.
