import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Edit, Trash2 } from 'lucide-react';
import axios from 'axios';

const Ledger = () => {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchLedger = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page,
        limit: 50,
        search,
        category
      });

      const response = await axios.get(`/api/ledger?${params}`);
      setLedger(response.data.ledger);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error('Error fetching ledger:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, category]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await axios.delete(`/api/ledger/${id}`);
        fetchLedger();
      } catch (error) {
        console.error('Error deleting entry:', error);
      }
    }
  };

  const handleEdit = (entry) => {
    setSelectedEntry(entry);
    setShowModal(true);
  };

  const handleSaveEdit = async (updatedEntry) => {
    try {
      await axios.put(`/api/ledger/${updatedEntry.id}`, updatedEntry);
      setShowModal(false);
      setSelectedEntry(null);
      fetchLedger();
    } catch (error) {
      console.error('Error updating entry:', error);
    }
  };

  const categories = [
    'Groceries',
    'Gas',
    'Dining',
    'Online Shopping',
    'Retail',
    'Entertainment',
    'Transportation',
    'Utilities',
    'Healthcare',
    'Other'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ledger</h1>
          <p className="text-gray-600 mt-2">
            View and manage all processed receipts
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search receipts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field pl-10"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {ledger.length} entries
            </span>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Date</th>
                <th className="table-header">Merchant</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Category</th>
                <th className="table-header">Description</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ledger.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    {entry.date ? new Date(entry.date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="table-cell font-medium">
                    {entry.merchant_name || 'Unknown'}
                  </td>
                  <td className="table-cell font-semibold text-green-600">
                    ${entry.amount?.toFixed(2) || '0.00'}
                  </td>
                  <td className="table-cell">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {entry.category || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="table-cell text-gray-600">
                    {entry.description || 'No description'}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showModal && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit Ledger Entry
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Merchant Name
                </label>
                <input
                  type="text"
                  value={selectedEntry.merchant_name || ''}
                  onChange={(e) => setSelectedEntry({
                    ...selectedEntry,
                    merchant_name: e.target.value
                  })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={selectedEntry.amount || ''}
                  onChange={(e) => setSelectedEntry({
                    ...selectedEntry,
                    amount: parseFloat(e.target.value) || 0
                  })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedEntry.date || ''}
                  onChange={(e) => setSelectedEntry({
                    ...selectedEntry,
                    date: e.target.value
                  })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={selectedEntry.category || ''}
                  onChange={(e) => setSelectedEntry({
                    ...selectedEntry,
                    category: e.target.value
                  })}
                  className="input-field"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={selectedEntry.description || ''}
                  onChange={(e) => setSelectedEntry({
                    ...selectedEntry,
                    description: e.target.value
                  })}
                  className="input-field"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveEdit(selectedEntry)}
                className="btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ledger; 