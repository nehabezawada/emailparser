import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// Removed react-query dependency for now
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Ledger from './pages/Ledger';
import Reconciliation from './pages/Reconciliation';
import EmailSettings from './pages/EmailSettings';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ledger" element={<Ledger />} />
            <Route path="/reconciliation" element={<Reconciliation />} />
            <Route path="/email-settings" element={<EmailSettings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App; 