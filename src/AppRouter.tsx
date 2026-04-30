import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { App } from './App'
import { Landing } from './landing/Landing'
import { AgentHome } from './pages/AgentHome'
import { AgentForms } from './pages/AgentForms'
import { ClientScenarios } from './pages/ClientScenarios'
import { Portfolio } from './pages/Portfolio'
import Retirement from './pages/Retirement'
import Assumptions from './pages/Assumptions'
import { SettingsHub } from './pages/SettingsHub'
import { Login } from './pages/Login'
import { SignUp } from './pages/SignUp'
import { EmailConfirmed } from './pages/EmailConfirmed'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { Upgrade } from './pages/Upgrade'
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
import { LayoutProvider } from './contexts/LayoutContext'
import { CompanyManagement } from './pages/CompanyManagement'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicRoute } from './components/PublicRoute'
import { Toaster } from './components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'
import { ClientView } from './client-view/ClientView'
import { ClientOnboarding } from './pages/ClientOnboarding'
import { TourManagerProvider } from './components/TourManager'
import { PortalLayout } from './portal/PortalLayout'
import { PortalHome } from './portal/PortalHome'
import { PortalPropertyPlan } from './portal/PortalPropertyPlan'
import { PortalPortfolio } from './portal/PortalPortfolio'
import { PortalProfile } from './portal/PortalProfile'

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
                      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
                            
                            {/* Forgot password page - request a reset link */}
                            <Route
                              path="/forgot-password"
                              element={
                                <PublicRoute>
                                  <ForgotPassword />
                                </PublicRoute>
                              }
                            />

                            {/* Reset password page - set new password from email link */}
                            <Route
                              path="/reset-password"
                              element={<ResetPassword />}
                            />

                            {/* Email confirmed page - shown after email verification */}
                            <Route
                              path="/email-confirmed"
                              element={<EmailConfirmed />}
                            />
                            
                            {/* Upgrade page - requires auth but NOT subscription */}
                            <Route 
                              path="/upgrade" 
                              element={
                                <ProtectedRoute requireSubscription={false}>
                                  <Upgrade />
                                </ProtectedRoute>
                              } 
                            />
                            
                            {/* Public client view - no authentication required */}
                            <Route path="/client-view" element={<ClientView />} />
                            
                            {/* Public client onboarding form - no authentication required */}
                            <Route path="/onboarding/:onboardingId" element={<ClientOnboarding />} />
                            
                            {/* BA Home - agent/owner overview page */}
                            <Route
                              path="/home"
                              element={
                                <ProtectedRoute allowedRoles={['owner', 'agent']}>
                                  <AgentHome />
                                </ProtectedRoute>
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
                              path="/portfolio"
                              element={
                                <ProtectedRoute allowedRoles={['owner', 'agent']}>
                                  <LayoutProvider>
                                    <Portfolio />
                                  </LayoutProvider>
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/retirement"
                              element={
                                <ProtectedRoute allowedRoles={['owner', 'agent']}>
                                  <LayoutProvider>
                                    <Retirement />
                                  </LayoutProvider>
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/settings"
                              element={
                                <ProtectedRoute allowedRoles={['owner', 'agent']}>
                                  <SettingsHub />
                                </ProtectedRoute>
                              }
                            />

                            {/* Pages accessible from Home hub */}
                            <Route
                              path="/clients"
                              element={
                                <ProtectedRoute allowedRoles={['owner', 'agent']}>
                                  <ClientScenarios />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/assumptions"
                              element={
                                <ProtectedRoute allowedRoles={['owner', 'agent']}>
                                  <Assumptions />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/forms"
                              element={
                                <ProtectedRoute allowedRoles={['owner', 'agent']}>
                                  <AgentForms />
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
                            {/* Redirect old /data path to /settings */}
                            <Route path="/data" element={<Navigate to="/settings" replace />} />

                            {/* Client Portal routes */}
                            <Route
                              path="/portal"
                              element={
                                <ProtectedRoute allowedRoles={['client']} requireSubscription={false}>
                                  <PortalLayout />
                                </ProtectedRoute>
                              }
                            >
                              <Route index element={<PortalHome />} />
                              <Route path="property-plan" element={<PortalPropertyPlan />} />
                              <Route path="portfolio" element={<PortalPortfolio />} />
                              <Route path="profile" element={<PortalProfile />} />
                            </Route>
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
