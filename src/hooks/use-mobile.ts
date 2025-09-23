import { useState, useEffect } from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Initial check
    checkDevice()

    window.addEventListener("resize", checkDevice)
    return () => {
      window.removeEventListener("resize", checkDevice)
    }
  }, [])

  return isMobile
}
