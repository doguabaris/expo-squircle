/**
 * @file packages/expo-squircle/src/core/params.ts
 * @description Helpers for validating and normalizing squircle component props.
 *
 * Exports
 *   - normalizeSquircleParams
 *   - normalizeSmoothFactor
 *   - clamp
 *   - shrinkRadius
 *
 * @license MIT. Internal helper for expo-squircle.
 * @author Doğu Abaris <abaris@null.net>
 */

import type {
  NormalizedRoundedSurfaceOptions,
  SquircleParamsProp,
} from './types';

const SQUIRCLE_PARAM_ERROR =
  'ExpoSquircle: The "squircleParams" prop is required to draw the background.';
const INVALID_SMOOTH_FACTOR_ERROR =
  'ExpoSquircle: "smoothFactor" must be a finite number between 0 and 1.';

/**
 * Validates and sanitizes the incoming squircle props so downstream layout math
 * can assume required values are present and non-negative.
 *
 * @param params Raw props passed to the ExpoSquircle component.
 * @returns NormalizedRoundedSurfaceOptions Normalized values ready for rendering.
 * @throws Error when the params object or its `smoothFactor` field are missing.
 */
export function normalizeSquircleParams(
  params: SquircleParamsProp,
): NormalizedRoundedSurfaceOptions {
  if (!params) {
    throw new Error(SQUIRCLE_PARAM_ERROR);
  }

  /**
   * Ensures radii are positive numbers or returns undefined when user input is invalid.
   */
  const sanitizeRadius = (value?: number) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return undefined;
    }
    return Math.max(0, value);
  };

  const baseRadius = sanitizeRadius(params.baseRadius) ?? 0;
  const borderWidth = sanitizeRadius(params.borderWidth) ?? 0;

  return {
    baseRadius,
    topLeftRadius: sanitizeRadius(params.topLeftRadius),
    topRightRadius: sanitizeRadius(params.topRightRadius),
    bottomRightRadius: sanitizeRadius(params.bottomRightRadius),
    bottomLeftRadius: sanitizeRadius(params.bottomLeftRadius),
    smoothFactor: normalizeSmoothFactor(params.smoothFactor),
    surfaceColor: params.surfaceColor ?? '#000',
    borderColor: params.borderColor ?? '#000',
    borderWidth,
  };
}

/**
 * Validates and clamps a smoothing value to the [0, 1] range.
 *
 * @param value Value to validate (may be undefined).
 * @returns number Clamped smoothing factor between 0 and 1.
 * @throws Error when the input is not a finite number.
 */
export function normalizeSmoothFactor(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(INVALID_SMOOTH_FACTOR_ERROR);
  }
  return clamp(value, 0, 1);
}

/**
 * Clamps a numeric value between the provided range.
 *
 * @param value Number to clamp.
 * @param min Minimal allowed value.
 * @param max Maximum allowed value.
 * @returns number Value coerced into the [min, max] range.
 */
export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Shrinks a radius by a stroke inset while preventing negative outputs.
 *
 * @param radius Original radius to shrink.
 * @param insetAmount Amount to subtract.
 * @returns number | undefined Reduced radius or undefined if the original value was undefined.
 */
export function shrinkRadius(radius: number | undefined, insetAmount: number) {
  if (typeof radius === 'number') {
    return Math.max(0, radius - insetAmount);
  }

  return radius;
}
