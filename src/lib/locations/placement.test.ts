import { describe, it, expect } from 'vitest';
import { summarizeOccupancy, suggestLocation, canPlace, type StorageLocation } from './placement';

const locs: StorageLocation[] = [
  { id: 'a', code: 'A01', cell_id: 'cut', capacity: 2, sort_order: 1 },
  { id: 'b', code: 'A02', cell_id: 'cut', capacity: 1, sort_order: 2 },
  { id: 'c', code: 'B01', cell_id: 'weld', capacity: 3, sort_order: 1 },
  { id: 'd', code: 'B02', cell_id: 'weld', capacity: 1, sort_order: 2, active: false },
];

describe('summarizeOccupancy', () => {
  it('counts active placements per slot and computes availability', () => {
    const occ = summarizeOccupancy(locs, [
      { location_id: 'a' },
      { location_id: 'a' }, // A01 now full (cap 2)
      { location_id: 'c' }, // B01 1/3
    ]);
    const a = occ.find((o) => o.location.id === 'a')!;
    expect(a.occupied).toBe(2);
    expect(a.available).toBe(0);
    expect(a.isFull).toBe(true);
    const c = occ.find((o) => o.location.id === 'c')!;
    expect(c.available).toBe(2);
    expect(c.isFull).toBe(false);
  });

  it('excludes inactive locations', () => {
    const occ = summarizeOccupancy(locs, []);
    expect(occ.find((o) => o.location.id === 'd')).toBeUndefined();
    expect(occ).toHaveLength(3);
  });

  it('never reports negative availability', () => {
    const [a] = summarizeOccupancy([locs[0]], [
      { location_id: 'a' }, { location_id: 'a' }, { location_id: 'a' },
    ]);
    expect(a.available).toBe(0);
  });
});

describe('suggestLocation', () => {
  it('suggests the open slot with the most free space, scoped to the cell', () => {
    const occ = summarizeOccupancy(locs, [{ location_id: 'a' }]); // A01 1/2 free=1, A02 0/1 free=1
    const s = suggestLocation(occ, { cellId: 'cut' });
    // both have available 1 → tie broken by sort_order: A01 (1) before A02 (2)
    expect(s?.location.code).toBe('A01');
  });

  it('returns null when every slot in the cell is full', () => {
    const occ = summarizeOccupancy(locs, [
      { location_id: 'a' }, { location_id: 'a' }, { location_id: 'b' },
    ]);
    expect(suggestLocation(occ, { cellId: 'cut' })).toBeNull();
  });

  it('considers all cells when no cell is given', () => {
    const occ = summarizeOccupancy(locs, [
      { location_id: 'a' }, { location_id: 'a' }, { location_id: 'b' },
    ]);
    const s = suggestLocation(occ);
    expect(s?.location.code).toBe('B01'); // only open slot left, available 3
  });

  it('falls back to a general (unassigned) slot when the cell has none open', () => {
    const withGeneral: StorageLocation[] = [
      ...locs,
      { id: 'g', code: 'GEN1', cell_id: null, capacity: 5, sort_order: 1 },
    ];
    // Both 'cut' slots full → should pick the general slot, not a 'weld' slot.
    const occ = summarizeOccupancy(withGeneral, [
      { location_id: 'a' }, { location_id: 'a' }, { location_id: 'b' },
    ]);
    expect(suggestLocation(occ, { cellId: 'cut' })?.location.code).toBe('GEN1');
  });

  it('prefers the cell own slot over a general slot when both are open', () => {
    const withGeneral: StorageLocation[] = [
      ...locs,
      { id: 'g', code: 'GEN1', cell_id: null, capacity: 99, sort_order: 1 },
    ];
    const occ = summarizeOccupancy(withGeneral, []);
    // 'cut' has open slots → pick A01 even though GEN1 has far more space.
    expect(suggestLocation(occ, { cellId: 'cut' })?.location.code).toBe('A01');
  });
});

describe('canPlace', () => {
  it('reflects isFull', () => {
    const [full] = summarizeOccupancy([locs[1]], [{ location_id: 'b' }]);
    expect(canPlace(full)).toBe(false);
  });
});
