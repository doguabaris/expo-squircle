/**
 * @file packages/expo-squircle/src/ExpoSquircle.tsx
 * @description Expo Squircle component that renders a smooth-corner background using an SVG clip-based stroke algorithm.
 *
 * Exports
 *   - default (ExpoSquircle)
 *
 * @license MIT. Copyright (c) Doğu Abaris.
 * @author Doğu Abaris <abaris@null.net>
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { ClipPath, Defs, Path } from 'react-native-svg';

import type { SquircleComponentProps } from './ExpoSquircle.types';
import { normalizeSquircleParams } from './core/params';
import { buildSquirclePath } from './core/squircleMath';
import type { NormalizedRoundedSurfaceOptions } from './core/types';

type MeasuredFrame = { width: number; height: number };

type SquircleBackdropProps = {
  frame: MeasuredFrame | null;
  params: NormalizedRoundedSurfaceOptions;
};

type SquircleGeometry = {
  width: number;
  height: number;
  path: string;
  strokeCommandWidth: number;
};

/**
 * Renders the Squircle View component that draws the smooth background behind its children.
 *
 * @param squircleParams Squircle drawing options.
 * @param children Optional React children to render inside the rounded view.
 * @param style Optional style applied to the outer view.
 * @param onLayout Layout callback forwarded from React Native.
 * @param rest View props spread onto the outer wrapper.
 * @returns React.ReactElement React element describing the wrapped view tree.
 * @throws Error when `squircleParams` or its `smoothFactor` value are missing or invalid.
 */
const ExpoSquircle: React.FC<SquircleComponentProps> = ({
  squircleParams,
  children,
  style,
  onLayout,
  ...rest
}) => {
  const [frame, setFrame] = useState<MeasuredFrame | null>(null);
  const normalizedParams = useMemo(
    () => normalizeSquircleParams(squircleParams),
    [squircleParams],
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setFrame((prev) =>
        prev && prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );

      onLayout?.(event);
    },
    [onLayout],
  );

  return (
    <View {...rest} style={style} onLayout={handleLayout}>
      <SquircleBackdrop frame={frame} params={normalizedParams} />
      {children}
    </View>
  );
};

const SquircleBackdrop: React.FC<SquircleBackdropProps> = ({
  frame,
  params,
}) => {
  const geometry = useMemo(
    () => computeSquircleGeometry(frame, params),
    [frame, params],
  );
  const clipPathIdRef = useRef<string | null>(null);

  if (!geometry) {
    return <View pointerEvents='none' style={StyleSheet.absoluteFill} />;
  }

  const { width, height, path, strokeCommandWidth } = geometry;
  const hasStroke = strokeCommandWidth > 0;

  if (hasStroke && !clipPathIdRef.current) {
    clipPathIdRef.current = createClipPathId();
  }

  const clipPathId = clipPathIdRef.current;

  return (
    <View pointerEvents='none' style={StyleSheet.absoluteFill}>
      <Svg width='100%' height='100%' viewBox={`0 0 ${width} ${height}`}>
        {hasStroke && clipPathId ? (
          <Defs>
            <ClipPath id={clipPathId}>
              <Path d={path} />
            </ClipPath>
          </Defs>
        ) : null}
        <Path d={path} fill={params.surfaceColor} />
        {hasStroke && clipPathId ? (
          <Path
            d={path}
            stroke={params.borderColor}
            strokeWidth={strokeCommandWidth}
            clipPath={`url(#${clipPathId})`}
            fill='none'
          />
        ) : null}
      </Svg>
    </View>
  );
};

function computeSquircleGeometry(
  frame: MeasuredFrame | null,
  params: NormalizedRoundedSurfaceOptions,
): SquircleGeometry | null {
  if (!frame || frame.width <= 0 || frame.height <= 0) {
    return null;
  }

  return {
    width: frame.width,
    height: frame.height,
    path: buildSquirclePath({
      width: frame.width,
      height: frame.height,
      cornerRadius: params.baseRadius,
      topLeftCornerRadius: params.topLeftRadius,
      topRightCornerRadius: params.topRightRadius,
      bottomRightCornerRadius: params.bottomRightRadius,
      bottomLeftCornerRadius: params.bottomLeftRadius,
      cornerSmoothing: params.smoothFactor,
    }),
    strokeCommandWidth:
      params.borderWidth > 0 ? params.borderWidth * 2 : params.borderWidth,
  };
}

let clipPathCounter = 0;

function createClipPathId() {
  clipPathCounter += 1;
  return `expoSquircleClip_${clipPathCounter}`;
}

export default ExpoSquircle;
