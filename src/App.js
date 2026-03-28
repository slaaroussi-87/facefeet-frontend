import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Catalogue from './pages/Catalogue';
import Ventes from './pages/Ventes';
import Dashboard from './pages/Dashboard';
import Stock from './pages/Stock';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="logo">F&F — <span>Face & Feet By Laroussi</span></div>
          <div className="nav-links">
            <NavLink to="/" end>Catalogue</NavLink>
            <NavLink to="/ventes">Ventes</NavLink>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/stock">Stock</NavLink>
          </div>
        </nav>
        <main className="content">
          <Routes>
            <Route path="/" element={<Catalogue />} />
            <Route path="/ventes" element={<Ventes />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/stock" element={<Stock />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;