import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Allowed URL protocols for safe navigation.
 * Prevents XSS attacks via javascript: and other dangerous protocols.
 */
const SAFE_URL_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:', 'blob:'];

/**
 * Validates and sanitizes a URL to prevent XSS attacks.
 * Returns undefined for URLs with dangerous protocols (e.g., javascript:).
 *
 * @param url - The URL to sanitize
 * @returns The original URL if safe, undefined otherwise
 */
export function sanitizeUrl(url: string | null | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    // Handle protocol-relative URLs
    const urlToCheck = url.startsWith('//') ? `https:${url}` : url;
    const parsed = new URL(urlToCheck);

    if (SAFE_URL_PROTOCOLS.includes(parsed.protocol)) {
      return url;
    }

    // Unsafe protocol detected
    console.warn(`Blocked unsafe URL protocol: ${parsed.protocol}`);
    return undefined;
  } catch {
    // If URL parsing fails, check for dangerous patterns
    const trimmed = url.trim().toLowerCase();
    if (trimmed.startsWith('javascript:') ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('vbscript:')) {
      console.warn('Blocked potentially dangerous URL');
      return undefined;
    }
    // Allow relative URLs and other non-parseable but safe URLs
    return url;
  }
}

/**
 * Safely opens a URL in a new tab after sanitization.
 * Does nothing if the URL is unsafe.
 *
 * @param url - The URL to open
 */
export function safeOpenUrl(url: string | null | undefined): void {
  const safeUrl = sanitizeUrl(url);
  if (safeUrl) {
    window.open(safeUrl, '_blank', 'noopener,noreferrer');
  }
}
