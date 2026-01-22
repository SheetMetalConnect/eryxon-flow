/**
 * Tests for Supabase types module
 * Verifies that the modular type structure exports correctly
 */

import { describe, it, expect } from 'vitest'
import { EnumConstants, Constants } from './types/index'
import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  DatabaseEnums,
  Json,
} from './types/index'

describe('Supabase Types Module', () => {
  describe('EnumConstants', () => {
    it('exports app_role enum values', () => {
      expect(EnumConstants.app_role).toEqual(['operator', 'admin'])
    })

    it('exports job_status enum values', () => {
      expect(EnumConstants.job_status).toEqual([
        'not_started',
        'in_progress',
        'completed',
        'on_hold',
      ])
    })

    it('exports task_status enum values', () => {
      expect(EnumConstants.task_status).toEqual([
        'not_started',
        'in_progress',
        'completed',
        'on_hold',
      ])
    })

    it('exports issue_severity enum values', () => {
      expect(EnumConstants.issue_severity).toEqual([
        'low',
        'medium',
        'high',
        'critical',
      ])
    })

    it('exports issue_status enum values', () => {
      expect(EnumConstants.issue_status).toEqual([
        'pending',
        'approved',
        'rejected',
        'closed',
      ])
    })

    it('exports subscription_plan enum values', () => {
      expect(EnumConstants.subscription_plan).toEqual([
        'free',
        'pro',
        'premium',
        'enterprise',
      ])
    })

    it('exports subscription_status enum values', () => {
      expect(EnumConstants.subscription_status).toEqual([
        'active',
        'cancelled',
        'suspended',
        'trial',
      ])
    })

    it('exports integration_category enum values', () => {
      expect(EnumConstants.integration_category).toEqual([
        'erp',
        'accounting',
        'crm',
        'inventory',
        'shipping',
        'analytics',
        'other',
      ])
    })

    it('exports all expected enum keys', () => {
      const expectedKeys = [
        'app_role',
        'assignment_status',
        'integration_category',
        'integration_status',
        'invoice_payment_status',
        'issue_severity',
        'issue_status',
        'issue_type',
        'job_status',
        'ncr_category',
        'ncr_disposition',
        'payment_provider',
        'payment_transaction_status',
        'payment_transaction_type',
        'subscription_plan',
        'subscription_status',
        'task_status',
        'waitlist_status',
      ]

      expect(Object.keys(EnumConstants).sort()).toEqual(expectedKeys.sort())
    })
  })

  describe('Constants backward compatibility', () => {
    it('exports Constants.public.Enums with same values as EnumConstants', () => {
      expect(Constants.public.Enums).toEqual(EnumConstants)
    })

    it('allows accessing enums via Constants.public.Enums path', () => {
      expect(Constants.public.Enums.app_role).toEqual(['operator', 'admin'])
      expect(Constants.public.Enums.job_status).toContain('in_progress')
    })
  })

  describe('Type exports', () => {
    it('Database type is exportable', () => {
      // This is a compile-time check - if it compiles, the type is correctly exported
      const checkDatabase = (_db: Database) => {}
      expect(checkDatabase).toBeDefined()
    })

    it('Tables helper type works', () => {
      // Compile-time check for Tables helper
      const checkTables = (_job: Tables<'jobs'>) => {}
      expect(checkTables).toBeDefined()
    })

    it('TablesInsert helper type works', () => {
      // Compile-time check for TablesInsert helper
      const checkInsert = (_job: TablesInsert<'jobs'>) => {}
      expect(checkInsert).toBeDefined()
    })

    it('TablesUpdate helper type works', () => {
      // Compile-time check for TablesUpdate helper
      const checkUpdate = (_job: TablesUpdate<'jobs'>) => {}
      expect(checkUpdate).toBeDefined()
    })

    it('Enums helper type works', () => {
      // Compile-time check for Enums helper
      const checkEnum = (_role: Enums<'app_role'>) => {}
      expect(checkEnum).toBeDefined()
    })

    it('DatabaseEnums type is exportable', () => {
      // Compile-time check
      const checkEnums = (_enums: DatabaseEnums) => {}
      expect(checkEnums).toBeDefined()
    })

    it('Json type is exportable', () => {
      // Compile-time check
      const checkJson = (_json: Json) => {}
      expect(checkJson).toBeDefined()
    })
  })

  describe('Enum value validation', () => {
    it('validates app_role values are correct type', () => {
      const roles = EnumConstants.app_role
      roles.forEach((role) => {
        expect(['operator', 'admin']).toContain(role)
      })
    })

    it('validates subscription_plan values are correct type', () => {
      const plans = EnumConstants.subscription_plan
      plans.forEach((plan) => {
        expect(['free', 'pro', 'premium', 'enterprise']).toContain(plan)
      })
    })

    it('validates issue_severity has correct order', () => {
      // Severity should be in increasing order
      const severities = EnumConstants.issue_severity
      expect(severities[0]).toBe('low')
      expect(severities[severities.length - 1]).toBe('critical')
    })
  })

  describe('Runtime enum usage', () => {
    it('can iterate over enum values', () => {
      const statuses: string[] = []
      for (const status of EnumConstants.job_status) {
        statuses.push(status)
      }
      expect(statuses).toHaveLength(4)
    })

    it('can check if value is valid enum member', () => {
      const isValidJobStatus = (status: string): boolean => {
        return (EnumConstants.job_status as readonly string[]).includes(status)
      }

      expect(isValidJobStatus('in_progress')).toBe(true)
      expect(isValidJobStatus('invalid_status')).toBe(false)
    })

    it('can get enum length', () => {
      expect(EnumConstants.app_role.length).toBe(2)
      expect(EnumConstants.job_status.length).toBe(4)
      expect(EnumConstants.issue_severity.length).toBe(4)
    })
  })
})
