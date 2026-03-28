import { useCallback, useEffect, useRef, useState } from "react";

interface UseResizablePanelOptions {
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

export function useResizablePanel({
  initialWidth = 70,
  minWidth = 40,
  maxWidth = 85,
}: UseResizablePanelOptions = {}) {
  const [collapsed, setCollapsed] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(initialWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPanelWidth(Math.min(Math.max(newWidth, minWidth), maxWidth));
    },
    [isDragging, minWidth, maxWidth],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((touch.clientX - rect.left) / rect.width) * 100;
      setLeftPanelWidth(Math.min(Math.max(newWidth, minWidth), maxWidth));
    },
    [isDragging, minWidth, maxWidth],
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  return {
    containerRef,
    collapsed,
    setCollapsed,
    leftPanelWidth,
    isDragging,
    handleMouseDown,
    handleTouchStart,
  };
}
