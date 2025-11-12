/**
 * @file packages/expo-squircle/src/ExpoSquircle.types.ts
 * @description Shared type definitions for the Expo Squircle component.
 *
 * Exports
 *   - RoundedSurfaceOptions
 *   - RoundedSurfaceProps
 *   - SquircleComponentProps
 *
 * @license MIT. Copyright (c) Doğu Abaris.
 */

import type { PropsWithChildren } from "react";
import type { ColorValue, ViewProps } from "react-native";

export interface RoundedSurfaceOptions {
  baseRadius?: number;
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomRightRadius?: number;
  bottomLeftRadius?: number;
  smoothFactor: number;
  surfaceColor?: ColorValue;
  borderColor?: ColorValue;
  borderWidth?: number;
}

export interface RoundedSurfaceProps extends ViewProps {
  squircleParams: RoundedSurfaceOptions;
}

export type SquircleComponentProps = PropsWithChildren<RoundedSurfaceProps>;

export type ExpoSquircleModuleEvents = Record<string, never>;
