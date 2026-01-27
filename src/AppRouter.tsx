import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { App } from './App'
import { Landing } from './landing/Landing'
import { ClientScenarios } from './pages/ClientScenarios'
import { DataAssumptions } from './pages/DataAssumptions'
import { Login } from './pages/Login'
import { SignUp } from './pages/SignUp'
import { EmailConfirmed } from './pages/EmailConfirmed'
import { AuthProvider } from './contexts/AuthContext'
import { DataAssumptionsProvider } from './contexts/DataAssumptionsContext'
import { PropertySelectionProvider } from './contexts/PropertySelectionContext'
import { InvestmentProfileProvider } from './contexts/InvestmentProfileContext'
import { PropertyInstanceProvider } from './contexts/PropertyInstanceContext'
import { ClientProvider } from './contexts/ClientContext'
import { CompanyProvider } from './contexts/CompanyContext'
import { BrandingProvider } from './contexts/BrandingContext'
import { ScenarioSaveProvider } from './contexts/ScenarioSaveContext'
import { MultiScenarioProvider } from './contexts/MultiScenarioContext'
import { CompanyManagement } from './pages/CompanyManagement'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicRoute } from './components/PublicRoute'
import { Toaster } from './components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'
import { ClientView } from './client-view/ClientView'
import { ClientOnboarding } from './pages/ClientOnboarding'
import { TourManagerProvider } from './components/TourManager'

export function AppRouter() {
  return (
    <AuthProvider>
      <CompanyProvider>
        <BrandingProvider>
          <ClientProvider>
            <DataAssumptionsProvider>
              <PropertySelectionProvider>
                <InvestmentProfileProvider>
                  <PropertyInstanceProvider>
                    <MultiScenarioProvider>
                      <ScenarioSaveProvider>
                      <BrowserRouter>
                        <TourManagerProvider>
                          <Routes>
                            {/* Public landing page - redirects to /clients if authenticated */}
                            <Route 
                              path="/" 
                              element={
                                <PublicRoute>
                                  <Landing />
                                </PublicRoute>
                              } 
                            />
                            
                            {/* Public auth pages - redirect to /clients if authenticated */}
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
                            
                            {/* Email confirmed page - shown after email verification */}
                            <Route 
                              path="/email-confirmed" 
                              element={<EmailConfirmed />} 
                            />
                            
                            {/* Public client view - no authentication required */}
                            <Route path="/client-view" element={<ClientView />} />
                            
                            {/* Public client onboarding form - no authentication required */}
                            <Route path="/onboarding/:onboardingId" element={<ClientOnboarding />} />
                            
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
                                <ProtectedRoute allowedRoles={['owner', 'agent']}>
                                  <ClientScenarios />
                                </ProtectedRoute>
                              } 
                            />
                            <Route 
                              path="/data" 
                              element={
                                <ProtectedRoute allowedRoles={['owner', 'agent']}>
                                  <DataAssumptions />
                                </ProtectedRoute>
                              } 
                            />
                            <Route 
                              path="/company" 
                              element={
                                <ProtectedRoute allowedRoles={['owner']}>
                                  <CompanyManagement />
                                </ProtectedRoute>
                              } 
                            />
                          </Routes>
                          <Toaster />
                          <SonnerToaster position="bottom-right" richColors />
                        </TourManagerProvider>
                      </BrowserRouter>
                      </ScenarioSaveProvider>
                    </MultiScenarioProvider>
                  </PropertyInstanceProvider>
                </InvestmentProfileProvider>
              </PropertySelectionProvider>
            </DataAssumptionsProvider>
          </ClientProvider>
        </BrandingProvider>
      </CompanyProvider>
    </AuthProvider>
  )
}
