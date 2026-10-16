import { describe, expect, it } from 'vitest';
import { zoomedViewBox } from './seating-api';

describe('zoomedViewBox', () => {
  it('keeps the full plan at zoom 1 and ignores panning', () => {
    expect(zoomedViewBox('0 0 400 200', 1, 50, 50)).toBe('0 0 400 200');
  });
  it('zooms around the centre', () => {
    expect(zoomedViewBox('0 0 400 200', 2, 0, 0)).toBe('100 50 200 100');
  });
  it('clamps zoom and panning to the plan bounds', () => {
    expect(zoomedViewBox('0 0 400 200', 10, 1000, -1000)).toBe('300 0 100 50');
  });
});
