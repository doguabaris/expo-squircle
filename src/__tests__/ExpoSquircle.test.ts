/**
 * @file packages/expo-squircle/src/__tests__/ExpoSquircle.test.ts
 * @description Unit tests for ExpoSquircle helper utilities.
 *
 * @author Doğu Abaris <abaris@null.net>
 */

import { describe, expect, it } from '@jest/globals';

import { normalizeSmoothFactor } from '../core/params';
import { buildSquirclePath } from '../core/squircleMath';

describe('buildSquirclePath', () => {
  it('does not emit NaN values when only one corner radius is provided', () => {
    const path = buildSquirclePath({
      width: 100,
      height: 100,
      cornerSmoothing: 0.6,
      cornerRadius: 0,
      topLeftCornerRadius: 0,
      topRightCornerRadius: 0,
      bottomRightCornerRadius: 40,
      bottomLeftCornerRadius: 0,
      preserveSmoothing: false,
    });

    expect(path).toBeTruthy();
    expect(path).not.toContain('NaN');
  });
});

describe('normalizeSmoothFactor', () => {
  it('clamps out-of-range values', () => {
    expect(normalizeSmoothFactor(2)).toBe(1);
    expect(normalizeSmoothFactor(-0.2)).toBe(0);
  });

  it('throws when the value is missing', () => {
    expect(() => normalizeSmoothFactor(undefined)).toThrow(/smoothFactor/i);
  });
});
