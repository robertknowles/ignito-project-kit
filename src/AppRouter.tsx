import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { App } from './App'
import { ClientScenarios } from './pages/ClientScenarios'
import { DataAssumptions } from './pages/DataAssumptions'
import { Login } from './pages/Login'
import { SignUp } from './pages/SignUp'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
export function AppRouter() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/clients" 
            element={
              <ProtectedRoute>
                <ClientScenarios />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/data" 
            element={
              <ProtectedRoute>
                <DataAssumptions />
              </ProtectedRoute>
            } 
          />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}