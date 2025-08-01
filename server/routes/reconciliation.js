const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { getAll, runQuery } = require('../database/database');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Main reconciliation endpoint
router.get('/', async (req, res) => {
  try {
    // Get ledger statistics
    const ledgerStats = await getAll(`
      SELECT 
        COUNT(*) as total_entries,
        SUM(amount) as total_amount,
        COUNT(DISTINCT category) as unique_categories,
        COUNT(DISTINCT merchant_name) as unique_merchants
      FROM ledger
    `);
    
    // Get recent reconciliation history
    const recentReconciliations = await getAll(`
      SELECT * FROM reconciliation_history 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    res.json({
      ledgerStats: ledgerStats[0] || {
        total_entries: 0,
        total_amount: 0,
        unique_categories: 0,
        unique_merchants: 0
      },
      recentReconciliations
    });
  } catch (error) {
    console.error('Error fetching reconciliation data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch reconciliation data',
      message: error.message 
    });
  }
});

// Parse CSV bank statement
router.post('/upload-statement', upload.single('statement'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const csvBuffer = req.file.buffer;
    const results = [];
    
    // Parse CSV
    const csvString = csvBuffer.toString();
    const lines = csvString.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        // Try to extract amount and date
        const amount = parseFloat(row.amount || row.Amount || row.AMOUNT || row['Transaction Amount'] || '0');
        const date = row.date || row.Date || row.DATE || row['Transaction Date'] || '';
        const description = row.description || row.Description || row.DESC || row['Transaction Description'] || '';
        
        if (!isNaN(amount) && amount !== 0) {
          results.push({
            date,
            amount: Math.abs(amount), // Use absolute value
            description: description.trim(),
            originalRow: row
          });
        }
      }
    }

    res.json({
      message: `Parsed ${results.length} transactions from bank statement`,
      transactions: results
    });
  } catch (error) {
    console.error('Error parsing CSV:', error);
    res.status(500).json({ error: 'Failed to parse CSV file' });
  }
});

// Compare bank statement with ledger
router.post('/compare', async (req, res) => {
  try {
    const { bankTransactions } = req.body;
    
    if (!bankTransactions || !Array.isArray(bankTransactions)) {
      return res.status(400).json({ error: 'Bank transactions array is required' });
    }

    // Get all ledger entries
    const ledgerEntries = await getAll('SELECT * FROM ledger ORDER BY date DESC');
    
    const comparison = {
      matches: [],
      ledgerOnly: [],
      bankOnly: [],
      summary: {
        totalMatches: 0,
        totalLedgerOnly: 0,
        totalBankOnly: 0,
        totalMatchedAmount: 0,
        totalLedgerAmount: 0,
        totalBankAmount: 0
      }
    };

    // Helper function to normalize text for comparison
    const normalizeText = (text) => {
      return text.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/\s+/g, '');
    };

    // Helper function to check if amounts match (with tolerance)
    const amountsMatch = (amount1, amount2, tolerance = 0.01) => {
      return Math.abs(amount1 - amount2) <= tolerance;
    };

    // Helper function to check if descriptions match
    const descriptionsMatch = (desc1, desc2) => {
      const norm1 = normalizeText(desc1);
      const norm2 = normalizeText(desc2);
      
      // Check for exact match or partial match
      return norm1 === norm2 || 
             norm1.includes(norm2) || 
             norm2.includes(norm1) ||
             norm1.length > 5 && norm2.length > 5 && 
             (norm1.includes(norm2.substring(0, 5)) || norm2.includes(norm1.substring(0, 5)));
    };

    // Create copies for processing
    const processedLedger = [...ledgerEntries];
    const processedBank = [...bankTransactions];

    // Find matches
    for (let i = 0; i < processedBank.length; i++) {
      const bankTx = processedBank[i];
      
      for (let j = 0; j < processedLedger.length; j++) {
        const ledgerTx = processedLedger[j];
        
        // Check if amounts and descriptions match
        if (amountsMatch(bankTx.amount, ledgerTx.amount) && 
            descriptionsMatch(bankTx.description, ledgerTx.merchant_name)) {
          
          comparison.matches.push({
            bankTransaction: bankTx,
            ledgerEntry: ledgerTx,
            matchConfidence: 'high'
          });
          
          comparison.summary.totalMatches++;
          comparison.summary.totalMatchedAmount += bankTx.amount;
          
          // Remove from arrays to avoid double matching
          processedBank.splice(i, 1);
          processedLedger.splice(j, 1);
          i--; // Adjust index after removal
          break;
        }
      }
    }

    // Remaining ledger entries (ledger only)
    comparison.ledgerOnly = processedLedger.map(entry => ({
      ledgerEntry: entry,
      reason: 'No matching bank transaction found'
    }));
    comparison.summary.totalLedgerOnly = comparison.ledgerOnly.length;
    comparison.summary.totalLedgerAmount = comparison.ledgerOnly.reduce((sum, item) => sum + item.ledgerEntry.amount, 0);

    // Remaining bank transactions (bank only)
    comparison.bankOnly = processedBank.map(tx => ({
      bankTransaction: tx,
      reason: 'No matching ledger entry found'
    }));
    comparison.summary.totalBankOnly = comparison.bankOnly.length;
    comparison.summary.totalBankAmount = comparison.bankOnly.reduce((sum, item) => sum + item.bankTransaction.amount, 0);

    res.json(comparison);
  } catch (error) {
    console.error('Error comparing transactions:', error);
    res.status(500).json({ error: 'Failed to compare transactions' });
  }
});

// Get reconciliation history
router.get('/history', async (req, res) => {
  try {
    const reconciliations = await getAll(`
      SELECT 
        id,
        created_at,
        total_matches,
        total_ledger_only,
        total_bank_only,
        total_matched_amount,
        total_ledger_amount,
        total_bank_amount
      FROM reconciliation_history
      ORDER BY created_at DESC
      LIMIT 50
    `);
    
    res.json(reconciliations);
  } catch (error) {
    console.error('Error fetching reconciliation history:', error);
    res.status(500).json({ error: 'Failed to fetch reconciliation history' });
  }
});

// Save reconciliation result
router.post('/save', async (req, res) => {
  try {
    const { summary } = req.body;
    
    const result = await runQuery(`
      INSERT INTO reconciliation_history (
        total_matches, total_ledger_only, total_bank_only,
        total_matched_amount, total_ledger_amount, total_bank_amount
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      summary.totalMatches,
      summary.totalLedgerOnly,
      summary.totalBankOnly,
      summary.totalMatchedAmount,
      summary.totalLedgerAmount,
      summary.totalBankAmount
    ]);
    
    res.json({ 
      message: 'Reconciliation saved successfully',
      id: result.id 
    });
  } catch (error) {
    console.error('Error saving reconciliation:', error);
    res.status(500).json({ error: 'Failed to save reconciliation' });
  }
});

module.exports = router; 