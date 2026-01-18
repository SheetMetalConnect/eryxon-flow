import { useEffect, useRef, useCallback, useState } from "react";

export interface UseInfiniteScrollOptions {
  /** Threshold in pixels from the bottom to trigger loading more */
  threshold?: number;
  /** Whether there is more data to load */
  hasMore: boolean;
  /** Whether currently loading */
  isLoading: boolean;
  /** Callback to load more data */
  onLoadMore: () => void;
  /** Root element to observe (defaults to viewport) */
  root?: Element | null;
  /** Root margin for intersection observer */
  rootMargin?: string;
}

export interface UseInfiniteScrollReturn {
  /** Ref to attach to the sentinel element at the bottom of the list */
  sentinelRef: React.RefCallback<Element>;
  /** Ref to attach to the scroll container */
  containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * useInfiniteScroll - Hook for implementing infinite scroll with intersection observer
 */
export function useInfiniteScroll({
  threshold = 100,
  hasMore,
  isLoading,
  onLoadMore,
  root = null,
  rootMargin = "0px",
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sentinelRef = useCallback(
    (node: Element | null) => {
      // Disconnect previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!node || !hasMore || isLoading) return;

      // Create new observer
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting && hasMore && !isLoading) {
            onLoadMore();
          }
        },
        {
          root: root || containerRef.current,
          rootMargin: `${threshold}px`,
          threshold: 0,
        }
      );

      observerRef.current.observe(node);
    },
    [hasMore, isLoading, onLoadMore, root, rootMargin, threshold]
  );

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    sentinelRef,
    containerRef,
  };
}

export interface UseScrollPositionOptions {
  /** Debounce delay for scroll events */
  debounce?: number;
  /** Element to track scroll position of */
  element?: HTMLElement | null;
}

/**
 * useScrollPosition - Track scroll position of an element or window
 */
export function useScrollPosition({
  debounce = 50,
  element = null,
}: UseScrollPositionOptions = {}) {
  const [scrollPosition, setScrollPosition] = useState({
    scrollTop: 0,
    scrollLeft: 0,
    scrollHeight: 0,
    scrollWidth: 0,
    clientHeight: 0,
    clientWidth: 0,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const target = element || window;

    const handleScroll = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        if (element) {
          setScrollPosition({
            scrollTop: element.scrollTop,
            scrollLeft: element.scrollLeft,
            scrollHeight: element.scrollHeight,
            scrollWidth: element.scrollWidth,
            clientHeight: element.clientHeight,
            clientWidth: element.clientWidth,
          });
        } else {
          setScrollPosition({
            scrollTop: window.scrollY,
            scrollLeft: window.scrollX,
            scrollHeight: document.documentElement.scrollHeight,
            scrollWidth: document.documentElement.scrollWidth,
            clientHeight: window.innerHeight,
            clientWidth: window.innerWidth,
          });
        }
      }, debounce);
    };

    // Initial position
    handleScroll();

    target.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      target.removeEventListener("scroll", handleScroll);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [element, debounce]);

  return {
    ...scrollPosition,
    isAtTop: scrollPosition.scrollTop === 0,
    isAtBottom:
      scrollPosition.scrollTop + scrollPosition.clientHeight >=
      scrollPosition.scrollHeight - 10,
    scrollPercentage:
      scrollPosition.scrollHeight > scrollPosition.clientHeight
        ? (scrollPosition.scrollTop /
            (scrollPosition.scrollHeight - scrollPosition.clientHeight)) *
          100
        : 0,
  };
}
