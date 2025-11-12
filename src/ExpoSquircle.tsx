/**
 * @file packages/expo-squircle/src/ExpoSquircle.tsx
 * @description Expo Squircle component that renders a smooth-corner background using react-native-svg.
 *
 * Exports
 *   - default (ExpoSquircle)
 *
 * @license MIT. Copyright (c) Doğu Abaris.
 * @author Doğu Abaris <abaris@null.net>
 */

import React, { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { SquircleComponentProps } from './ExpoSquircle.types';
import { normalizeSquircleParams, shrinkRadius } from './core/params';
import { buildSquirclePath } from './core/squircleMath';
import type { NormalizedRoundedSurfaceOptions } from './core/types';

type MeasuredFrame = { width: number; height: number };

/**
 * Renders the Squircle View component that draws the smooth background behind its children.
 *
 * @param squircleParams Squircle drawing options.
 * @param children Optional React children to render inside the rounded view.
 * @param style Optional style applied to the outer view.
 * @param onLayout Layout callback forwarded from React Native.
 * @param rest
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
      <SquircleBackdrop layout={frame} params={normalizedParams} />
      {children}
    </View>
  );
};

type SquircleBackdropProps = {
  layout: MeasuredFrame | null;
  params: NormalizedRoundedSurfaceOptions;
};

/**
 * Renders the react-native-svg backdrop using the normalized squircle params.
 *
 * @param layout Frame measured from the parent view.
 * @param params Normalized drawing parameters.
 * @returns React.ReactElement Invisible view containing the SVG path.
 */
const SquircleBackdrop: React.FC<SquircleBackdropProps> = ({
  layout,
  params,
}) => {
  const layoutWidth = layout?.width ?? 0;
  const layoutHeight = layout?.height ?? 0;

  const {
    baseRadius,
    topLeftRadius,
    topRightRadius,
    bottomRightRadius,
    bottomLeftRadius,
    smoothFactor,
    surfaceColor,
    borderColor,
    borderWidth,
  } = params;

  const { path, insetAmount, renderedStrokeWidth } = useMemo(() => {
    if (layoutWidth === 0 || layoutHeight === 0) {
      return { path: null, insetAmount: 0, renderedStrokeWidth: 0 };
    }

    const normalizedStrokeWidth = Math.max(0, borderWidth);

    const basePath = () =>
      buildSquirclePath({
        width: layoutWidth,
        height: layoutHeight,
        cornerSmoothing: smoothFactor,
        cornerRadius: baseRadius,
        topLeftCornerRadius: topLeftRadius,
        topRightCornerRadius: topRightRadius,
        bottomRightCornerRadius: bottomRightRadius,
        bottomLeftCornerRadius: bottomLeftRadius,
      });

    if (normalizedStrokeWidth === 0) {
      return {
        path: basePath(),
        insetAmount: 0,
        renderedStrokeWidth: 0,
      };
    }

    const cornerRadii = [
      baseRadius,
      topLeftRadius,
      topRightRadius,
      bottomLeftRadius,
      bottomRightRadius,
    ].filter(
      (value): value is number => typeof value === 'number' && value > 0,
    );

    const maxStrokeWidth =
      cornerRadii.length > 0 ? Math.min(...cornerRadii) : normalizedStrokeWidth;
    const clampedStrokeWidth = Math.min(normalizedStrokeWidth, maxStrokeWidth);

    if (clampedStrokeWidth <= 0) {
      return {
        path: basePath(),
        insetAmount: 0,
        renderedStrokeWidth: 0,
      };
    }

    const inset = clampedStrokeWidth / 2;

    const insetPath = buildSquirclePath({
      width: layoutWidth - clampedStrokeWidth,
      height: layoutHeight - clampedStrokeWidth,
      cornerSmoothing: smoothFactor,
      cornerRadius: shrinkRadius(baseRadius, inset),
      topLeftCornerRadius: shrinkRadius(topLeftRadius, inset),
      topRightCornerRadius: shrinkRadius(topRightRadius, inset),
      bottomRightCornerRadius: shrinkRadius(bottomRightRadius, inset),
      bottomLeftCornerRadius: shrinkRadius(bottomLeftRadius, inset),
    });

    return {
      path: insetPath,
      insetAmount: inset,
      renderedStrokeWidth: clampedStrokeWidth,
    };
  }, [
    layoutHeight,
    layoutWidth,
    baseRadius,
    topLeftRadius,
    topRightRadius,
    bottomRightRadius,
    bottomLeftRadius,
    smoothFactor,
    borderWidth,
  ]);

  if (!path) {
    return <View pointerEvents='none' style={StyleSheet.absoluteFill} />;
  }

  if (renderedStrokeWidth === 0) {
    return (
      <View pointerEvents='none' style={StyleSheet.absoluteFill}>
        <Svg
          width='100%'
          height='100%'
          viewBox={`0 0 ${layoutWidth} ${layoutHeight}`}
        >
          <Path d={path} fill={surfaceColor} />
        </Svg>
      </View>
    );
  }

  return (
    <View pointerEvents='none' style={StyleSheet.absoluteFill}>
      <Svg
        width='100%'
        height='100%'
        viewBox={`0 0 ${layoutWidth} ${layoutHeight}`}
      >
        <Path
          d={path}
          fill={surfaceColor}
          stroke={borderColor}
          strokeWidth={renderedStrokeWidth}
          transform={`translate(${insetAmount} ${insetAmount})`}
        />
      </Svg>
    </View>
  );
};

export default ExpoSquircle;
