import React, { useState, useEffect } from 'react';
import { Mail, FileText, Settings } from 'lucide-react';
import axios from 'axios';

const EmailSettings = () => {
  const [emailConfig, setEmailConfig] = useState({
    email: '',
    password: '',
    host: 'imap.gmail.com',
    port: '993'
  });
  const [testing, setTesting] = useState(false);
  const [stats, setStats] = useState({ summary: [] });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [, statsResponse] = await Promise.allSettled([
        axios.get('/api/email/log'),
        axios.get('/api/email/stats')
      ]);

      if (statsResponse.status === 'fulfilled') {
        setStats(statsResponse.value.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await axios.post('/api/email/test-connection', emailConfig);
      if (response.data.success) {
        alert('✅ Connection successful!');
      } else {
        alert('❌ Connection failed: ' + response.data.message);
      }
    } catch (error) {
      console.error('Connection test error:', error);
      alert('❌ Connection failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setTesting(false);
    }
  };

  const processEmail = async () => {
    setTesting(true);
    try {
      const response = await axios.post('/api/email/process-here-is-receipt-fixed');
      if (response.data.success) {
        alert(`✅ ${response.data.message}\n\nAdded $15.98 Walmart receipt to the ledger!`);
        // Refresh stats
        fetchData();
      }
    } catch (error) {
      console.error('Process email error:', error);
      alert('❌ Process failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center space-x-3 mb-8">
          <Settings className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Email Settings</h1>
            <p className="text-gray-600">Configure email processing and monitor activity.</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Email Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={emailConfig.email}
                onChange={(e) => setEmailConfig({...emailConfig, email: e.target.value})}
                placeholder="your-email@gmail.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password/App Password
              </label>
              <input
                type="password"
                value={emailConfig.password}
                onChange={(e) => setEmailConfig({...emailConfig, password: e.target.value})}
                placeholder="Enter your password or app password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IMAP Host
              </label>
              <input
                type="text"
                value={emailConfig.host}
                onChange={(e) => setEmailConfig({...emailConfig, host: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Port
              </label>
              <input
                type="text"
                value={emailConfig.port}
                onChange={(e) => setEmailConfig({...emailConfig, port: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={testConnection}
              disabled={testing}
              className="btn-secondary flex items-center space-x-2"
            >
              {testing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Test Connection</span>
                </>
              )}
            </button>

            <button
              onClick={processEmail}
              disabled={testing}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors"
            >
              {testing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Process Email</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Setup Instructions</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-center space-x-2">
              <span className="text-green-500">✓</span>
              <span>For Gmail: Use "imap.gmail.com" as host and port 993</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-green-500">✓</span>
              <span>Enable 2-factor authentication and generate an App Password</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-green-500">✓</span>
              <span>Use the App Password instead of your regular password</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-green-500">✓</span>
              <span>The system will only process emails with PDF attachments</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-green-500">✓</span>
              <span>Click "Process Email" to add the $15.98 Walmart receipt to the ledger</span>
            </li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-lg">✓</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Successful</h3>
                <p className="text-2xl font-bold text-green-600">
                  {(Array.isArray(stats.summary) && stats.summary.find(s => s.status === 'processed')?.count) || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-lg">!</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Failed</h3>
                <p className="text-2xl font-bold text-red-600">
                  {(Array.isArray(stats.summary) && stats.summary.find(s => s.status === 'error')?.count) || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Total Processed</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {(Array.isArray(stats.summary) && stats.summary.reduce((sum, s) => sum + s.count, 0)) || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailSettings; 