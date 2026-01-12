import React, { useState, useEffect, useRef, createContext, useContext, ReactNode, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

const useDisableMouseScroll = (isDisabled: boolean) => {
  useEffect(() => {
    if (!isDisabled) return

    const preventMouseScroll = (e: WheelEvent) => {
      e.preventDefault()
    }

    window.addEventListener('wheel', preventMouseScroll, { passive: false })
    return () => window.removeEventListener('wheel', preventMouseScroll)
  }, [isDisabled])
}

interface TourStepConfig {
  id: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  order: number;
}

interface TourProviderProps {
  children: ReactNode;
  autoStart?: boolean;
  ranOnce?: boolean;
  storageKey?: string;
  shouldStart?: boolean;
  onTourComplete?: () => void;
  onTourSkip?: () => void;
  highlightPadding?: number;
  overlayClassName?: string;
}

interface TourContextType {
  registerStep: (stepConfig: TourStepConfig, element: HTMLElement) => void;
  unregisterStep: (id: string) => void;
  startTour: () => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  resetTourCompletion: () => void;
  isActive: boolean;
  currentStepId: string | null;
  currentStepIndex: number;
  totalSteps: number;
  highlightPadding: number;
  overlayClassName: string;
}

const TourContext = createContext<TourContextType | null>(null);

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};

const TourOverlay: React.FC = () => {
  const { isActive, currentStepId, highlightPadding, overlayClassName } = useTour()
  const [highlightRect, setHighlightRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const rafRef = useRef<number | undefined>(undefined)

  useDisableMouseScroll(isActive)

  const updateHighlight = useCallback(() => {
    if (!isActive || !currentStepId) return

    const stepElement = document.querySelector(`[data-tour-step="${currentStepId}"]`) as HTMLElement
    if (!stepElement) return

    const rect = stepElement.getBoundingClientRect()
    const padding = highlightPadding

    setHighlightRect({
      left: rect.left - padding,
      top: rect.top - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    })
  }, [isActive, currentStepId, highlightPadding])

  useEffect(() => {
    if (!isActive || !currentStepId) {
      setHighlightRect(null)
      return
    }

    updateHighlight()

    const handleUpdate = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updateHighlight)
    }

    // Find the scrollable parent container(s) of the current step element
    const stepElement = document.querySelector(`[data-tour-step="${currentStepId}"]`) as HTMLElement
    const scrollableParents: HTMLElement[] = []
    
    if (stepElement) {
      let parent = stepElement.parentElement
      while (parent) {
        const style = getComputedStyle(parent)
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          scrollableParents.push(parent)
        }
        parent = parent.parentElement
      }
    }

    // Listen to scroll on window AND any scrollable parent containers
    window.addEventListener('scroll', handleUpdate, { passive: true })
    window.addEventListener('resize', handleUpdate, { passive: true })
    scrollableParents.forEach(el => {
      el.addEventListener('scroll', handleUpdate, { passive: true })
    })

    // Also update after a delay to catch scrollIntoView completion
    const scrollTimeout = setTimeout(updateHighlight, 400)

    return () => {
      window.removeEventListener('scroll', handleUpdate)
      window.removeEventListener('resize', handleUpdate)
      scrollableParents.forEach(el => {
        el.removeEventListener('scroll', handleUpdate)
      })
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      clearTimeout(scrollTimeout)
    }
  }, [isActive, currentStepId, updateHighlight])

  if (!isActive || !highlightRect) return null

  // Use box-shadow to create the spotlight effect - a massive shadow that covers the viewport
  // with a transparent "hole" in the center where the highlighted element is
  const spotlightStyle: React.CSSProperties = {
    position: 'fixed',
    left: highlightRect.left,
    top: highlightRect.top,
    width: highlightRect.width,
    height: highlightRect.height,
    borderRadius: '12px',
    // Create a massive box-shadow that covers the entire viewport
    // The shadow is semi-transparent black, creating the "fuzzy" overlay effect
    // The element itself remains transparent, creating the "cutout"
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
    pointerEvents: 'none',
    transition: 'all 300ms ease-out',
    zIndex: 10001,
  }

  // Create a clip-path polygon that covers the entire screen EXCEPT the spotlight area
  // This creates a "frame" shape with a rectangular hole in the middle
  // The polygon traces: top-left → bottom-left → up to hole → around hole → back down → bottom-right → top-right
  const blurClipPath = `polygon(
    0% 0%, 
    0% 100%, 
    ${highlightRect.left}px 100%, 
    ${highlightRect.left}px ${highlightRect.top}px, 
    ${highlightRect.left + highlightRect.width}px ${highlightRect.top}px, 
    ${highlightRect.left + highlightRect.width}px ${highlightRect.top + highlightRect.height}px, 
    ${highlightRect.left}px ${highlightRect.top + highlightRect.height}px, 
    ${highlightRect.left}px 100%, 
    100% 100%, 
    100% 0%
  )`

  return (
    <>
      {/* Backdrop blur layer - covers entire screen EXCEPT the spotlight area */}
      <div 
        className="fixed inset-0 z-10000 pointer-events-none"
        style={{ 
          backdropFilter: 'blur(4px)',
          clipPath: blurClipPath,
          transition: 'clip-path 300ms ease-out',
        }}
      />
      {/* Spotlight cutout - box-shadow creates the dark overlay with transparent center */}
      <div style={spotlightStyle} />
    </>
  )
}

const GlobalTourPopover: React.FC = () => {
  const {
    isActive,
    currentStepId,
    currentStepIndex,
    totalSteps,
    nextStep,
    prevStep,
    stopTour
  } = useTour()

  const [currentStepData, setCurrentStepData] = useState<TourStepConfig | null>(null)
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({})
  const popoverRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | undefined>(undefined)

  const updatePosition = useCallback(() => {
    if (!isActive || !currentStepId || !popoverRef.current) return

    const stepElement = document.querySelector(`[data-tour-step="${currentStepId}"]`) as HTMLElement
    if (!stepElement) return

    const stepData = JSON.parse(stepElement.getAttribute('data-tour-config') || '{}')
    const targetRect = stepElement.getBoundingClientRect()
    const popoverRect = popoverRef.current.getBoundingClientRect()

    const margin = 16
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let top = targetRect.bottom + margin
    let left = targetRect.left + (targetRect.width / 2) - (popoverRect.width / 2)

    if (stepData.position === 'top') {
      top = targetRect.top - popoverRect.height - margin
    } else if (stepData.position === 'left') {
      top = targetRect.top + (targetRect.height / 2) - (popoverRect.height / 2)
      left = targetRect.left - popoverRect.width - margin
    } else if (stepData.position === 'right') {
      top = targetRect.top + (targetRect.height / 2) - (popoverRect.height / 2)
      left = targetRect.right + margin
    }

    top = Math.max(margin, Math.min(top, viewportHeight - popoverRect.height - margin))
    left = Math.max(margin, Math.min(left, viewportWidth - popoverRect.width - margin))

    setPopoverStyle({
      position: 'fixed',
      top,
      left,
      zIndex: 10003,
    })
  }, [isActive, currentStepId])

  useEffect(() => {
    if (!isActive || !currentStepId) {
      setCurrentStepData(null)
      setPopoverStyle({})
      return
    }

    const stepElement = document.querySelector(`[data-tour-step="${currentStepId}"]`) as HTMLElement
    if (!stepElement) return

    const stepData = JSON.parse(stepElement.getAttribute('data-tour-config') || 'null')
    setCurrentStepData(stepData)

    stepElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    })

    const handleUpdate = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updatePosition)
    }

    setTimeout(updatePosition, 100)

    window.addEventListener('scroll', handleUpdate, { passive: true })
    window.addEventListener('resize', handleUpdate, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleUpdate)
      window.removeEventListener('resize', handleUpdate)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isActive, currentStepId, updatePosition])

  if (!currentStepData) return null

  const isLastStep = currentStepIndex === totalSteps - 1
  const isFirstStep = currentStepIndex === 0

  return (
    <div
      ref={popoverRef}
      className="w-80 transition-all duration-300 ease-out"
      style={popoverStyle}
    >
      <Card className="border-2 border-primary/20 backdrop-blur-xs shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold">
                {currentStepIndex + 1}
              </div>
              <CardTitle className="text-lg">{currentStepData.title}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={stopTour}
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CardDescription className="text-sm leading-relaxed mb-4">
            {currentStepData.content}
          </CardDescription>
          <div className="flex items-center justify-between">
            <div className="flex gap-2 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={stopTour}
                className="text-muted-foreground hover:text-foreground"
              >
                Skip Tour
              </Button>
              {!isFirstStep && (
                <Button variant="outline" size="sm" onClick={prevStep}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
              <Button size="sm" onClick={nextStep}>
                {isLastStep ? 'Finish' : 'Next'}
                {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const TourProvider: React.FC<TourProviderProps> = ({
  children,
  autoStart = false,
  ranOnce = true,
  storageKey = 'rigidui-tour-completed',
  shouldStart = true,
  onTourComplete,
  onTourSkip,
  highlightPadding = 8,
  overlayClassName = 'bg-black/30 backdrop-blur-xs'
}) => {
  const [steps, setSteps] = useState<Map<string, TourStepConfig & { element: HTMLElement }>>(new Map());
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeSteps, setActiveSteps] = useState<Array<TourStepConfig & { element: HTMLElement }>>([]);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);

  const registerStep = useCallback((stepConfig: TourStepConfig, element: HTMLElement) => {
    setSteps(prev => {
      const newSteps = new Map(prev);
      newSteps.set(stepConfig.id, { ...stepConfig, element });
      return newSteps;
    });
  }, []);

  const unregisterStep = useCallback((id: string) => {
    setSteps(prev => {
      const newSteps = new Map(prev);
      newSteps.delete(id);
      return newSteps;
    });
  }, []);

  useEffect(() => {
    if (autoStart && !hasAutoStarted && steps.size > 0 && shouldStart) {
      const tourCompleted = ranOnce ? localStorage.getItem(storageKey) === 'true' : false;

      if (!tourCompleted) {
        const timer = setTimeout(() => {
          const filteredSteps = Array.from(steps.values())
            .sort((a, b) => a.order - b.order);

          if (filteredSteps.length > 0) {
            setActiveSteps(filteredSteps);
            setCurrentStep(0);
            setIsActive(true);
          }
          setHasAutoStarted(true);
        }, 500);
        return () => clearTimeout(timer);
      } else {
        setHasAutoStarted(true);
      }
    }
  }, [autoStart, hasAutoStarted, steps, ranOnce, storageKey, shouldStart]);

  const startTour = useCallback(() => {
    const filteredSteps = Array.from(steps.values())
      .sort((a, b) => a.order - b.order)

    if (filteredSteps.length > 0) {
      setActiveSteps(filteredSteps)
      setCurrentStep(0)
      setIsActive(true)
    }
  }, [steps])

  const stopTour = useCallback((completed = false) => {
    const wasActive = isActive

    setIsActive(false)
    setCurrentStep(0)
    setActiveSteps([])

    if (wasActive) {
      if (completed) {
        if (ranOnce) {
          localStorage.setItem(storageKey, 'true')
        }
        onTourComplete?.()
        window.dispatchEvent(new CustomEvent('tourCompleted', { detail: { storageKey } }))
      } else if (!completed) {
        onTourSkip?.()
      }
    }
  }, [isActive, ranOnce, storageKey, onTourComplete, onTourSkip])

  const nextStep = useCallback(() => {
    if (currentStep < activeSteps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      stopTour(true)
    }
  }, [currentStep, activeSteps.length, stopTour])

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const resetTourCompletion = useCallback(() => {
    if (ranOnce) {
      localStorage.removeItem(storageKey)
      setHasAutoStarted(false)
      window.dispatchEvent(new CustomEvent('tourReset', { detail: { storageKey } }))
    }
  }, [ranOnce, storageKey])

  const contextValue = useMemo(() => ({
    registerStep,
    unregisterStep,
    startTour,
    stopTour: () => stopTour(false),
    nextStep,
    prevStep,
    resetTourCompletion,
    isActive,
    currentStepId: activeSteps[currentStep]?.id || null,
    currentStepIndex: currentStep,
    totalSteps: activeSteps.length,
    highlightPadding,
    overlayClassName
  }), [
    registerStep,
    unregisterStep,
    startTour,
    stopTour,
    nextStep,
    prevStep,
    resetTourCompletion,
    isActive,
    activeSteps,
    currentStep,
    highlightPadding,
    overlayClassName
  ])

  return (
    <TourContext.Provider value={contextValue}>
      {children}
      <TourOverlay />
      <GlobalTourPopover />
    </TourContext.Provider>
  )
}

const TourStepComponent: React.FC<{
  id: string
  title: string
  content: string
  order: number
  position?: 'top' | 'bottom' | 'left' | 'right'
  children: ReactNode
}> = ({ children, id, title, content, order, position }) => {
  const { registerStep, unregisterStep, isActive, currentStepId } = useTour()
  const elementRef = useRef<HTMLDivElement>(null)

  const stepConfig = useMemo(() => ({ id, title, content, order, position }), [id, title, content, order, position])

  useEffect(() => {
    if (elementRef.current) {
      registerStep(stepConfig, elementRef.current)
    }
    return () => unregisterStep(id)
  }, [stepConfig, registerStep, unregisterStep, id])

  const isCurrentStep = isActive && currentStepId === id

  return (
    <div
      ref={elementRef}
      data-tour-step={id}
      data-tour-config={JSON.stringify(stepConfig)}
      className={isCurrentStep ? "relative z-10002" : "relative"}
    >
      {children}
    </div>
  )
}

export const TourStep = React.memo(TourStepComponent)

export const TourTrigger: React.FC<{
  children: ReactNode
  className?: string
  hideAfterComplete?: boolean
  storageKey?: string
}> = ({ children, className, hideAfterComplete = false, storageKey = 'rigidui-tour-completed' }) => {
  const { startTour } = useTour()
  const [tourCompleted, setTourCompleted] = useState(() =>
    hideAfterComplete ? localStorage.getItem(storageKey) === 'true' : false
  )

  useEffect(() => {
    if (!hideAfterComplete) return

    const handleTourComplete = (event: Event) => {
      const customEvent = event as CustomEvent
      const eventStorageKey = customEvent.detail?.storageKey || 'rigidui-tour-completed'
      if (eventStorageKey === storageKey) {
        localStorage.setItem(storageKey, 'true')
        setTourCompleted(true)
      }
    }

    const handleTourReset = (event: Event) => {
      const customEvent = event as CustomEvent
      const eventStorageKey = customEvent.detail?.storageKey || 'rigidui-tour-completed'
      if (eventStorageKey === storageKey) {
        setTourCompleted(false)
      }
    }

    window.addEventListener('tourCompleted', handleTourComplete)
    window.addEventListener('tourReset', handleTourReset)

    return () => {
      window.removeEventListener('tourCompleted', handleTourComplete)
      window.removeEventListener('tourReset', handleTourReset)
    }
  }, [hideAfterComplete, storageKey])

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    startTour()
  }, [startTour])

  if (hideAfterComplete && tourCompleted) return null

  return (
    <div onClick={handleClick} className={className}>
      {children}
    </div>
  )
}

export default TourProvider;
