#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Parse HTML content and extract name data
function parseHtmlFile(htmlContent, year) {
  const results = [];
  
  // Extract table data using regex patterns
  const tablePattern = /<table[^>]*>.*?<\/table>/gs;
  const tables = htmlContent.match(tablePattern);
  
  if (!tables) {
    console.warn(`No tables found in ${year}.html`);
    return results;
  }
  
  tables.forEach((table, tableIndex) => {
    // Determine gender based on caption
    const captionMatch = table.match(/<caption[^>]*>([^<]+)<\/caption>/);
    const gender = captionMatch && captionMatch[1].includes('Pigenavne') ? 'female' : 'male';
    
    // Extract rows
    const rowPattern = /<tr[^>]*>.*?<\/tr>/gs;
    const rows = table.match(rowPattern);
    
    if (!rows) return;
    
    rows.forEach((row) => {
      // Skip header rows
      if (row.includes('<th>')) return;
      
      // Extract cells
      const cellPattern = /<td[^>]*>([^<]+)<\/td>/g;
      const cells = [];
      let match;
      
      while ((match = cellPattern.exec(row)) !== null) {
        cells.push(match[1].trim());
      }
      
      if (cells.length >= 4) {
        const rank = parseInt(cells[0]);
        const name = cells[1];
        const count = parseInt(cells[2]);
        const perThousand = parseInt(cells[3]);
        
        if (rank && name && count && !isNaN(rank) && !isNaN(count)) {
          results.push({
            year,
            gender,
            rank,
            name,
            count,
            perThousand
          });
        }
      }
    });
  });
  
  return results;
}

// Main function
function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dataDir = path.join(__dirname, '..', 'data');
  const outputFile = path.join(__dirname, '..', 'parsed-names.json');
  
  console.log('Parsing HTML files...');
  
  const allData = [];
  const years = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
  
  years.forEach(year => {
    const filePath = path.join(dataDir, `${year}.html`);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return;
    }
    
    try {
      const htmlContent = fs.readFileSync(filePath, 'utf8');
      const yearData = parseHtmlFile(htmlContent, year);
      allData.push(...yearData);
      console.log(`Parsed ${yearData.length} records from ${year}.html`);
    } catch (error) {
      console.error(`Error parsing ${year}.html:`, error.message);
    }
  });
  
  // Write JSON output
  try {
    fs.writeFileSync(outputFile, JSON.stringify(allData, null, 2));
    console.log(`\nSuccessfully parsed ${allData.length} total records`);
    console.log(`Output written to: ${outputFile}`);
    
    // Print summary statistics
    const yearsFound = [...new Set(allData.map(item => item.year))].sort();
    const genderStats = allData.reduce((acc, item) => {
      acc[item.gender] = (acc[item.gender] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nSummary:');
    console.log(`- Years: ${yearsFound.join(', ')}`);
    console.log(`- Total records: ${allData.length}`);
    console.log(`- Male records: ${genderStats.male || 0}`);
    console.log(`- Female records: ${genderStats.female || 0}`);
    
  } catch (error) {
    console.error('Error writing output file:', error.message);
    process.exit(1);
  }
}

// Run if called directly
main(); 