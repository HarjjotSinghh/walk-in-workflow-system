import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkApp } from './ClerkApp';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ClerkProtectedRoute';

// Import your existing pages
import { ClerkLogin } from './pages/ClerkLogin';
import { ClerkRegister } from './pages/ClerkRegister';
// import { Dashboard } from './pages/Dashboard';
// import { ReceptionPage } from './pages/ReceptionPage';
// import { PAPage } from './pages/PAPage';
// import { ConsultantPage } from './pages/ConsultantPage';
// import { AdminPage } from './pages/AdminPage';

import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkApp>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<ClerkLogin />} />
        <Route path="/register" element={<ClerkRegister />} />
        
        {/* Protected routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              {/* <Dashboard /> */}
              <div>Dashboard - Replace with your component</div>
            </ProtectedRoute>
          } 
        />
        
        {/* Role-specific routes */}
        <Route 
          path="/reception" 
          element={
            <ProtectedRoute allowedRoles={['reception', 'admin']}>
              {/* <ReceptionPage /> */}
              <div>Reception Page - Replace with your component</div>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/pa" 
          element={
            <ProtectedRoute allowedRoles={['pa', 'admin']}>
              {/* <PAPage /> */}
              <div>PA Page - Replace with your component</div>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/consultant" 
          element={
            <ProtectedRoute allowedRoles={['consultant', 'admin']}>
              {/* <ConsultantPage /> */}
              <div>Consultant Page - Replace with your component</div>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              {/* <AdminPage /> */}
              <div>Admin Page - Replace with your component</div>
            </ProtectedRoute>
          } 
        />
        
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* 404 */}
        <Route path="*" element={<div>404 - Page Not Found</div>} />
      </Routes>
    </ClerkApp>
  </React.StrictMode>
);
