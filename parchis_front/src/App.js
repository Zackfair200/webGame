import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Register from './components/Register';
import Dashboard from './pages/Dashboard';
import Game from './pages/Game';
import PrivateRoute from './components/PrivateRoute'; // Importa el componente PrivateRoute

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* Protege la ruta del dashboard */}
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } 
        />
        {/* Protege la ruta del juego */}
        <Route 
          path="/game" 
          element={
            <PrivateRoute>
              <Game />
            </PrivateRoute>
          } 
        />
        {/* Redirige la raíz al login */}
        <Route path="/" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;
