import React, { createContext, useContext, useCallback, useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { TourProvider, TourStep, useTour } from '@/components/guided-tour'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'

// Storage keys for tour completion status (per page)
const TOUR_STORAGE_KEYS = {
  dashboard: 'ignito_tour_dashboard',
  clients: 'ignito_tour_clients',
} as const

// Database column names for tour completion (per page)
const TOUR_DB_COLUMNS = {
  dashboard: 'has_completed_tour',
  clients: 'has_completed_clients_tour',
} as const

type TourPage = 'dashboard' | 'clients'

// Set to true to disable the tour/help system entirely
const TOUR_DISABLED = false

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
    // Don't start tour if disabled
    if (TOUR_DISABLED) return
    
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

// Get the tour page type from pathname
const getTourPage = (pathname: string): TourPage | null => {
  if (pathname === '/dashboard') return 'dashboard'
  if (pathname === '/clients') return 'clients'
  return null
}

// Check if user has completed a specific tour in localStorage
const hasCompletedTourLocally = (page: TourPage): boolean => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(TOUR_STORAGE_KEYS[page]) === 'completed'
}

// Props for the TourManagerProvider
interface TourManagerProviderProps {
  children: React.ReactNode
}

/**
 * TourManagerProvider - Wraps the application with tour functionality
 * 
 * STRICT RULES:
 * 1. Tour auto-starts on first visit to /dashboard (dashboard tour)
 * 2. Tour auto-starts on first visit to /clients (clients tour)
 * 3. Each page has SEPARATE completion tracking
 * 4. Tour should ONLY auto-start if BOTH localStorage AND database say not completed for that page
 * 5. Manual tour start (via Help button) works on any page
 * 
 * Features:
 * - Fuzzy overlay with backdrop-filter: blur(4px)
 * - Semi-transparent dark background
 * - 12px padding around highlighted elements
 * - Auto-starts for first-time users on each tour page independently
 * - Saves completion status to BOTH localStorage AND database (per page)
 * 
 * Tour steps are now defined inline in each component using TourStep wrapper.
 */
export const TourManagerProvider: React.FC<TourManagerProviderProps> = ({ children }) => {
  const location = useLocation()
  const { user } = useAuth()
  const [tourCompletionDB, setTourCompletionDB] = useState<Record<TourPage, boolean | null>>({
    dashboard: null,
    clients: null,
  })
  const [loading, setLoading] = useState(true)

  // Determine current tour page
  const currentTourPage = getTourPage(location.pathname)

  // Fetch tour completion status from database on mount
  useEffect(() => {
    const fetchTourStatus = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('has_completed_tour, has_completed_clients_tour')
          .eq('id', user.id)
          .maybeSingle()

        if (error) {
          // Could not fetch tour status - fall back to localStorage
        } else if (data) {
          const dashboardCompleted = data.has_completed_tour ?? false
          const clientsCompleted = data.has_completed_clients_tour ?? false
          
          setTourCompletionDB({
            dashboard: dashboardCompleted,
            clients: clientsCompleted,
          })
          
          // Sync to localStorage if DB says completed
          if (dashboardCompleted) {
            localStorage.setItem(TOUR_STORAGE_KEYS.dashboard, 'completed')
          }
          if (clientsCompleted) {
            localStorage.setItem(TOUR_STORAGE_KEYS.clients, 'completed')
          }
        }
      } catch (error) {
        // Error fetching tour status - fall back to localStorage
      }
      setLoading(false)
    }

    fetchTourStatus()
  }, [user?.id])

  // Mark tour as completed in BOTH localStorage AND database (for current page)
  const markTourCompletedPersistent = useCallback(async () => {
    if (!currentTourPage) return
    
    // Always update localStorage immediately
    localStorage.setItem(TOUR_STORAGE_KEYS[currentTourPage], 'completed')
    setTourCompletionDB(prev => ({ ...prev, [currentTourPage]: true }))

    // Also persist to database if user is logged in
    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ [TOUR_DB_COLUMNS[currentTourPage]]: true })
          .eq('id', user.id)
      } catch (error) {
        // Failed to save tour completion to database
      }
    }
  }, [user, currentTourPage])

  // Check if current page's tour has been completed
  const hasCompletedCurrentTour = useMemo(() => {
    if (!currentTourPage) return true // Not on a tour page, don't auto-start
    return tourCompletionDB[currentTourPage] === true || hasCompletedTourLocally(currentTourPage)
  }, [currentTourPage, tourCompletionDB])

  // Get storage key for current page
  const currentStorageKey = currentTourPage ? TOUR_STORAGE_KEYS[currentTourPage] : TOUR_STORAGE_KEYS.dashboard

  // Should auto-start for current page
  const shouldAutoStart = !TOUR_DISABLED && currentTourPage !== null && !hasCompletedCurrentTour && !loading

  return (
    <TourProvider
      autoStart={shouldAutoStart}
      ranOnce={true}
      storageKey={currentStorageKey}
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
