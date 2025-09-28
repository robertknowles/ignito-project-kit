import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { App } from './App'
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