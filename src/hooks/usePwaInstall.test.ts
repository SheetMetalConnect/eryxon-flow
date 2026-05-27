import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { usePwaInstall, type PwaInstallState } from "./usePwaInstall"

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
}

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, "userAgent", {
    value: ua,
    configurable: true,
    writable: true,
  })
}

describe("usePwaInstall", () => {
  let originalAddEventListener: typeof window.addEventListener
  let originalRemoveEventListener: typeof window.removeEventListener

  beforeEach(() => {
    vi.useFakeTimers()
    originalAddEventListener = window.addEventListener
    originalRemoveEventListener = window.removeEventListener
    // reset localStorage
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    window.addEventListener = originalAddEventListener
    window.removeEventListener = originalRemoveEventListener
    vi.restoreAllMocks()
  })

  it("starts in loading state", () => {
    mockMatchMedia(false)
    // Clear Capacitor to prevent native detection
    window.Capacitor = undefined as never
    setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36")

    const { result } = renderHook(() => usePwaInstall())
    expect(result.current.state).toBe("loading")
    expect(result.current.canInstall).toBe(false)
    expect(result.current.isInstalled).toBe(false)
    expect(result.current.install).toBeNull()
  })

  it("detects already installed via display-mode: standalone", () => {
    mockMatchMedia(true)
    window.Capacitor = undefined as never

    const { result } = renderHook(() => usePwaInstall())
    expect(result.current.state).toBe("installed")
    expect(result.current.isInstalled).toBe(true)
  })

  it("detects already installed via navigator.standalone", () => {
    mockMatchMedia(false)
    window.Capacitor = undefined as never
    Object.defineProperty(navigator, "standalone", {
      value: true,
      configurable: true,
    })

    const { result } = renderHook(() => usePwaInstall())
    expect(result.current.state).toBe("installed")
    expect(result.current.isInstalled).toBe(true)
  })

  it("falls back to unsupported after timeout", () => {
    mockMatchMedia(false)
    window.Capacitor = undefined as never
    setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0")

    const { result } = renderHook(() => usePwaInstall())

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.state).toBe("unsupported")
    expect(result.current.canInstall).toBe(false)
    expect(result.current.isInstalled).toBe(false)
  })

  it("transitions to installable on beforeinstallprompt event", () => {
    mockMatchMedia(false)
    window.Capacitor = undefined as never

    const { result } = renderHook(() => usePwaInstall())

    act(() => {
      const event = new Event("beforeinstallprompt") as Event & {
        platforms: string[]
        userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
        prompt(): Promise<void>
      }
      event.platforms = ["web", "android"]
      event.prompt = vi.fn()
      event.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" })
      window.dispatchEvent(event)
    })

    expect(result.current.state).toBe("installable")
    expect(result.current.canInstall).toBe(true)
    expect(result.current.install).not.toBeNull()
  })

  it("detects manual-ios for iPhone Safari", () => {
    mockMatchMedia(false)
    window.Capacitor = undefined as never
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")

    const { result } = renderHook(() => usePwaInstall())

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.state).toBe("manual-ios")
    expect(result.current.canInstall).toBe(true)
  })

  it("detects manual-ipad for iPad Safari", () => {
    mockMatchMedia(false)
    window.Capacitor = undefined as never
    // iPadOS 13+ masquerades as Mac
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15")
    Object.defineProperty(navigator, "maxTouchPoints", {
      value: 5,
      configurable: true,
    })

    const { result } = renderHook(() => usePwaInstall())

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.state).toBe("manual-ipad")
    expect(result.current.canInstall).toBe(true)
  })

  it("transitions to installed on appinstalled event", () => {
    mockMatchMedia(false)
    window.Capacitor = undefined as never

    const { result } = renderHook(() => usePwaInstall())

    act(() => {
      const event = new Event("beforeinstallprompt") as Event & {
        platforms: string[]
        userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
        prompt(): Promise<void>
      }
      event.platforms = ["web"]
      event.prompt = vi.fn()
      event.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" })
      window.dispatchEvent(event)
    })

    act(() => {
      window.dispatchEvent(new Event("appinstalled"))
    })

    expect(result.current.state).toBe("installed")
    expect(result.current.isInstalled).toBe(true)
  })

  it("calling install invokes the prompt and returns the outcome", async () => {
    mockMatchMedia(false)
    window.Capacitor = undefined as never

    const { result } = renderHook(() => usePwaInstall())

    const userChoice = { outcome: "accepted" as const, platform: "web" }
    const prompt = vi.fn()

    act(() => {
      const event = new Event("beforeinstallprompt") as Event & {
        platforms: string[]
        userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
        prompt(): Promise<void>
      }
      event.platforms = ["web"]
      event.prompt = prompt
      event.userChoice = Promise.resolve(userChoice)
      window.dispatchEvent(event)
    })

    expect(result.current.install).not.toBeNull()

    let outcome: string | null = null
    await act(async () => {
      outcome = await result.current.install!()
    })

    expect(prompt).toHaveBeenCalled()
    expect(outcome).toBe("accepted")
    expect(result.current.isInstalled).toBe(true)
    expect(result.current.install).toBeNull()
  })

  it("remembers dismissed preference in localStorage", () => {
    mockMatchMedia(false)
    window.Capacitor = undefined as never

    localStorage.setItem("eryxon:pwa-install-dismissed", "true")

    const { result } = renderHook(() => usePwaInstall())
    expect(result.current.dismissedBefore).toBe(true)
  })

  it("cleans up event listeners on unmount", () => {
    mockMatchMedia(false)
    window.Capacitor = undefined as never

    const beforeInstallSpy = vi.spyOn(window, "removeEventListener")
    const { unmount } = renderHook(() => usePwaInstall())
    unmount()

    expect(beforeInstallSpy).toHaveBeenCalledWith("beforeinstallprompt", expect.any(Function))
    expect(beforeInstallSpy).toHaveBeenCalledWith("appinstalled", expect.any(Function))
  })
})
