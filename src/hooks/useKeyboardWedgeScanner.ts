import { useEffect, useRef } from "react";

interface UseKeyboardWedgeScannerOptions {
  enabled?: boolean;
  idleMs?: number;
  onScan: (token: string) => void | Promise<void>;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select"
  );
}

export function useKeyboardWedgeScanner({
  enabled = true,
  idleMs = 250,
  onScan,
}: UseKeyboardWedgeScannerOptions) {
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    let buffer = "";
    let timeoutId: number | null = null;

    const clearBuffer = () => {
      buffer = "";
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const scheduleReset = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(clearBuffer, idleMs);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      if (isEditableTarget(event.target)) {
        clearBuffer();
        return;
      }

      if (event.key === "Enter") {
        const scannedToken = buffer.trim();
        clearBuffer();

        if (!scannedToken) return;
        event.preventDefault();
        void onScanRef.current(scannedToken);
        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      buffer += event.key;
      scheduleReset();
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      clearBuffer();
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [enabled, idleMs]);
}
