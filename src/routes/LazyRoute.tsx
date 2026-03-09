import React, { Suspense } from "react";
import { ErrorBoundary, PageLoadingFallback } from "@/components/ErrorBoundary";

/**
 * Wraps a lazy-loaded page with Suspense and ErrorBoundary
 */
export function LazyRoute({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoadingFallback />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}
