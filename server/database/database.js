const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database file path
const dbPath = path.join(dataDir, 'receipts.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

// Initialize database tables
function initDatabase() {
  db.serialize(() => {
    // Create ledger table
    db.run(`
      CREATE TABLE IF NOT EXISTS ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email_id TEXT,
        email_subject TEXT,
        email_date TEXT,
        merchant_name TEXT,
        amount DECIMAL(10,2),
        date TEXT,
        category TEXT,
        description TEXT,
        receipt_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating ledger table:', err.message);
      } else {
        console.log('Ledger table created or already exists');
      }
    });

    // Create email_processing_log table
    db.run(`
      CREATE TABLE IF NOT EXISTS email_processing_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email_id TEXT UNIQUE,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT,
        error_message TEXT
      )
    `, (err) => {
      if (err) {
        console.error('Error creating email_processing_log table:', err.message);
      } else {
        console.log('Email processing log table created or already exists');
      }
    });

    // Create reconciliation_history table
    db.run(`
      CREATE TABLE IF NOT EXISTS reconciliation_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total_matches INTEGER DEFAULT 0,
        total_ledger_only INTEGER DEFAULT 0,
        total_bank_only INTEGER DEFAULT 0,
        total_matched_amount DECIMAL(10,2) DEFAULT 0,
        total_ledger_amount DECIMAL(10,2) DEFAULT 0,
        total_bank_amount DECIMAL(10,2) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating reconciliation_history table:', err.message);
      } else {
        console.log('Reconciliation history table created or already exists');
      }
    });
  });
}

// Helper function to run queries with promises
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

// Helper function to get single row
function getRow(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Helper function to get all rows
function getAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

module.exports = {
  db,
  runQuery,
  getRow,
  getAll
}; 