
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Check on initial load
    checkMobile()
    
    // Add event listener for resize
    window.addEventListener("resize", checkMobile)
    
    // Load saved setting if available
    const savedMobileSetting = localStorage.getItem('preferMobileView')
    if (savedMobileSetting) {
      setIsMobile(savedMobileSetting === 'true')
    }
    
    // Clean up
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const setMobilePreference = (prefer: boolean) => {
    localStorage.setItem('preferMobileView', prefer.toString())
    setIsMobile(prefer)
  }

  return !!isMobile
}
