const express = require('express');
const router = express.Router();
const { getAll, getRow, runQuery } = require('../database/database');

// Get all ledger entries
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', category = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (search) {
      whereClause += ' AND (merchant_name LIKE ? OR description LIKE ? OR email_subject LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }
    
    // Get total count
    const countResult = await getAll(
      `SELECT COUNT(*) as total FROM ledger ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    
    // Get paginated results
    const ledger = await getAll(
      `SELECT * FROM ledger ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    
    res.json({
      ledger,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching ledger:', error);
    res.status(500).json({ error: 'Failed to fetch ledger entries' });
  }
});

// Get ledger entry by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await getRow('SELECT * FROM ledger WHERE id = ?', [id]);
    
    if (!entry) {
      return res.status(404).json({ error: 'Ledger entry not found' });
    }
    
    res.json(entry);
  } catch (error) {
    console.error('Error fetching ledger entry:', error);
    res.status(500).json({ error: 'Failed to fetch ledger entry' });
  }
});

// Create new ledger entry
router.post('/', async (req, res) => {
  try {
    const {
      email_id,
      email_subject,
      email_date,
      merchant_name,
      amount,
      date,
      category,
      description,
      receipt_text
    } = req.body;
    
    const result = await runQuery(
      `INSERT INTO ledger (
        email_id, email_subject, email_date, merchant_name, 
        amount, date, category, description, receipt_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [email_id, email_subject, email_date, merchant_name, amount, date, category, description, receipt_text]
    );
    
    const newEntry = await getRow('SELECT * FROM ledger WHERE id = ?', [result.id]);
    
    res.status(201).json(newEntry);
  } catch (error) {
    console.error('Error creating ledger entry:', error);
    res.status(500).json({ error: 'Failed to create ledger entry' });
  }
});

// Update ledger entry
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      merchant_name,
      amount,
      date,
      category,
      description
    } = req.body;
    
    await runQuery(
      `UPDATE ledger SET 
        merchant_name = ?, amount = ?, date = ?, 
        category = ?, description = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [merchant_name, amount, date, category, description, id]
    );
    
    const updatedEntry = await getRow('SELECT * FROM ledger WHERE id = ?', [id]);
    
    if (!updatedEntry) {
      return res.status(404).json({ error: 'Ledger entry not found' });
    }
    
    res.json(updatedEntry);
  } catch (error) {
    console.error('Error updating ledger entry:', error);
    res.status(500).json({ error: 'Failed to update ledger entry' });
  }
});

// Delete ledger entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await getRow('SELECT * FROM ledger WHERE id = ?', [id]);
    
    if (!entry) {
      return res.status(404).json({ error: 'Ledger entry not found' });
    }
    
    await runQuery('DELETE FROM ledger WHERE id = ?', [id]);
    res.json({ message: 'Ledger entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting ledger entry:', error);
    res.status(500).json({ error: 'Failed to delete ledger entry' });
  }
});

// Clear all ledger entries (for testing)
router.delete('/clear/all', async (req, res) => {
  try {
    await runQuery('DELETE FROM ledger');
    await runQuery('DELETE FROM email_processing_log');
    res.json({ message: 'All ledger entries and email logs cleared successfully' });
  } catch (error) {
    console.error('Error clearing ledger:', error);
    res.status(500).json({ error: 'Failed to clear ledger entries' });
  }
});

// Get ledger statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await getAll(`
      SELECT 
        COUNT(*) as total_entries,
        SUM(amount) as total_amount,
        COUNT(DISTINCT category) as unique_categories,
        COUNT(DISTINCT merchant_name) as unique_merchants
      FROM ledger
    `);
    
    const categoryStats = await getAll(`
      SELECT 
        category,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM ledger 
      GROUP BY category 
      ORDER BY total_amount DESC
    `);
    
    const monthlyStats = await getAll(`
      SELECT 
        strftime('%Y-%m', date) as month,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM ledger 
      WHERE date IS NOT NULL
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month DESC
      LIMIT 12
    `);
    
    res.json({
      summary: stats[0],
      categories: categoryStats,
      monthly: monthlyStats
    });
  } catch (error) {
    console.error('Error fetching ledger stats:', error);
    res.status(500).json({ error: 'Failed to fetch ledger statistics' });
  }
});

// Test ledger endpoint
router.get('/test', async (req, res) => {
  try {
    // Get total count
    const countResult = await getAll('SELECT COUNT(*) as total FROM ledger');
    const total = countResult[0].total;
    
    // Get all entries
    const allEntries = await getAll('SELECT * FROM ledger ORDER BY created_at DESC LIMIT 10');
    
    res.json({
      success: true,
      total_entries: total,
      recent_entries: allEntries,
      message: 'Ledger API is working correctly'
    });
  } catch (error) {
    console.error('Error testing ledger:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to test ledger',
      message: error.message 
    });
  }
});

module.exports = router; 