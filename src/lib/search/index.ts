/**
 * Search Module
 *
 * Provides a modular, configurable global search system.
 *
 * Usage:
 *   import { searchConfigs, createEntitySearch } from '@/lib/search';
 *
 * Architecture:
 *   - types.ts: Type definitions (ISP - small, focused interfaces)
 *   - searchConfigs.ts: Entity configurations (OCP - extend via config)
 *   - createEntitySearch.ts: Factory function (SRP - single purpose)
 */

// Types
export type {
  SearchResultType,
  SearchResult,
  SearchResultMetadata,
  SearchFilters,
  EntitySearchConfig,
  EntitySearchFn,
} from "./types";

// Configurations
export {
  searchConfigs,
  jobSearchConfig,
  partSearchConfig,
  operationSearchConfig,
  userSearchConfig,
  issueSearchConfig,
  resourceSearchConfig,
  materialSearchConfig,
} from "./searchConfigs";

// Factory
export { createEntitySearch, createSearchFunctions } from "./createEntitySearch";
