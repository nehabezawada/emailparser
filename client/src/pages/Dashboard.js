import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  DollarSign, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  RefreshCw,
  Upload,
  Mail
} from 'lucide-react';
import axios from 'axios';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingEmails, setProcessingEmails] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      console.log('Dashboard - Starting to fetch stats...');
      
      const [ledgerStats, emailStats] = await Promise.allSettled([
        axios.get('/api/ledger/stats/summary'),
        axios.get('/api/email/stats')
      ]);

      console.log('Dashboard - Ledger stats result:', ledgerStats);
      console.log('Dashboard - Email stats result:', emailStats);

      const stats = {
        ledger: ledgerStats.status === 'fulfilled' ? ledgerStats.value.data : null,
        email: emailStats.status === 'fulfilled' ? emailStats.value.data : null
      };

      setStats(stats);
      
      console.log('Dashboard - Stats set successfully:', stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      console.error('Error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
      console.log('Dashboard - Loading set to false');
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const processEmails = async () => {
    setProcessingEmails(true);
    try {
      await axios.post('/api/email/process');
      await fetchStats();
    } catch (error) {
      console.error('Error processing emails:', error);
    } finally {
      setProcessingEmails(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  console.log('Dashboard - Current stats state:', stats);
  console.log('Dashboard - Ledger summary:', stats?.ledger?.summary);

  // Debug display
  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Overview of your receipt processing system
            </p>
          </div>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-red-600 mb-4">Debug Information</h3>
          <p className="text-gray-600">Stats not loaded. Check browser console for errors.</p>
          <button 
            onClick={fetchStats}
            className="mt-4 btn-primary"
          >
            Retry Loading Stats
          </button>
        </div>
      </div>
    );
  }

  // Show partial data if available
  if (!stats.ledger && !stats.email) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Overview of your receipt processing system
            </p>
          </div>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-orange-600 mb-4">Partial Data Available</h3>
          <p className="text-gray-600">Some API calls failed. Check browser console for details.</p>
          <div className="mt-4 space-y-2">
            <p><strong>Ledger API:</strong> {stats.ledger ? '✅ Working' : '❌ Failed'}</p>
            <p><strong>Email API:</strong> {stats.email ? '✅ Working' : '❌ Failed'}</p>
          </div>
          <button 
            onClick={fetchStats}
            className="mt-4 btn-primary"
          >
            Retry Loading Stats
          </button>
        </div>
      </div>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Overview of your receipt processing system
          </p>
        </div>
        <button
          onClick={processEmails}
          disabled={processingEmails}
          className="btn-primary flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${processingEmails ? 'animate-spin' : ''}`} />
          <span>{processingEmails ? 'Processing...' : 'Process Emails'}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats?.ledger?.summary?.total_amount?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Receipts</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.ledger?.summary?.total_entries || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.ledger?.summary?.unique_categories || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Mail className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Merchants</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.ledger?.summary?.unique_merchants || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Spending by Category
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats?.ledger?.categories || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="total_amount"
              >
                {stats?.ledger?.categories?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Amount']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Spending */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Monthly Spending Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats?.ledger?.monthly || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Amount']} />
              <Bar dataKey="total_amount" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity
        </h3>
        <div className="space-y-4">
          {stats?.email?.recent?.slice(0, 5).map((day, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">
                  {new Date(day.date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-green-600">
                  {day.successful} successful
                </span>
                {day.failed > 0 && (
                  <span className="text-red-600">
                    {day.failed} failed
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center space-x-3">
            <Upload className="w-8 h-8 text-blue-600" />
            <div>
              <h4 className="font-semibold text-gray-900">Upload Bank Statement</h4>
              <p className="text-sm text-gray-600">
                Compare with your ledger entries
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-green-600" />
            <div>
              <h4 className="font-semibold text-gray-900">View Ledger</h4>
              <p className="text-sm text-gray-600">
                Browse all processed receipts
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-8 h-8 text-orange-600" />
            <div>
              <h4 className="font-semibold text-gray-900">Email Settings</h4>
              <p className="text-sm text-gray-600">
                Configure email processing
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 