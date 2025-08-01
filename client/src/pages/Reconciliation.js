import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import axios from 'axios';

const Reconciliation = () => {
  const [bankTransactions, setBankTransactions] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Load persisted data on component mount
  useEffect(() => {
    const savedTransactions = localStorage.getItem('reconciliation_bank_transactions');
    const savedComparison = localStorage.getItem('reconciliation_comparison');
    
    if (savedTransactions) {
      try {
        setBankTransactions(JSON.parse(savedTransactions));
      } catch (error) {
        console.error('Error loading saved transactions:', error);
        localStorage.removeItem('reconciliation_bank_transactions');
      }
    }
    
    if (savedComparison) {
      try {
        setComparison(JSON.parse(savedComparison));
      } catch (error) {
        console.error('Error loading saved comparison:', error);
        localStorage.removeItem('reconciliation_comparison');
      }
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (bankTransactions.length > 0) {
      localStorage.setItem('reconciliation_bank_transactions', JSON.stringify(bankTransactions));
    }
  }, [bankTransactions]);

  useEffect(() => {
    if (comparison) {
      localStorage.setItem('reconciliation_comparison', JSON.stringify(comparison));
    }
  }, [comparison]);

  const clearData = () => {
    setBankTransactions([]);
    setComparison(null);
    localStorage.removeItem('reconciliation_bank_transactions');
    localStorage.removeItem('reconciliation_comparison');
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('statement', acceptedFiles[0]);

    try {
      const response = await axios.post('/api/reconciliation/upload-statement', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setBankTransactions(response.data.transactions);
      // Clear previous comparison when new data is uploaded
      setComparison(null);
      localStorage.removeItem('reconciliation_comparison');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please make sure it\'s a valid CSV file.');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  const compareTransactions = async () => {
    if (bankTransactions.length === 0) {
      alert('Please upload a bank statement first.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/reconciliation/compare', {
        bankTransactions,
      });
      setComparison(response.data);
    } catch (error) {
      console.error('Error comparing transactions:', error);
      alert('Error comparing transactions.');
    } finally {
      setLoading(false);
    }
  };

  const saveReconciliation = async () => {
    if (!comparison) return;

    try {
      await axios.post('/api/reconciliation/save', {
        summary: comparison.summary,
      });
      alert('Reconciliation saved successfully!');
    } catch (error) {
      console.error('Error saving reconciliation:', error);
      alert('Error saving reconciliation.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reconciliation</h1>
          <p className="text-gray-600 mt-2">
            Upload bank statements and compare with your ledger entries
          </p>
        </div>
        {(bankTransactions.length > 0 || comparison) && (
          <button
            onClick={clearData}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Clear Data
          </button>
        )}
      </div>

      {/* Upload Section */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Upload Bank Statement
        </h2>
        
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          {uploading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Uploading...</span>
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-900">
                {isDragActive ? 'Drop the CSV file here' : 'Drag & drop a CSV file here'}
              </p>
              <p className="text-gray-500 mt-2">
                or click to select a file
              </p>
            </div>
          )}
        </div>

        {bankTransactions.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Parsed Transactions ({bankTransactions.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Date</th>
                    <th className="table-header">Description</th>
                    <th className="table-header">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bankTransactions.slice(0, 10).map((tx, index) => (
                    <tr key={index}>
                      <td className="table-cell">
                        {tx.date || 'N/A'}
                      </td>
                      <td className="table-cell">
                        {tx.description}
                      </td>
                      <td className="table-cell font-semibold text-green-600">
                        ${tx.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {bankTransactions.length > 10 && (
                    <tr>
                      <td colSpan={3} className="table-cell text-center text-gray-500">
                        ... and {bankTransactions.length - 10} more transactions
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Compare Button */}
      {bankTransactions.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={compareTransactions}
            disabled={loading}
            className="btn-primary flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Comparing...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Compare with Ledger</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Comparison Results */}
      {comparison && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Matches</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {comparison.summary.totalMatches}
                  </p>
                  <p className="text-sm text-green-600">
                    ${comparison.summary.totalMatchedAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ledger Only</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {comparison.summary.totalLedgerOnly}
                  </p>
                  <p className="text-sm text-blue-600">
                    ${comparison.summary.totalLedgerAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Bank Only</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {comparison.summary.totalBankOnly}
                  </p>
                  <p className="text-sm text-orange-600">
                    ${comparison.summary.totalBankAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Bank</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(comparison.summary.totalMatchedAmount + comparison.summary.totalBankAmount).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Matches */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                Matches ({comparison.matches.length})
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {comparison.matches.map((match, index) => (
                  <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {match.bankTransaction.description}
                        </p>
                        <p className="text-sm text-gray-600">
                          {match.ledgerEntry.merchant_name}
                        </p>
                      </div>
                      <span className="font-semibold text-green-600">
                        ${match.bankTransaction.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ledger Only */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 text-blue-600 mr-2" />
                Ledger Only ({comparison.ledgerOnly.length})
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {comparison.ledgerOnly.map((item, index) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.ledgerEntry.merchant_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {item.ledgerEntry.category}
                        </p>
                      </div>
                      <span className="font-semibold text-blue-600">
                        ${item.ledgerEntry.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bank Only */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 text-orange-600 mr-2" />
                Bank Only ({comparison.bankOnly.length})
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {comparison.bankOnly.map((item, index) => (
                  <div key={index} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.bankTransaction.description}
                        </p>
                        <p className="text-sm text-gray-600">
                          {item.bankTransaction.date}
                        </p>
                      </div>
                      <span className="font-semibold text-orange-600">
                        ${item.bankTransaction.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-center">
            <button
              onClick={saveReconciliation}
              className="btn-primary"
            >
              Save Reconciliation Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reconciliation; 