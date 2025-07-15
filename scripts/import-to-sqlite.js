#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'sqlite3';
const { Database } = pkg;

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'names.db');
const JSON_DATA_PATH = path.join(__dirname, '..', 'parsed-names.json');
const SCHEMA_PATH = path.join(__dirname, '..', 'sql', 'schema.sql');

function createDatabase() {
  return new Promise((resolve, reject) => {
    const db = new Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
      resolve(db);
    });
  });
}

function runSchema(db) {
  return new Promise((resolve, reject) => {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    
    db.exec(schema, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('Schema created successfully');
      resolve();
    });
  });
}

function importData(db, data) {
  return new Promise((resolve, reject) => {
    // Clear existing data
    db.run('DELETE FROM names', (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log('Cleared existing data');
      
      // Prepare insert statement
      const stmt = db.prepare(`
        INSERT INTO names (year, gender, rank, name, count, per_thousand)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      let inserted = 0;
      const total = data.length;
      
      data.forEach((item, index) => {
        stmt.run([
          item.year,
          item.gender,
          item.rank,
          item.name,
          item.count,
          item.perThousand
        ], (err) => {
          if (err) {
            console.error('Error inserting record:', err);
          } else {
            inserted++;
          }
          
          // Show progress
          if ((index + 1) % 100 === 0 || index + 1 === total) {
            console.log(`Imported ${inserted}/${total} records`);
          }
          
          // Finalize when done
          if (index + 1 === total) {
            stmt.finalize((err) => {
              if (err) {
                reject(err);
                return;
              }
              console.log(`Successfully imported ${inserted} records`);
              resolve(inserted);
            });
          }
        });
      });
    });
  });
}

function addMetadata(db, totalRecords, data) {
  return new Promise((resolve, reject) => {
    const years = [...new Set(data.map(item => item.year))].sort();
    const sourceFiles = years.map(year => `${year}.html`).join(', ');
    
    db.run(`
      INSERT INTO import_metadata (total_records, years_covered, source_files, notes)
      VALUES (?, ?, ?, ?)
    `, [
      totalRecords,
      years.join(', '),
      sourceFiles,
      'Imported from HTML files via CLI parser'
    ], (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('Metadata added successfully');
      resolve();
    });
  });
}

function runSampleQueries(db) {
  return new Promise((resolve, reject) => {
    console.log('\n=== Sample Analysis Queries ===\n');
    
    const queries = [
      {
        name: 'Total records by gender',
        sql: 'SELECT gender, COUNT(*) as count FROM names GROUP BY gender'
      },
      {
        name: 'Records by year',
        sql: 'SELECT year, COUNT(*) as count FROM names GROUP BY year ORDER BY year'
      },
      {
        name: 'Top 5 names by total count',
        sql: `
          SELECT name, gender, SUM(count) as total_count 
          FROM names 
          GROUP BY name, gender 
          ORDER BY total_count DESC 
          LIMIT 5
        `
      },
      {
        name: 'Year with most births',
        sql: 'SELECT year, SUM(count) as total_births FROM names GROUP BY year ORDER BY total_births DESC LIMIT 1'
      }
    ];
    
    let completed = 0;
    
    queries.forEach((query, index) => {
      db.all(query.sql, (err, rows) => {
        if (err) {
          console.error(`Error in query "${query.name}":`, err.message);
        } else {
          console.log(`${query.name}:`);
          console.table(rows);
        }
        
        completed++;
        if (completed === queries.length) {
          resolve();
        }
      });
    });
  });
}

async function main() {
  try {
    // Check if JSON data exists
    if (!fs.existsSync(JSON_DATA_PATH)) {
      console.error('JSON data file not found. Please run the parser first:');
      console.error('node scripts/parse-names.js');
      process.exit(1);
    }
    
    // Load JSON data
    console.log('Loading JSON data...');
    const data = JSON.parse(fs.readFileSync(JSON_DATA_PATH, 'utf8'));
    console.log(`Loaded ${data.length} records from JSON`);
    
    // Create database and import data
    const db = await createDatabase();
    await runSchema(db);
    const insertedCount = await importData(db, data);
    await addMetadata(db, insertedCount, data);
    await runSampleQueries(db);
    
    // Close database
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('\nDatabase import completed successfully!');
        console.log(`Database file: ${DB_PATH}`);
      }
    });
    
  } catch (error) {
    console.error('Error during import:', error.message);
    process.exit(1);
  }
}

// Run if called directly
main(); 