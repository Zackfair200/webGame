import React from 'react';
import { Route, Routes } from 'react-router-dom';
import LoginPage from '../auth/LoginPage';
import RegisterPage from '../auth/RegisterPage';
import DashboardPage from '../dashboard/DashboardPage';
import GamePage from '../game/GamePage';
import PrivateRoute from '../auth/PrivateRoute';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/game"
        element={
          <PrivateRoute>
            <GamePage />
          </PrivateRoute>
        }
      />
      <Route path="/dev_game" element={<GamePage />} />
      <Route path="/" element={<LoginPage />} />
    </Routes>
  );
}

export default AppRoutes;
