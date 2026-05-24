import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Navbar from './components/Navbar';
import GeminiChatbotWidget from './components/GeminiChatbotWidget';
import Home from './pages/Home';
import Analyze from './pages/AnalyzeLive';
import Feedback from './pages/FeedbackLive';
import Report from './pages/ReportLive';

export default function App() {
  return (
    <AppProvider>
      <Navbar />
      <Routes>
        <Route path="/"              element={<Home />} />
        <Route path="/analyze"       element={<Analyze />} />
        <Route path="/feedback"      element={<Feedback />} />
        <Route path="/report"        element={<Report />} />
        <Route path="*"              element={<Navigate to="/" replace />} />
      </Routes>
      <GeminiChatbotWidget />
    </AppProvider>
  );
}
