-- Name Rater Database Schema
-- Stores Danish baby names statistics from 2015-2024

-- Main table for name statistics
CREATE TABLE IF NOT EXISTS names (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    rank INTEGER NOT NULL,
    name TEXT NOT NULL,
    count INTEGER NOT NULL,
    per_thousand INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_names_year ON names(year);
CREATE INDEX IF NOT EXISTS idx_names_gender ON names(gender);
CREATE INDEX IF NOT EXISTS idx_names_name ON names(name);
CREATE INDEX IF NOT EXISTS idx_names_year_gender ON names(year, gender);
CREATE INDEX IF NOT EXISTS idx_names_rank ON names(rank);

-- Table for metadata about the data import
CREATE TABLE IF NOT EXISTS import_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_records INTEGER NOT NULL,
    years_covered TEXT NOT NULL,
    source_files TEXT NOT NULL,
    notes TEXT
);

-- Views for common queries
CREATE VIEW IF NOT EXISTS v_top_names_by_year AS
SELECT 
    year,
    gender,
    name,
    count,
    rank,
    per_thousand
FROM names 
WHERE rank <= 10
ORDER BY year, gender, rank;

CREATE VIEW IF NOT EXISTS v_name_trends AS
SELECT 
    name,
    gender,
    COUNT(DISTINCT year) as years_appeared,
    MIN(year) as first_year,
    MAX(year) as last_year,
    AVG(count) as avg_count,
    MAX(count) as max_count,
    MIN(count) as min_count,
    AVG(rank) as avg_rank,
    MIN(rank) as best_rank
FROM names 
GROUP BY name, gender
ORDER BY avg_count DESC;

CREATE VIEW IF NOT EXISTS v_year_summary AS
SELECT 
    year,
    gender,
    COUNT(*) as total_names,
    SUM(count) as total_babies,
    AVG(count) as avg_count_per_name,
    MAX(count) as max_count,
    MIN(count) as min_count
FROM names 
GROUP BY year, gender
ORDER BY year, gender;

-- Sample queries for analysis
-- Uncomment and run these after importing data:

-- 1. Top 10 most popular names across all years
-- SELECT name, gender, SUM(count) as total_count, COUNT(DISTINCT year) as years_appeared
-- FROM names 
-- GROUP BY name, gender 
-- ORDER BY total_count DESC 
-- LIMIT 10;

-- 2. Names that appeared in all years (2015-2024)
-- SELECT name, gender, COUNT(DISTINCT year) as years_appeared
-- FROM names 
-- GROUP BY name, gender 
-- HAVING years_appeared = 10
-- ORDER BY name, gender;

-- 3. Year with most total births
-- SELECT year, SUM(count) as total_births
-- FROM names 
-- GROUP BY year 
-- ORDER BY total_births DESC;

-- 4. Gender ratio by year
-- SELECT 
--     year,
--     SUM(CASE WHEN gender = 'male' THEN count ELSE 0 END) as male_births,
--     SUM(CASE WHEN gender = 'female' THEN count ELSE 0 END) as female_births,
--     ROUND(
--         CAST(SUM(CASE WHEN gender = 'male' THEN count ELSE 0 END) AS FLOAT) / 
--         CAST(SUM(count) AS FLOAT) * 100, 2
--     ) as male_percentage
-- FROM names 
-- GROUP BY year 
-- ORDER BY year; 