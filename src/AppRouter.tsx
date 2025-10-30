import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { App } from './App'
import { Landing } from './landing/Landing'
import { ClientScenarios } from './pages/ClientScenarios'
import { DataAssumptions } from './pages/DataAssumptions'
import { Login } from './pages/Login'
import { SignUp } from './pages/SignUp'
import { AuthProvider } from './contexts/AuthContext'
import { DataAssumptionsProvider } from './contexts/DataAssumptionsContext'
import { PropertySelectionProvider } from './contexts/PropertySelectionContext'
import { InvestmentProfileProvider } from './contexts/InvestmentProfileContext'
import { ClientProvider } from './contexts/ClientContext'
import { ScenarioSaveProvider } from './contexts/ScenarioSaveContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicRoute } from './components/PublicRoute'
import { Toaster } from './components/ui/toaster'

export function AppRouter() {
  return (
    <AuthProvider>
      <ClientProvider>
        <DataAssumptionsProvider>
          <PropertySelectionProvider>
            <InvestmentProfileProvider>
              <ScenarioSaveProvider>
                <BrowserRouter>
                  <Routes>
                    {/* Public landing page - redirects to /dashboard if authenticated */}
                    <Route 
                      path="/" 
                      element={
                        <PublicRoute>
                          <Landing />
                        </PublicRoute>
                      } 
                    />
                    
                    {/* Public auth pages - redirect to /dashboard if authenticated */}
                    <Route 
                      path="/login" 
                      element={
                        <PublicRoute>
                          <Login />
                        </PublicRoute>
                      } 
                    />
                    <Route 
                      path="/signup" 
                      element={
                        <PublicRoute>
                          <SignUp />
                        </PublicRoute>
                      } 
                    />
                    
                    {/* Protected app routes - require authentication */}
                    <Route 
                      path="/dashboard" 
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
                      path="/data" 
                      element={
                        <ProtectedRoute>
                          <DataAssumptions />
                        </ProtectedRoute>
                      } 
                    />
                  </Routes>
                  <Toaster />
                </BrowserRouter>
              </ScenarioSaveProvider>
            </InvestmentProfileProvider>
          </PropertySelectionProvider>
        </DataAssumptionsProvider>
      </ClientProvider>
    </AuthProvider>
  )
}