import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { App } from './App'
import { Landing } from './landing/Landing'
// AgentHome removed — content now lives in NewClientView inside Dashboard
import { AgentForms } from './pages/AgentForms'
import { ClientScenarios } from './pages/ClientScenarios'
import { Portfolio } from './pages/Portfolio'
import Retirement from './pages/Retirement'
import { SettingsHub } from './pages/SettingsHub'
import Toolkit from './pages/Toolkit'
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
import { ClientAssumptionsProvider } from './contexts/ClientAssumptionsContext'
import { CompanyProvider } from './contexts/CompanyContext'
import { BrandingProvider } from './contexts/BrandingContext'
import { ScenarioSaveProvider } from './contexts/ScenarioSaveContext'
import { MultiScenarioProvider } from './contexts/MultiScenarioContext'
import { LayoutProvider } from './contexts/LayoutContext'
import { CompanyManagement } from './pages/CompanyManagement'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminOnlyRoute } from './components/AdminOnlyRoute'
import CrmDashboard from './pages/admin/CrmDashboard'
import CrmPlaybook from './pages/admin/CrmPlaybook'
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
import Terms from './pages/Terms'

export function AppRouter() {
  return (
    <AuthProvider>
      <CompanyProvider>
        <BrandingProvider>
          <ClientProvider>
            <ClientAssumptionsProvider>
            <LayoutProvider>
            <DataAssumptionsProvider>
              <PropertySelectionProvider>
                <InvestmentProfileProvider>
                  <PropertyInstanceProvider>
                    <MultiScenarioProvider>
                      <ScenarioSaveProvider>
                      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                        <TourManagerProvider>
                          <Routes>
                            <Route path="/" element={<Landing />} />
                            
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

                            {/* Public terms/disclaimers page */}
                            <Route path="/terms" element={<Terms />} />
                            
                            {/* Public client onboarding form - no authentication required */}
                            <Route path="/onboarding/:onboardingId" element={<ClientOnboarding />} />
                            
                            {/* /home removed — redirect to dashboard */}
                            <Route path="/home" element={<Navigate to="/dashboard" replace />} />

                            {/* Protected app routes - require authentication */}
                            {/* /dashboard is owner/agent only. Clients shared via
                                the Share button get a /portal login that surfaces
                                their plan view-only — they don't get edit access
                                to the chat panel here. */}
                            <Route
                              path="/dashboard"
                              element={
                                <ProtectedRoute allowedRoles={['owner', 'agent']}>
                                  <App />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/portfolio"
                              element={
                                <ProtectedRoute allowedRoles={['owner', 'agent']}>
                                  <Portfolio />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="/retirement"
                              element={
                                <ProtectedRoute allowedRoles={['owner', 'agent']}>
                                  <Retirement />
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
                            <Route
                              path="/toolkit"
                              element={
                                <ProtectedRoute allowedRoles={['owner', 'agent']}>
                                  <Toolkit />
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
                            <Route path="/assumptions" element={<Navigate to="/dashboard" replace />} />
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
                                <ProtectedRoute allowedRoles={['owner', 'agent']}>
                                  <CompanyManagement />
                                </ProtectedRoute>
                              }
                            />
                            {/* PropPath internal CRM — standalone admin portal */}
                            <Route
                              path="/admin"
                              element={
                                <AdminOnlyRoute>
                                  <CrmDashboard />
                                </AdminOnlyRoute>
                              }
                            />
                            <Route
                              path="/admin/crm/playbook"
                              element={
                                <AdminOnlyRoute>
                                  <CrmPlaybook />
                                </AdminOnlyRoute>
                              }
                            />

                            {/* Redirect old /data path to /settings */}
                            <Route path="/data" element={<Navigate to="/settings" replace />} />

                            {/* Client Portal routes — wrap in LayoutProvider
                                because PortalPropertyPlan renders <Dashboard/>
                                which uses useLayout() (chatPanelWidth, drawerOpen,
                                planGenerating, etc.). Without this provider the
                                client login crashes with "useLayout must be used
                                within a LayoutProvider" (cofounder report
                                2026-05-07). */}
                            <Route
                              path="/portal"
                              element={
                                <ProtectedRoute allowedRoles={['client']} requireSubscription={false}>
                                  <PortalLayout />
                                </ProtectedRoute>
                              }
                            >
                              <Route index element={<PortalPropertyPlan />} />
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
            </LayoutProvider>
            </ClientAssumptionsProvider>
          </ClientProvider>
        </BrandingProvider>
      </CompanyProvider>
    </AuthProvider>
  )
}
