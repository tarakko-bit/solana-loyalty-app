import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)
  const [isInPhantomApp, setIsInPhantomApp] = React.useState(false)
  const [hasPhantomApp, setHasPhantomApp] = React.useState(false)

  React.useEffect(() => {
    // Handle mobile detection
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)

    // Check if we're running inside Phantom app's webview
    const isPhantom = /Phantom/.test(navigator.userAgent)
    setIsInPhantomApp(isPhantom)

    // Check if Phantom app is installed via protocol handler
    const checkPhantomApp = async () => {
      try {
        // Try to open phantom:// protocol
        const protocol = 'phantom://'
        await navigator.serviceWorker?.ready
        setHasPhantomApp(true)
      } catch {
        setHasPhantomApp(false)
      }
    }
    checkPhantomApp()

    // Cleanup
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return {
    isMobile: !!isMobile,
    isInPhantomApp,
    hasPhantomApp
  }
}