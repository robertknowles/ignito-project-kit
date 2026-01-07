import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react'
import { TourProvider, TourStep, useTour } from '@/components/guided-tour'
import { useLocation } from 'react-router-dom'

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
      <TourSteps />
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

/**
 * TourStepTarget - A component that attaches to an existing DOM element by selector
 */
const TourStepTarget: React.FC<{
  id: string
  title: string
  content: string
  order: number
  position?: 'top' | 'bottom' | 'left' | 'right'
  targetSelector: string
}> = ({ id, title, content, order, position, targetSelector }) => {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)
  const observerRef = useRef<MutationObserver | null>(null)

  useEffect(() => {
    // Function to find and set the target element
    const findTarget = () => {
      const element = document.querySelector(targetSelector) as HTMLElement
      if (element) {
        setTargetElement(element)
        return true
      }
      return false
    }

    // Try to find immediately
    if (!findTarget()) {
      // If not found, set up a mutation observer to wait for it
      observerRef.current = new MutationObserver(() => {
        if (findTarget()) {
          observerRef.current?.disconnect()
        }
      })
      
      observerRef.current.observe(document.body, {
        childList: true,
        subtree: true,
      })
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [targetSelector])

  if (!targetElement) return null

  // Create a portal-like wrapper that positions itself over the target
  const rect = targetElement.getBoundingClientRect()
  
  return (
    <TourStep
      id={id}
      title={title}
      content={content}
      order={order}
      position={position}
    >
      <div
        style={{
          position: 'fixed',
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          pointerEvents: 'none',
        }}
      />
    </TourStep>
  )
}

/**
 * TourSteps - Defines the placeholder tour steps
 * These will be replaced with actual content later
 */
const TourSteps: React.FC = () => {
  const location = useLocation()
  const [mounted, setMounted] = useState(false)

  // Wait for the page to be fully rendered before showing tour steps
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 500)
    return () => clearTimeout(timer)
  }, [location.pathname])

  if (!mounted) return null

  return (
    <>
      {/* Step 1: Sidebar/LeftRail */}
      <TourStepTarget
        id="sidebar-step"
        title="Navigation Sidebar"
        content="This is the sidebar where you can navigate between different sections of the app."
        order={1}
        position="right"
        targetSelector="#left-rail"
      />

      {/* Step 2: Main Content Area */}
      <TourStepTarget
        id="main-content-step"
        title="Main Content Area"
        content="This is the main content area where you'll see your dashboard, charts, and other information."
        order={2}
        position="left"
        targetSelector="#main-content"
      />
    </>
  )
}

// Re-export TourStep for use in other components
export { TourStep }

export default TourManagerProvider
