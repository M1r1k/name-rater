# Supabase Setup Instructions

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/login and create a new project
3. Wait for the project to be ready

## 2. Set up the Database Schema

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql` into the editor
4. Run the SQL to create the tables and policies

## 3. Get Your Project Credentials

1. In your Supabase dashboard, go to Settings → API
2. Copy the following values:
   - Project URL
   - Anon/public key

## 4. Set up Environment Variables

Create a `.env` file in your project root with:

```
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## 5. Deploy to Netlify

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Add the environment variables in Netlify's dashboard:
   - Go to Site settings → Environment variables
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

## 6. Test the App

The app should now work with shared data across all users!

## Notes

- The app uses anonymous access (no authentication required)
- All users can read/write to the same database
- Data is shared globally across all users
- The schema is simple and optimized for this use case 