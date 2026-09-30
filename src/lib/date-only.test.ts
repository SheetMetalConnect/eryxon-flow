import { describe, expect, it } from 'vitest';
import { format } from 'date-fns';
import { parseDateOnly, serializeDateOnly } from './date-only';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

describe('calendar dates (run with TZ=America/Sao_Paulo)', () => {
  it.each([
    ['2026-10-01T00:00:00+00:00', 'Oct 1, 2026'],
    ['2026-09-25', 'Sep 25, 2026'],
  ])('preserves %s in local display', (value, expected) => {
    expect(format(parseDateOnly(value), 'MMM d, yyyy')).toBe(expected);
    expect(parseDateOnly(value).getHours()).toBe(0);
  });

  it('preserves dates in a negative UTC offset even when the test runner uses UTC', () => {
    const helperUrl = pathToFileURL(resolve('src/lib/date-only.ts')).href;
    const output = execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', `
      import { parseDateOnly } from ${JSON.stringify(helperUrl)};
      import { format } from 'date-fns';
      console.log(JSON.stringify([
        new Date('2026-10-01T00:00:00Z').getTimezoneOffset(),
        format(parseDateOnly('2026-10-01T00:00:00+00:00'), 'yyyy-MM-dd'),
        format(parseDateOnly('2026-09-25'), 'yyyy-MM-dd'),
        format(new Date('2026-10-01T00:00:00Z'), 'yyyy-MM-dd'),
      ]));
    `], { env: { ...process.env, TZ: 'America/Sao_Paulo' }, encoding: 'utf8' });
    expect(JSON.parse(output)).toEqual([180, '2026-10-01', '2026-09-25', '2026-09-30']);
  });

  it.each(['America/Sao_Paulo', 'Pacific/Kiritimati'])('serializes a selected date unchanged in %s', (timezone) => {
    const helperUrl = pathToFileURL(resolve('src/lib/date-only.ts')).href;
    const output = execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', `
      import { serializeDateOnly } from ${JSON.stringify(helperUrl)};
      console.log(serializeDateOnly(new Date(2026, 9, 1)));
    `], { env: { ...process.env, TZ: timezone }, encoding: 'utf8' });
    expect(output.trim()).toBe('2026-10-01T00:00:00.000Z');
  });

  it('serializes the local calendar day rather than the Date instant', () => {
    expect(serializeDateOnly(new Date(2026, 9, 1))).toBe('2026-10-01T00:00:00.000Z');
  });
});
