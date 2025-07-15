# Name Rater - Danish Baby Names Analysis

This project parses Danish baby names data from HTML files and stores it in SQLite for analysis. It also includes a React web interface for rating and comparing baby names.

## Features

- **HTML Parser**: Extracts name data from structured HTML files
- **SQLite Database**: Stores parsed data with proper indexing
- **Analysis Views**: Pre-built views for common queries
- **CLI Tools**: Command-line scripts for data processing
- **React Web Interface**: Interactive name rating and comparison tool
- **Supabase Integration**: Cloud database for name ratings and comments
- **Migration System**: Database schema versioning and updates

## Data Structure

Each HTML file contains two tables:
- **Pigenavne** (Girl names) - Female names with rankings
- **Drengenavne** (Boy names) - Male names with rankings

Each record includes:
- Year (2015-2024)
- Gender (male/female)
- Rank (1-50)
- Name
- Count (number of babies)
- Per 1000 (rate per 1000 births)

## Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Parse HTML files to JSON**:
   ```bash
   pnpm run parse
   ```
   This creates `parsed-names.json` with all extracted data.

3. **Import data to SQLite**:
   ```bash
   pnpm run import
   ```
   This creates `names.db` with the complete database.

4. **Or run both steps at once**:
   ```bash
   pnpm run setup-db
   ```

5. **Run database migrations** (if using Supabase):
   ```bash
   pnpm run migrate
   ```

## Database Schema

### Main Table: `names`
- `id` - Primary key
- `year` - Year (2015-2024)
- `gender` - 'male' or 'female'
- `rank` - Ranking (1-50)
- `name` - Baby name
- `count` - Number of babies
- `per_thousand` - Rate per 1000 births
- `created_at` - Import timestamp

### Metadata Table: `import_metadata`
- Tracks import history and data coverage

### Views
- `v_top_names_by_year` - Top 10 names by year
- `v_name_trends` - Name popularity trends
- `v_year_summary` - Yearly statistics

## Sample Queries

### Top names across all years:
```sql
SELECT name, gender, SUM(count) as total_count
FROM names 
GROUP BY name, gender 
ORDER BY total_count DESC 
LIMIT 10;
```

### Names appearing in all years:
```sql
SELECT name, gender, COUNT(DISTINCT year) as years_appeared
FROM names 
GROUP BY name, gender 
HAVING years_appeared = 10;
```

### Gender ratio by year:
```sql
SELECT 
    year,
    SUM(CASE WHEN gender = 'male' THEN count ELSE 0 END) as male_births,
    SUM(CASE WHEN gender = 'female' THEN count ELSE 0 END) as female_births
FROM names 
GROUP BY year 
ORDER BY year;
```

## Files

- `data/` - HTML files (2015.html to 2024.html)
- `scripts/parse-names.js` - HTML parser
- `scripts/import-to-sqlite.js` - Database importer
- `scripts/run-migrations.js` - Database migration runner
- `sql/schema.sql` - Database schema
- `migrations/` - Database migration scripts
- `parsed-names.json` - Intermediate JSON data
- `names.db` - SQLite database

## Web Interface Features

The React web interface includes:
- **Name Rating**: Rate names on multiple dimensions (personal feeling, locality, internationality, etc.)
- **Parent Comparison**: Compare ratings between parents using scatter plots
- **Comments**: Add shared comments for both parents about each name
- **Statistics**: View Danish baby name trends and popularity data
- **Suggestions**: Get popular name suggestions from the statistics data
- **Export/Import**: Save and load rating data

## Development

The project includes both CLI tools and a React web interface:
- `src/` - React components and web interface
- `vite.config.ts` - Build configuration
- `supabase-schema.sql` - Supabase database schema

## Data Source

Danish baby names statistics from 2015-2024, structured as HTML tables with rankings and counts.
