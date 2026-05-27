import { useEffect, useState, useCallback } from "react"
import { isNativeApp } from "@/native"

// from @types/dom-screen-wake-lock, not bundled in tsconfig
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
  prompt(): Promise<void>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
    appinstalled: Event
  }
  interface Navigator {
    standalone?: boolean
  }
}

export type PwaInstallState =
  | "loading"
  | "installable"
  | "manual-ios"
  | "manual-ipad"
  | "unsupported"
  | "installed"

export interface UsePwaInstallResult {
  state: PwaInstallState
  canInstall: boolean
  install: (() => Promise<"accepted" | "dismissed">) | null
  isInstalled: boolean
  dismissedBefore: boolean
}

function detectAlreadyInstalled(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  )
}

function detectManualIOS(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent || ""
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) &&
      typeof navigator.maxTouchPoints === "number" &&
      navigator.maxTouchPoints > 1)
  const isSafari =
    /Safari/.test(ua) && !/Chrome|CriOS|EdgiOS|FxiOS/.test(ua)
  return isIOS && isSafari && !detectAlreadyInstalled()
}

function detectManualIPad(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent || ""
  const isIPad =
    /iPad/.test(ua) ||
    (/Macintosh/.test(ua) &&
      typeof navigator.maxTouchPoints === "number" &&
      navigator.maxTouchPoints > 1)
  return isIPad && !detectAlreadyInstalled()
}

function getDismissedKey(): string {
  return "eryxon:pwa-install-dismissed"
}

export function usePwaInstall(): UsePwaInstallResult {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [state, setState] = useState<PwaInstallState>("loading")

  const isInstalled = detectAlreadyInstalled()
  const [dismissedBefore, setDismissedBefore] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem(getDismissedKey()) === "true"
  })

  useEffect(() => {
    if (isNativeApp()) {
      setState("unsupported")
      return
    }

    if (detectAlreadyInstalled()) {
      setState("installed")
      return
    }

    const onBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setState("installable")
    }

    const onAppInstalled = () => {
      setDeferredPrompt(null)
      setState("installed")
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", onAppInstalled)

    const standaloneQuery = window.matchMedia("(display-mode: standalone)")
    const onStandaloneChange = (e: MediaQueryListEvent) => {
      if (e.matches) setState("installed")
    }
    standaloneQuery.addEventListener("change", onStandaloneChange)

    // If the event hasn't fired after a short delay, fall back to manual
    // detection for platforms that don't fire beforeinstallprompt at all
    // (iOS Safari, older browsers).
    const timeout = setTimeout(() => {
      setState((prev) => {
        if (prev !== "loading") return prev
        if (detectManualIPad()) return "manual-ipad"
        if (detectManualIOS()) return "manual-ios"
        return "unsupported"
      })
    }, 3000)

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onAppInstalled)
      standaloneQuery.removeEventListener("change", onStandaloneChange)
      clearTimeout(timeout)
    }
  }, [])

  const install = useCallback(async (): Promise<"accepted" | "dismissed"> => {
    if (!deferredPrompt) throw new Error("No install prompt available")
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    if (result.outcome === "accepted") {
      setState("installed")
      // clear dismissed flag on successful install
      localStorage.removeItem(getDismissedKey())
    } else {
      localStorage.setItem(getDismissedKey(), "true")
      setDismissedBefore(true)
    }
    setDeferredPrompt(null)
    return result.outcome
  }, [deferredPrompt])

  const dismissInstall = useCallback(() => {
    setDismissedBefore(true)
    localStorage.setItem(getDismissedKey(), "true")
  }, [])

  return {
    state,
    canInstall:
      state === "installable" ||
      state === "manual-ios" ||
      state === "manual-ipad",
    install: state === "installable" ? install : null,
    isInstalled: state === "installed",
    dismissedBefore,
  }
}
