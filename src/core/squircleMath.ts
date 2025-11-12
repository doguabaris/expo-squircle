/**
 * @file packages/expo-squircle/src/core/squircleMath.ts
 * @description Geometry helpers that build SVG path commands for squircle shapes.
 *
 * Exports
 *   - buildSquirclePath
 *
 * @license MIT. Internal helper for expo-squircle.
 * @author Doğu Abaris <abaris@null.net>
 */

import type {
  BezierPatch,
  BezierPatchInput,
  CornerId,
  CornerProfiles,
  CornerSpreadInput,
  SquirclePathInput,
} from './types';

const PATH_CACHE_LIMIT = 160;
const PATH_CACHE_MAP = new Map<string, string>();
const CORNER_PROFILE_CACHE = new Map<string, BezierPatch>();

/**
 * Builds an SVG path definition representing a smooth squircle that fits inside
 * the provided width/height using per-corner radii and smoothing inputs.
 *
 * @param options SquirclePathInput describing the desired geometry.
 * @returns string SVG path string that can be consumed by react-native-svg.
 */
export function buildSquirclePath({
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

/**
 * Creates a deterministic key that represents the shape of the desired squircle.
 *
 * @param data.width Layout width.
 * @param data.height Layout height.
 * @param data.cornerSmoothing Smoothing factor.
 * @param data.preserveSmoothing Whether smoothing is preserved.
 * @param data.cornerRadius Base corner radius.
 * @param data.topLeftCornerRadius Top-left override.
 * @param data.topRightCornerRadius Top-right override.
 * @param data.bottomRightCornerRadius Bottom-right override.
 * @param data.bottomLeftCornerRadius Bottom-left override.
 * @returns string Cache key used to memoize path strings.
 */
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
    data.preserveSmoothing ? '1' : '0',
    data.cornerRadius.toFixed(2),
    data.topLeftCornerRadius.toFixed(2),
    data.topRightCornerRadius.toFixed(2),
    data.bottomRightCornerRadius.toFixed(2),
    data.bottomLeftCornerRadius.toFixed(2),
  ].join('|');
}

/**
 * Reads a previously cached path string for the provided key.
 *
 * @param key Cache key created by composeCacheKey.
 * @returns string | undefined Cached path or undefined when missing.
 */
function readCachedPath(key: string) {
  return PATH_CACHE_MAP.get(key);
}

/**
 * Stores a path string in the cache while pruning the oldest entry when the cache
 * is at capacity.
 *
 * @param key Cache key.
 * @param value SVG path string to store.
 */
function storeCachedPath(key: string, value: string) {
  if (PATH_CACHE_MAP.size >= PATH_CACHE_LIMIT && !PATH_CACHE_MAP.has(key)) {
    const iterator = PATH_CACHE_MAP.keys().next();
    if (!iterator.done) {
      PATH_CACHE_MAP.delete(iterator.value);
    }
  }
  PATH_CACHE_MAP.set(key, value);
}

type EdgeOrientation = 'top' | 'bottom' | 'left' | 'right';

const ADJACENT_RELATIONS: Record<
  CornerId,
  { side: EdgeOrientation; corner: CornerId }[]
> = {
  topLeft: [
    { corner: 'topRight', side: 'top' },
    { corner: 'bottomLeft', side: 'left' },
  ],
  topRight: [
    { corner: 'topLeft', side: 'top' },
    { corner: 'bottomRight', side: 'right' },
  ],
  bottomLeft: [
    { corner: 'bottomRight', side: 'bottom' },
    { corner: 'topLeft', side: 'left' },
  ],
  bottomRight: [
    { corner: 'bottomLeft', side: 'bottom' },
    { corner: 'topRight', side: 'right' },
  ],
};

/**
 * Normalizes corner radii so the sum of adjacent radii never exceeds the edge
 * length while preserving the relative ratios.
 *
 * @param topLeftCornerRadius Desired top-left radius.
 * @param topRightCornerRadius Desired top-right radius.
 * @param bottomRightCornerRadius Desired bottom-right radius.
 * @param bottomLeftCornerRadius Desired bottom-left radius.
 * @param width Available width.
 * @param height Available height.
 * @returns CornerProfiles Corner profiles with clamped radii and budgets.
 */
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
            side === 'top' || side === 'bottom' ? width : height;

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

/**
 * Computes the cubic bezier segments that emulate a single squircle corner.
 *
 * @param cornerRadius Desired radius for the corner.
 * @param cornerSmoothing Smoothing factor for the corner.
 * @param preserveSmoothing Whether to keep smoothing when clamped.
 * @param roundingAndSmoothingBudget Available length budget for rounding.
 * @returns BezierPatch describing the corner path.
 */
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

  if (cornerRadius <= 0 || roundingAndSmoothingBudget <= 0) {
    const profile: BezierPatch = {
      a: 0,
      b: 0,
      c: 0,
      d: 0,
      p: 0,
      cornerRadius: 0,
      arcSectionLength: 0,
    };
    CORNER_PROFILE_CACHE.set(cacheKey, profile);
    return profile;
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

/**
 * Creates a key for memoizing individual corner bezier patches.
 *
 * @param cornerRadius Radius used for the corner.
 * @param cornerSmoothing Smoothing factor.
 * @param preserveSmoothing Preserve flag.
 * @param roundingAndSmoothingBudget Available budget.
 * @returns string Cache key string.
 */
function cornerProfileCacheKey({
  cornerRadius,
  cornerSmoothing,
  preserveSmoothing,
  roundingAndSmoothingBudget,
}: BezierPatchInput) {
  return [
    cornerRadius.toFixed(3),
    cornerSmoothing.toFixed(4),
    preserveSmoothing ? '1' : '0',
    roundingAndSmoothingBudget.toFixed(3),
  ].join('|');
}

type PathParamsInput = {
  width: number;
  height: number;
  topLeftPathParams: BezierPatch;
  topRightPathParams: BezierPatch;
  bottomLeftPathParams: BezierPatch;
  bottomRightPathParams: BezierPatch;
};

/**
 * Builds the complete path by concatenating four corner patches and the straight
 * segments that connect them.
 *
 * @param width Layout width.
 * @param height Layout height.
 * @param topLeftPathParams Corner patch for top-left.
 * @param topRightPathParams Corner patch for top-right.
 * @param bottomLeftPathParams Corner patch for bottom-left.
 * @param bottomRightPathParams Corner patch for bottom-right.
 * @returns string Final SVG path string.
 */
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
    'Z',
  ];

  return segments.join(' ');
}

/**
 * Generates the SVG commands for the top-right corner patch.
 *
 * @param cornerRadius Radius for the corner (0 means straight line).
 * @param a,b,c,d,p Bezier helper distances computed earlier.
 * @param arcSectionLength Arc segment length for smoothing.
 * @returns string SVG command string segment.
 */
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

/**
 * Generates the SVG commands for the bottom-right corner patch.
 *
 * @param cornerRadius Radius for the corner.
 * @param a,b,c,d,p Bezier helper distances.
 * @param arcSectionLength Arc segment length.
 * @returns string SVG command string segment.
 */
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

/**
 * Generates the SVG commands for the bottom-left corner patch.
 *
 * @param cornerRadius Radius for the corner.
 * @param a,b,c,d,p Bezier helper distances.
 * @param arcSectionLength Arc segment length.
 * @returns string SVG command string segment.
 */
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

/**
 * Generates the SVG commands for the top-left corner patch.
 *
 * @param cornerRadius Radius for the corner.
 * @param a,b,c,d,p Bezier helper distances.
 * @param arcSectionLength Arc segment length.
 * @returns string SVG command string segment.
 */
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

/**
 * Converts degrees to radians.
 *
 * @param degrees Value in degrees.
 * @returns number Value converted to radians.
 */
function degToRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

/**
 * Formats template literal segments with numeric values rounded to 4 decimals.
 *
 * @param strings Template literal segments.
 * @param values Numeric values interleaved with the strings.
 * @returns string Concatenated string with numbers rounded to 4 decimals.
 */
function formatSegment(strings: TemplateStringsArray, ...values: number[]) {
  return strings.reduce((acc, str, index) => {
    const value = values[index];
    if (value !== undefined) {
      return acc + str + value.toFixed(4);
    }
    return acc + str;
  }, '');
}
