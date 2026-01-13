import React, { createContext, useContext, useCallback, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { TourProvider, TourStep, useTour } from '@/components/guided-tour'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'

// Storage key for tour completion status
const TOUR_STORAGE_KEY = 'ignito_tour_status'

// Context for exposing startManualTour function
interface TourManagerContextType {
  startManualTour: () => void
}

const TourManagerContext = createContext<TourManagerContextType | null>(null)

// Hook to access the tour manager functions
export const useTourManager = () => {
  const context = useContext(TourManagerContext)
  if (!context) {
    throw new Error('useTourManager must be used within a TourManagerProvider')
  }
  return context
}

// Inner component that uses the tour context
const TourManagerInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { startTour, resetTourCompletion } = useTour()
  
  const startManualTour = useCallback(() => {
    // Reset the completion status so the tour can run again
    resetTourCompletion()
    // Start the tour after a short delay to allow reset to complete
    setTimeout(() => {
      startTour()
    }, 100)
  }, [startTour, resetTourCompletion])

  return (
    <TourManagerContext.Provider value={{ startManualTour }}>
      {children}
    </TourManagerContext.Provider>
  )
}

// Check if user has completed the tour in localStorage
const hasCompletedTourLocally = (): boolean => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(TOUR_STORAGE_KEY) === 'completed'
}

// Mark tour as completed in localStorage only (used by TourProvider internally)
const markTourCompletedLocally = () => {
  localStorage.setItem(TOUR_STORAGE_KEY, 'completed')
}

// Props for the TourManagerProvider
interface TourManagerProviderProps {
  children: React.ReactNode
}

/**
 * TourManagerProvider - Wraps the application with tour functionality
 * 
 * STRICT RULES:
 * 1. Tour should ONLY auto-start on /dashboard route
 * 2. Tour should ONLY auto-start if BOTH localStorage AND database say not completed
 * 3. Tour should NEVER auto-start on /clients or any other page
 * 4. Manual tour start (via Help button) works on any page
 * 
 * Features:
 * - Fuzzy overlay with backdrop-filter: blur(4px)
 * - Semi-transparent dark background
 * - 12px padding around highlighted elements
 * - Auto-starts for first-time users ON DASHBOARD ONLY
 * - Saves completion status to BOTH localStorage AND database
 * 
 * Tour steps are now defined inline in each component using TourStep wrapper.
 */
export const TourManagerProvider: React.FC<TourManagerProviderProps> = ({ children }) => {
  const location = useLocation()
  const { user } = useAuth()
  const [hasCompletedTourDB, setHasCompletedTourDB] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch tour completion status from database on mount
  useEffect(() => {
    const fetchTourStatus = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('has_completed_tour')
          .eq('id', user.id)
          .single()

        if (!error && data) {
          const completed = data.has_completed_tour ?? false
          setHasCompletedTourDB(completed)
          // Sync to localStorage if DB says completed
          if (completed) {
            localStorage.setItem(TOUR_STORAGE_KEY, 'completed')
          }
        }
      } catch (error) {
        console.error('Error fetching tour status:', error)
      }
      setLoading(false)
    }

    fetchTourStatus()
  }, [user])

  // Mark tour as completed in BOTH localStorage AND database
  const markTourCompletedPersistent = useCallback(async () => {
    // Always update localStorage immediately
    localStorage.setItem(TOUR_STORAGE_KEY, 'completed')
    setHasCompletedTourDB(true)

    // Also persist to database if user is logged in
    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ has_completed_tour: true })
          .eq('id', user.id)
      } catch (error) {
        console.error('Error saving tour completion to database:', error)
      }
    }
  }, [user])

  // STRICT RULES:
  // 1. Tour should ONLY auto-start on /dashboard route
  // 2. Tour should ONLY auto-start if BOTH localStorage AND database say not completed
  // 3. Tour should NEVER auto-start on /clients or any other page
  const isOnDashboard = location.pathname === '/dashboard'
  const hasCompletedTour = hasCompletedTourDB === true || hasCompletedTourLocally()
  const shouldAutoStart = isOnDashboard && !hasCompletedTour && !loading

  return (
    <TourProvider
      autoStart={shouldAutoStart}
      ranOnce={true}
      storageKey={TOUR_STORAGE_KEY}
      shouldStart={shouldAutoStart}
      onTourComplete={markTourCompletedPersistent}
      onTourSkip={markTourCompletedPersistent}
      highlightPadding={12}
      overlayClassName="bg-black/50 backdrop-blur-tour"
    >
      <TourManagerInner>
        {children}
      </TourManagerInner>
    </TourProvider>
  )
}

// Re-export TourStep for use in other components
export { TourStep }

export default TourManagerProvider
