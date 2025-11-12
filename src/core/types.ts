/**
 * @file packages/expo-squircle/src/core/types.ts
 * @description Shared types used by core squircle helpers.
 *
 * Exports
 *   - NormalizedRoundedSurfaceOptions
 *   - CornerId
 *   - CornerProfile
 *   - CornerProfiles
 *   - CornerBudget
 *   - BezierPatch
 *   - BezierPatchInput
 *   - SquirclePathInput
 *
 * @license MIT. Internal helper for expo-squircle.
 * @author Doğu Abaris <abaris@null.net>
 */

import type { ColorValue } from 'react-native';

import type { SquircleComponentProps } from '../ExpoSquircle.types';

/**
 * Sanitized squircle options consumed by the view layer.
 */
export type NormalizedRoundedSurfaceOptions = {
  baseRadius: number;
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomRightRadius?: number;
  bottomLeftRadius?: number;
  smoothFactor: number;
  surfaceColor: ColorValue;
  borderColor: ColorValue;
  borderWidth: number;
};

export type CornerId = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

/**
 * Describes the radius and smoothing budget assigned to a single corner.
 */
export type CornerProfile = {
  radius: number;
  roundingAndSmoothingBudget: number;
};

/**
 * Map of four corners with their normalized radii and budgets.
 */
export type CornerProfiles = Record<CornerId, CornerProfile>;

/**
 * Parameters required to compute a Bezier patch for a corner.
 */
export type CornerBudget = {
  cornerRadius: number;
  cornerSmoothing: number;
  roundingAndSmoothingBudget: number;
};

/**
 * Precomputed distances used to render a rounded squircle corner.
 */
export type BezierPatch = {
  a: number;
  b: number;
  c: number;
  d: number;
  p: number;
  cornerRadius: number;
  arcSectionLength: number;
};

export type BezierPatchInput = CornerBudget & {
  preserveSmoothing: boolean;
};

/**
 * Complete set of inputs that define a squircle’s geometry.
 */
export type SquirclePathInput = {
  cornerRadius?: number;
  topLeftCornerRadius?: number;
  topRightCornerRadius?: number;
  bottomRightCornerRadius?: number;
  bottomLeftCornerRadius?: number;
  cornerSmoothing: number;
  width: number;
  height: number;
  preserveSmoothing?: boolean;
};

export type SquircleParamsProp = SquircleComponentProps['squircleParams'];

/**
 * Convenience shape describing the corner radii spread across each edge.
 */
export type CornerSpreadInput = {
  topLeftCornerRadius: number;
  topRightCornerRadius: number;
  bottomRightCornerRadius: number;
  bottomLeftCornerRadius: number;
  width: number;
  height: number;
};
