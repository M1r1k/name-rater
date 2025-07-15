# Name Rater - Danish Baby Names Analysis

This project parses Danish baby names data from HTML files and stores it in SQLite for analysis.

## Features

- **HTML Parser**: Extracts name data from structured HTML files
- **SQLite Database**: Stores parsed data with proper indexing
- **Analysis Views**: Pre-built views for common queries
- **CLI Tools**: Command-line scripts for data processing

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
- `sql/schema.sql` - Database schema
- `parsed-names.json` - Intermediate JSON data
- `names.db` - SQLite database

## Development

The project also includes a React web interface (not used in CLI mode):
- `src/` - React components
- `vite.config.ts` - Build configuration

## Data Source

Danish baby names statistics from 2015-2024, structured as HTML tables with rankings and counts.
