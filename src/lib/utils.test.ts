import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('utils', () => {
  describe('cn (classnames utility)', () => {
    it('merges single class string', () => {
      expect(cn('foo')).toBe('foo');
    });

    it('merges multiple class strings', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('handles undefined values', () => {
      expect(cn('foo', undefined, 'bar')).toBe('foo bar');
    });

    it('handles null values', () => {
      expect(cn('foo', null, 'bar')).toBe('foo bar');
    });

    it('handles boolean values', () => {
      expect(cn('foo', false, 'bar')).toBe('foo bar');
      expect(cn('foo', true && 'active', 'bar')).toBe('foo active bar');
    });

    it('handles conditional classes', () => {
      const isActive = true;
      const isDisabled = false;
      expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe(
        'base active'
      );
    });

    it('handles object notation', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });

    it('handles array notation', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('handles mixed notation', () => {
      expect(cn('foo', ['bar', 'baz'], { qux: true })).toBe('foo bar baz qux');
    });

    it('merges Tailwind classes correctly', () => {
      // tw-merge should handle conflicts
      expect(cn('p-4', 'p-2')).toBe('p-2');
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('handles Tailwind responsive classes', () => {
      expect(cn('md:p-4', 'lg:p-6')).toBe('md:p-4 lg:p-6');
    });

    it('merges conflicting Tailwind utilities', () => {
      expect(cn('px-4 py-2', 'p-6')).toBe('p-6');
    });

    it('preserves non-conflicting utilities', () => {
      expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
    });

    it('handles empty inputs', () => {
      expect(cn()).toBe('');
      expect(cn('')).toBe('');
      expect(cn('', '', '')).toBe('');
    });

    it('handles complex Tailwind class combinations', () => {
      const result = cn(
        'flex items-center justify-between',
        'p-4 bg-white rounded-lg shadow',
        'hover:bg-gray-50 transition-colors',
        'dark:bg-gray-900 dark:text-white'
      );
      expect(result).toContain('flex');
      expect(result).toContain('items-center');
      expect(result).toContain('dark:bg-gray-900');
    });

    it('handles design system classes', () => {
      const result = cn('glass-card', 'p-4', 'hero-title');
      expect(result).toBe('glass-card p-4 hero-title');
    });

    it('handles CVA variant strings', () => {
      const buttonVariants = 'inline-flex items-center justify-center';
      const sizeVariant = 'h-10 px-4 py-2';
      const result = cn(buttonVariants, sizeVariant);
      expect(result).toContain('inline-flex');
      expect(result).toContain('h-10');
    });
  });
});

describe('utils - Edge Cases', () => {
  it('handles deeply nested arrays', () => {
    const result = cn(['foo', ['bar', ['baz']]]);
    expect(result).toBe('foo bar baz');
  });

  it('handles whitespace in class names', () => {
    const result = cn('  foo  ', '  bar  ');
    expect(result).toBe('foo bar');
  });

  it('handles numeric inputs gracefully', () => {
    // cn actually converts numbers to strings via clsx
    expect(cn(123 as unknown as string)).toBe('123');
  });
});
