import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Navbar.css';

const WaveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"
       strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <polyline points="4 19 8 13 12 17 16 9 20 13" />
  </svg>
);

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <NavLink to="/" className="nav-logo">
        <div className="nav-logo-mark"><WaveIcon /></div>
        SpeechSense
      </NavLink>

      <div className="nav-links">
        <NavLink to="/"              className={({ isActive }) => 'nl' + (isActive ? ' active' : '')} end>Home</NavLink>
        <NavLink to="/analyze"       className={({ isActive }) => 'nl' + (isActive ? ' active' : '')}>Analyze</NavLink>
        <NavLink to="/feedback"      className={({ isActive }) => 'nl' + (isActive ? ' active' : '')}>Feedback</NavLink>
        <NavLink to="/report"        className={({ isActive }) => 'nl' + (isActive ? ' active' : '')}>Report</NavLink>
      </div>

      <button className="nav-cta" onClick={() => navigate('/analyze')}>
        Start Analysis
      </button>
    </nav>
  );
}
