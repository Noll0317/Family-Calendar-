# Family Command Center

A phone-friendly shared weekly calendar for Chris, Sam, Taylor, and Aiden.

## People colors
- Chris: red
- Sam: orange
- Taylor: purple
- Aiden: green

## Run locally
```bash
npm install
npm run dev
```

## Deploy to Netlify
1. Create a GitHub repo and upload these files.
2. In Netlify, choose Add new site -> Import from Git.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Supabase setup
1. Create a free Supabase project.
2. Go to SQL Editor.
3. Paste and run `supabase-schema.sql`.
4. Copy your Project URL and anon public key into Netlify environment variables.
5. Redeploy Netlify.

Without Supabase, the app runs in demo mode using local browser storage only.
