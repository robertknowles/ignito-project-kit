import React, { createContext, useContext, useCallback } from 'react'
import { TourProvider, TourStep, useTour } from '@/components/guided-tour'

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

// Check if user has completed the tour
const hasCompletedTour = (): boolean => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(TOUR_STORAGE_KEY) === 'completed'
}

// Mark tour as completed
const markTourCompleted = () => {
  localStorage.setItem(TOUR_STORAGE_KEY, 'completed')
}

// Props for the TourManagerProvider
interface TourManagerProviderProps {
  children: React.ReactNode
}

/**
 * TourManagerProvider - Wraps the application with tour functionality
 * 
 * Features:
 * - Fuzzy overlay with backdrop-filter: blur(4px)
 * - Semi-transparent dark background
 * - 12px padding around highlighted elements
 * - Auto-starts for first-time users
 * - Saves completion status to localStorage
 * 
 * Tour steps are now defined inline in each component using TourStep wrapper.
 */
export const TourManagerProvider: React.FC<TourManagerProviderProps> = ({ children }) => {
  const isFirstTimeUser = !hasCompletedTour()

  return (
    <TourProvider
      autoStart={isFirstTimeUser}
      ranOnce={true}
      storageKey={TOUR_STORAGE_KEY}
      shouldStart={isFirstTimeUser}
      onTourComplete={markTourCompleted}
      onTourSkip={markTourCompleted}
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
