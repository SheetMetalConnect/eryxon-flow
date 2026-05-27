import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  readTerminalCache,
  isCacheValid,
  updateTerminalCache,
  clearTerminalCache,
  cacheFromProfile,
} from "../terminalCache";

const STORAGE_KEY = "eryxon_terminal_cache";

beforeEach(() => {
  localStorage.clear();
});

describe("terminalCache", () => {
  describe("write/read round-trip", () => {
    it("returns null when nothing is stored", () => {
      expect(readTerminalCache()).toBeNull();
    });

    it("persists and retrieves a full state", () => {
      const state = {
        profile: {
          id: "u1",
          tenant_id: "t1",
          username: "op1",
          full_name: "Operator One",
          email: "op1@test.com",
          role: "operator" as const,
          active: true,
          is_machine: false,
          is_root_admin: false,
          onboarding_completed: true,
          onboarding_step: 0,
        },
        tenant: {
          id: "t1",
          name: "Test Tenant",
          company_name: null,
          plan: "pro" as const,
          status: "active" as const,
          trial_ends_at: null,
          working_days_mask: null,
          whitelabel_enabled: false,
          whitelabel_logo_url: null,
          whitelabel_app_name: null,
          whitelabel_primary_color: null,
          whitelabel_favicon_url: null,
        },
        activeOperator: null,
        selectedCellId: null,
        cachedAt: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      const result = readTerminalCache();
      expect(result).not.toBeNull();
      expect(result!.profile?.id).toBe("u1");
      expect(result!.tenant?.id).toBe("t1");
    });

    it("returns null for malformed JSON", () => {
      localStorage.setItem(STORAGE_KEY, "not-json");
      expect(readTerminalCache()).toBeNull();
    });

    it("returns null for JSON without cachedAt", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile: null }));
      expect(readTerminalCache()).toBeNull();
    });
  });

  describe("isCacheValid", () => {
    it("returns false for null", () => {
      expect(isCacheValid(null)).toBe(false);
    });

    it("returns false when cachedAt is missing", () => {
      expect(isCacheValid({} as unknown as Parameters<typeof isCacheValid>[0])).toBe(false);
    });

    it("returns false when cache is expired (older than 24h)", () => {
      const state = {
        profile: { id: "u1", tenant_id: "t1" } as unknown as Parameters<typeof isCacheValid>[0],
        cachedAt: Date.now() - 25 * 60 * 60 * 1000,
      };
      expect(isCacheValid(state as Parameters<typeof isCacheValid>[0])).toBe(false);
    });

    it("returns true for a fresh cache with a profile", () => {
      const state = {
        profile: { id: "u1", tenant_id: "t1" } as unknown as Parameters<typeof isCacheValid>[0],
        cachedAt: Date.now(),
      };
      expect(isCacheValid(state as Parameters<typeof isCacheValid>[0])).toBe(true);
    });

    it("returns false for a fresh cache with no profile and no operator", () => {
      const state = {
        profile: null,
        activeOperator: null,
        cachedAt: Date.now(),
      };
      expect(isCacheValid(state)).toBe(false);
    });

    it("returns true when only activeOperator is present", () => {
      const state = {
        profile: null,
        activeOperator: { id: "op1", employee_id: "E1", full_name: "Op One", tenant_id: "t1" },
        cachedAt: Date.now(),
      };
      expect(isCacheValid(state)).toBe(true);
    });
  });

  describe("updateTerminalCache", () => {
    it("creates a new cache entry from scratch", () => {
      updateTerminalCache({ profile: { id: "u1" } as unknown as Parameters<typeof isCacheValid>[0] });
      const result = readTerminalCache();
      expect(result).not.toBeNull();
      expect(result!.profile).not.toBeNull();
      expect(result!.cachedAt).toBeGreaterThan(0);
    });

    it("merges partial updates", () => {
      updateTerminalCache({
        profile: { id: "u1", tenant_id: "t1", full_name: "Op One" } as unknown as Parameters<typeof isCacheValid>[0],
      });
      updateTerminalCache({
        activeOperator: { id: "op1", employee_id: "E1", full_name: "Op One", tenant_id: "t1" },
      });

      const result = readTerminalCache();
      expect(result!.profile).not.toBeNull();
      expect(result!.activeOperator).not.toBeNull();
      expect(result!.cachedAt).toBeGreaterThan(0);
    });

    it("overwrites existing fields on update", () => {
      updateTerminalCache({
        profile: { id: "u1", tenant_id: "t1", full_name: "Old Name" } as unknown as Parameters<typeof isCacheValid>[0],
      });
      updateTerminalCache({
        profile: { id: "u1", tenant_id: "t1", full_name: "New Name" } as unknown as Parameters<typeof isCacheValid>[0],
      });

      const result = readTerminalCache();
      expect(result!.profile).not.toBeNull();
    });
  });

  describe("clearTerminalCache", () => {
    it("removes the stored cache", () => {
      updateTerminalCache({ profile: { id: "u1" } as unknown as Parameters<typeof isCacheValid>[0] });
      expect(readTerminalCache()).not.toBeNull();
      clearTerminalCache();
      expect(readTerminalCache()).toBeNull();
    });

    it("does not throw when cache is empty", () => {
      expect(() => clearTerminalCache()).not.toThrow();
    });
  });

  describe("cacheFromProfile", () => {
    it("writes profile and tenant to cache", () => {
      const profile = {
        id: "u1",
        tenant_id: "t1",
        username: "op1",
        full_name: "Op One",
        email: "op@test.com",
        role: "operator" as const,
        active: true,
        is_machine: false,
        is_root_admin: false,
        onboarding_completed: true,
        onboarding_step: 0,
      };

      cacheFromProfile(profile, null);

      const result = readTerminalCache();
      expect(result).not.toBeNull();
      expect(result!.profile?.id).toBe("u1");
      expect(result!.tenant).toBeNull();
    });
  });
});
