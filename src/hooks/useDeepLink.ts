import { useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { ROUTES } from "@/routes";

/**
 * Hook for managing deep link URL parameters for entity modals.
 * Allows direct linking to jobs, parts, and operations via URL params.
 *
 * Usage:
 * const { selectedId, setSelectedId, clearSelection, createDeepLink } = useDeepLink("id");
 *
 * This will read the `?id=xxx` param from URL and sync it with component state.
 */
export function useDeepLink(paramName: string = "id") {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the ID from URL params
  const selectedId = searchParams.get(paramName);

  // Set the selected ID and update URL
  const setSelectedId = useCallback((id: string | null) => {
    const newParams = new URLSearchParams(searchParams);

    if (id) {
      newParams.set(paramName, id);
    } else {
      newParams.delete(paramName);
    }

    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams, paramName]);

  // Clear selection and remove from URL
  const clearSelection = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(paramName);
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams, paramName]);

  // Create a deep link URL for the current page with a specific ID
  const createDeepLink = useCallback((id: string): string => {
    const params = new URLSearchParams(searchParams);
    params.set(paramName, id);
    return `${location.pathname}?${params.toString()}`;
  }, [searchParams, location.pathname, paramName]);

  return {
    selectedId,
    setSelectedId,
    clearSelection,
    createDeepLink,
  };
}

/**
 * Type for entity routing - jobs, parts, or operations
 */
export type EntityType = "job" | "part" | "operation";

/**
 * Deep link URL builders for different entity types.
 * Use these to create shareable links to specific entities.
 */
export const deepLinkBuilders = {
  job: (jobId: string, additionalParams?: Record<string, string>): string => {
    const params = new URLSearchParams({ id: jobId, ...additionalParams });
    return `${ROUTES.ADMIN.JOBS}?${params.toString()}`;
  },

  part: (partId: string, additionalParams?: Record<string, string>): string => {
    const params = new URLSearchParams({ id: partId, ...additionalParams });
    return `${ROUTES.ADMIN.PARTS}?${params.toString()}`;
  },

  operation: (operationId: string, additionalParams?: Record<string, string>): string => {
    const params = new URLSearchParams({ id: operationId, ...additionalParams });
    return `${ROUTES.ADMIN.OPERATIONS}?${params.toString()}`;
  },

  // Convenience method that returns the correct URL based on entity type
  entity: (type: EntityType, id: string, additionalParams?: Record<string, string>): string => {
    switch (type) {
      case "job":
        return deepLinkBuilders.job(id, additionalParams);
      case "part":
        return deepLinkBuilders.part(id, additionalParams);
      case "operation":
        return deepLinkBuilders.operation(id, additionalParams);
    }
  },
};

/**
 * Hook that provides navigation functions for deep linking to entities.
 * Use this when you need to navigate to a specific job, part, or operation from another page.
 */
export function useEntityNavigation() {
  const navigate = useNavigate();

  const navigateToJob = useCallback((jobId: string, additionalParams?: Record<string, string>) => {
    navigate(deepLinkBuilders.job(jobId, additionalParams));
  }, [navigate]);

  const navigateToJobWithPart = useCallback((jobId: string, partId: string) => {
    navigate(deepLinkBuilders.job(jobId, { partId }));
  }, [navigate]);

  const navigateToJobWithOperation = useCallback((jobId: string, operationId: string) => {
    navigate(deepLinkBuilders.job(jobId, { operationId }));
  }, [navigate]);

  const navigateToPart = useCallback((partId: string, additionalParams?: Record<string, string>) => {
    navigate(deepLinkBuilders.part(partId, additionalParams));
  }, [navigate]);

  const navigateToOperation = useCallback((operationId: string, additionalParams?: Record<string, string>) => {
    navigate(deepLinkBuilders.operation(operationId, additionalParams));
  }, [navigate]);

  const navigateToEntity = useCallback((type: EntityType, id: string, additionalParams?: Record<string, string>) => {
    navigate(deepLinkBuilders.entity(type, id, additionalParams));
  }, [navigate]);

  return {
    navigateToJob,
    navigateToJobWithPart,
    navigateToJobWithOperation,
    navigateToPart,
    navigateToOperation,
    navigateToEntity,
    // URL builders for when you just need the URL string
    buildJobUrl: deepLinkBuilders.job,
    buildPartUrl: deepLinkBuilders.part,
    buildOperationUrl: deepLinkBuilders.operation,
    buildEntityUrl: deepLinkBuilders.entity,
  };
}

export default useDeepLink;
