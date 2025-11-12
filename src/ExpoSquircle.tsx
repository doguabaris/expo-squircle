/**
 * @file packages/expo-squircle/src/ExpoSquircle.tsx
 * @description Expo Squircle component that renders a smooth-corner background using react-native-svg.
 *
 * Exports
 *   - default (ExpoSquircle)
 *
 * @license MIT. Copyright (c) Doğu Abaris.
 */

import React, { useCallback, useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import type { SquircleComponentProps } from "./ExpoSquircle.types";

type MeasuredFrame = { width: number; height: number };

/**
 * Render the Squircle View component.
 *
 * @returns React element.
 */
const ExpoSquircle: React.FC<SquircleComponentProps> = ({
  squircleParams,
  children,
  style,
  onLayout,
  ...rest
}) => {
  const [frame, setFrame] = useState<MeasuredFrame | null>(null);

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
      <SquircleBackdrop layout={frame} params={squircleParams} />
      {children}
    </View>
  );
};

type SquircleBackdropProps = {
  layout: MeasuredFrame | null;
  params: SquircleComponentProps["squircleParams"];
};

const SquircleBackdrop: React.FC<SquircleBackdropProps> = ({
  layout,
  params,
}) => {
  const layoutWidth = layout?.width ?? 0;
  const layoutHeight = layout?.height ?? 0;

  const {
    baseRadius = 0,
    topLeftRadius,
    topRightRadius,
    bottomRightRadius,
    bottomLeftRadius,
    smoothFactor,
    surfaceColor = "#000",
    borderColor = "#000",
    borderWidth = 0,
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
      (value): value is number => typeof value === "number" && value > 0,
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
    return <View pointerEvents="none" style={StyleSheet.absoluteFill} />;
  }

  if (renderedStrokeWidth === 0) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${layoutWidth} ${layoutHeight}`}
        >
          <Path d={path} fill={surfaceColor} />
        </Svg>
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg
        width="100%"
        height="100%"
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

function shrinkRadius(radius: number | undefined, insetAmount: number) {
  if (typeof radius === "number") {
    return Math.max(0, radius - insetAmount);
  }

  return radius;
}

type CornerId = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

type CornerProfile = {
  radius: number;
  roundingAndSmoothingBudget: number;
};

type CornerProfiles = Record<CornerId, CornerProfile>;

type CornerBudget = {
  cornerRadius: number;
  cornerSmoothing: number;
  roundingAndSmoothingBudget: number;
};

type BezierPatch = {
  a: number;
  b: number;
  c: number;
  d: number;
  p: number;
  cornerRadius: number;
  arcSectionLength: number;
};

type SquirclePathInput = {
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

const PATH_CACHE_LIMIT = 160;
const PATH_CACHE_MAP = new Map<string, string>();
const CORNER_PROFILE_CACHE = new Map<string, BezierPatch>();

function composeCacheKey(data: {
  width: number;
  height: number;
  cornerSmoothing: number;
  preserveSmoothing: boolean;
  cornerRadius: number;
  topLeftCornerRadius: number;
  topRightCornerRadius: number;
  bottomRightCornerRadius: number;
  bottomLeftCornerRadius: number;
}) {
  return [
    data.width.toFixed(2),
    data.height.toFixed(2),
    data.cornerSmoothing.toFixed(4),
    data.preserveSmoothing ? "1" : "0",
    data.cornerRadius.toFixed(2),
    data.topLeftCornerRadius.toFixed(2),
    data.topRightCornerRadius.toFixed(2),
    data.bottomRightCornerRadius.toFixed(2),
    data.bottomLeftCornerRadius.toFixed(2),
  ].join("|");
}

function readCachedPath(key: string) {
  return PATH_CACHE_MAP.get(key);
}

function storeCachedPath(key: string, value: string) {
  if (PATH_CACHE_MAP.size >= PATH_CACHE_LIMIT && !PATH_CACHE_MAP.has(key)) {
    const iterator = PATH_CACHE_MAP.keys().next();
    if (!iterator.done) {
      PATH_CACHE_MAP.delete(iterator.value);
    }
  }
  PATH_CACHE_MAP.set(key, value);
}

function buildSquirclePath({
  cornerRadius = 0,
  topLeftCornerRadius,
  topRightCornerRadius,
  bottomRightCornerRadius,
  bottomLeftCornerRadius,
  cornerSmoothing,
  width,
  height,
  preserveSmoothing = false,
}: SquirclePathInput) {
  topLeftCornerRadius = topLeftCornerRadius ?? cornerRadius;
  topRightCornerRadius = topRightCornerRadius ?? cornerRadius;
  bottomLeftCornerRadius = bottomLeftCornerRadius ?? cornerRadius;
  bottomRightCornerRadius = bottomRightCornerRadius ?? cornerRadius;

  const cacheKey = composeCacheKey({
    width,
    height,
    cornerSmoothing,
    preserveSmoothing,
    cornerRadius,
    topLeftCornerRadius,
    topRightCornerRadius,
    bottomRightCornerRadius,
    bottomLeftCornerRadius,
  });

  const cached = readCachedPath(cacheKey);
  if (cached) {
    return cached;
  }

  if (
    topLeftCornerRadius === topRightCornerRadius &&
    topRightCornerRadius === bottomRightCornerRadius &&
    bottomRightCornerRadius === bottomLeftCornerRadius &&
    bottomLeftCornerRadius === topLeftCornerRadius
  ) {
    if (topLeftCornerRadius === 0) {
      const rectanglePath = `M ${width} 0 L ${width} ${height} L 0 ${height} L 0 0 Z`;
      storeCachedPath(cacheKey, rectanglePath);
      return rectanglePath;
    }

    const budget = Math.min(width, height) / 2;
    const radius = Math.min(topLeftCornerRadius, budget);

    const pathParams = computeCornerProfile({
      cornerRadius: radius,
      cornerSmoothing,
      preserveSmoothing,
      roundingAndSmoothingBudget: budget,
    });

    const path = joinCornerProfiles({
      width,
      height,
      topLeftPathParams: pathParams,
      topRightPathParams: pathParams,
      bottomLeftPathParams: pathParams,
      bottomRightPathParams: pathParams,
    });
    storeCachedPath(cacheKey, path);
    return path;
  }

  const corners = normalizeCorners({
    topLeftCornerRadius,
    topRightCornerRadius,
    bottomRightCornerRadius,
    bottomLeftCornerRadius,
    width,
    height,
  });

  const path = joinCornerProfiles({
    width,
    height,
    topLeftPathParams: computeCornerProfile({
      cornerRadius: corners.topLeft.radius,
      cornerSmoothing,
      preserveSmoothing,
      roundingAndSmoothingBudget: corners.topLeft.roundingAndSmoothingBudget,
    }),
    topRightPathParams: computeCornerProfile({
      cornerRadius: corners.topRight.radius,
      cornerSmoothing,
      preserveSmoothing,
      roundingAndSmoothingBudget: corners.topRight.roundingAndSmoothingBudget,
    }),
    bottomRightPathParams: computeCornerProfile({
      cornerRadius: corners.bottomRight.radius,
      cornerSmoothing,
      preserveSmoothing,
      roundingAndSmoothingBudget:
        corners.bottomRight.roundingAndSmoothingBudget,
    }),
    bottomLeftPathParams: computeCornerProfile({
      cornerRadius: corners.bottomLeft.radius,
      cornerSmoothing,
      preserveSmoothing,
      roundingAndSmoothingBudget: corners.bottomLeft.roundingAndSmoothingBudget,
    }),
  });

  storeCachedPath(cacheKey, path);
  return path;
}

type CornerSpreadInput = {
  topLeftCornerRadius: number;
  topRightCornerRadius: number;
  bottomRightCornerRadius: number;
  bottomLeftCornerRadius: number;
  width: number;
  height: number;
};

type EdgeOrientation = "top" | "bottom" | "left" | "right";

const ADJACENT_RELATIONS: Record<
  CornerId,
  { side: EdgeOrientation; corner: CornerId }[]
> = {
  topLeft: [
    { corner: "topRight", side: "top" },
    { corner: "bottomLeft", side: "left" },
  ],
  topRight: [
    { corner: "topLeft", side: "top" },
    { corner: "bottomRight", side: "right" },
  ],
  bottomLeft: [
    { corner: "bottomRight", side: "bottom" },
    { corner: "topLeft", side: "left" },
  ],
  bottomRight: [
    { corner: "bottomLeft", side: "bottom" },
    { corner: "topRight", side: "right" },
  ],
};

function normalizeCorners({
  topLeftCornerRadius,
  topRightCornerRadius,
  bottomRightCornerRadius,
  bottomLeftCornerRadius,
  width,
  height,
}: CornerSpreadInput): CornerProfiles {
  const radiusMap: Record<CornerId, number> = {
    topLeft: topLeftCornerRadius,
    topRight: topRightCornerRadius,
    bottomLeft: bottomLeftCornerRadius,
    bottomRight: bottomRightCornerRadius,
  };

  const budgetMap: Record<CornerId, number> = {
    topLeft: -1,
    topRight: -1,
    bottomLeft: -1,
    bottomRight: -1,
  };

  Object.entries(radiusMap)
    .sort(([, r1], [, r2]) => r2 - r1)
    .forEach(([cornerName, radius]) => {
      const corner = cornerName as CornerId;
      const adjacents = ADJACENT_RELATIONS[corner];

      const budget = Math.min(
        ...adjacents.map(({ corner: adjacentCorner, side }) => {
          const adjacentRadius = radiusMap[adjacentCorner];
          if (radius === 0 && adjacentRadius === 0) {
            return 0;
          }

          const adjacentBudget = budgetMap[adjacentCorner];
          const sideLength =
            side === "top" || side === "bottom" ? width : height;

          if (adjacentBudget >= 0) {
            return sideLength - adjacentBudget;
          }

          return (radius / (radius + adjacentRadius)) * sideLength;
        }),
      );

      budgetMap[corner] = budget;
      radiusMap[corner] = Math.min(radius, budget);
    });

  return {
    topLeft: {
      radius: radiusMap.topLeft,
      roundingAndSmoothingBudget: budgetMap.topLeft,
    },
    topRight: {
      radius: radiusMap.topRight,
      roundingAndSmoothingBudget: budgetMap.topRight,
    },
    bottomLeft: {
      radius: radiusMap.bottomLeft,
      roundingAndSmoothingBudget: budgetMap.bottomLeft,
    },
    bottomRight: {
      radius: radiusMap.bottomRight,
      roundingAndSmoothingBudget: budgetMap.bottomRight,
    },
  };
}

type BezierPatchInput = CornerBudget & {
  preserveSmoothing: boolean;
};

function computeCornerProfile({
  cornerRadius,
  cornerSmoothing,
  preserveSmoothing,
  roundingAndSmoothingBudget,
}: BezierPatchInput): BezierPatch {
  const cacheKey = cornerProfileCacheKey({
    cornerRadius,
    cornerSmoothing,
    preserveSmoothing,
    roundingAndSmoothingBudget,
  });
  const cached = CORNER_PROFILE_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  let p = (1 + cornerSmoothing) * cornerRadius;

  if (!preserveSmoothing) {
    const maxSmoothing = roundingAndSmoothingBudget / cornerRadius - 1;
    cornerSmoothing = Math.min(cornerSmoothing, maxSmoothing);
    p = Math.min(p, roundingAndSmoothingBudget);
  }

  const arcMeasure = 90 * (1 - cornerSmoothing);
  const arcSectionLength =
    Math.sin(degToRad(arcMeasure / 2)) * cornerRadius * Math.SQRT2;

  const angleAlpha = (90 - arcMeasure) / 2;
  const p3ToP4Distance = cornerRadius * Math.tan(degToRad(angleAlpha / 2));

  const angleBeta = 45 * cornerSmoothing;
  const c = p3ToP4Distance * Math.cos(degToRad(angleBeta));
  const d = c * Math.tan(degToRad(angleBeta));

  let b = (p - arcSectionLength - c - d) / 3;
  let a = 2 * b;

  if (preserveSmoothing && p > roundingAndSmoothingBudget) {
    const p1ToP3MaxDistance =
      roundingAndSmoothingBudget - d - arcSectionLength - c;
    const minA = p1ToP3MaxDistance / 6;
    const maxB = p1ToP3MaxDistance - minA;

    b = Math.min(b, maxB);
    a = p1ToP3MaxDistance - b;
    p = Math.min(p, roundingAndSmoothingBudget);
  }

  const profile: BezierPatch = {
    a,
    b,
    c,
    d,
    p,
    cornerRadius,
    arcSectionLength,
  };

  CORNER_PROFILE_CACHE.set(cacheKey, profile);
  return profile;
}

function cornerProfileCacheKey({
  cornerRadius,
  cornerSmoothing,
  preserveSmoothing,
  roundingAndSmoothingBudget,
}: BezierPatchInput) {
  return [
    cornerRadius.toFixed(3),
    cornerSmoothing.toFixed(4),
    preserveSmoothing ? "1" : "0",
    roundingAndSmoothingBudget.toFixed(3),
  ].join("|");
}

type PathParamsInput = {
  width: number;
  height: number;
  topLeftPathParams: BezierPatch;
  topRightPathParams: BezierPatch;
  bottomLeftPathParams: BezierPatch;
  bottomRightPathParams: BezierPatch;
};

function joinCornerProfiles({
  width,
  height,
  topLeftPathParams,
  topRightPathParams,
  bottomLeftPathParams,
  bottomRightPathParams,
}: PathParamsInput) {
  const segments = [
    `M ${width - topRightPathParams.p} 0`,
    traceTopRight(topRightPathParams),
    `L ${width} ${height - bottomRightPathParams.p}`,
    traceBottomRight(bottomRightPathParams),
    `L ${bottomLeftPathParams.p} ${height}`,
    traceBottomLeft(bottomLeftPathParams),
    `L 0 ${topLeftPathParams.p}`,
    traceTopLeft(topLeftPathParams),
    "Z",
  ];

  return segments.join(" ");
}

function traceTopRight({
  cornerRadius,
  a,
  b,
  c,
  d,
  p,
  arcSectionLength,
}: BezierPatch) {
  if (cornerRadius) {
    return formatSegment`
    c ${a} 0 ${a + b} 0 ${a + b + c} ${d}
    a ${cornerRadius} ${cornerRadius} 0 0 1 ${arcSectionLength} ${arcSectionLength}
    c ${d} ${c}
        ${d} ${b + c}
        ${d} ${a + b + c}`;
  }
  return formatSegment`l ${p} 0`;
}

function traceBottomRight({
  cornerRadius,
  a,
  b,
  c,
  d,
  p,
  arcSectionLength,
}: BezierPatch) {
  if (cornerRadius) {
    return formatSegment`
    c 0 ${a}
      0 ${a + b}
      ${-d} ${a + b + c}
    a ${cornerRadius} ${cornerRadius} 0 0 1 -${arcSectionLength} ${arcSectionLength}
    c ${-c} ${d}
      ${-(b + c)} ${d}
      ${-(a + b + c)} ${d}`;
  }
  return formatSegment`l 0 ${p}`;
}

function traceBottomLeft({
  cornerRadius,
  a,
  b,
  c,
  d,
  p,
  arcSectionLength,
}: BezierPatch) {
  if (cornerRadius) {
    return formatSegment`
    c ${-a} 0
      ${-(a + b)} 0
      ${-(a + b + c)} ${-d}
    a ${cornerRadius} ${cornerRadius} 0 0 1 -${arcSectionLength} -${arcSectionLength}
    c ${-d} ${-c}
      ${-d} ${-(b + c)}
      ${-d} ${-(a + b + c)}`;
  }
  return formatSegment`l ${-p} 0`;
}

function traceTopLeft({
  cornerRadius,
  a,
  b,
  c,
  d,
  p,
  arcSectionLength,
}: BezierPatch) {
  if (cornerRadius) {
    return formatSegment`
    c 0 ${-a}
      0 ${-(a + b)}
      ${d} ${-(a + b + c)}
    a ${cornerRadius} ${cornerRadius} 0 0 1 ${arcSectionLength} -${arcSectionLength}
    c ${c} ${-d}
      ${b + c} ${-d}
      ${a + b + c} ${-d}`;
  }
  return formatSegment`l 0 ${-p}`;
}

function degToRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function formatSegment(strings: TemplateStringsArray, ...values: number[]) {
  return strings.reduce((acc, str, index) => {
    const value = values[index];
    if (value !== undefined) {
      return acc + str + value.toFixed(4);
    }
    return acc + str;
  }, "");
}

export default ExpoSquircle;
