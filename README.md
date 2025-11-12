# expo-squircle

Provides a reusable squircle background for Expo / React Native apps. It reuses the Figma squircle equations, caches the SVG path per size, and renders through `react-native-svg`.

## Requirements

- Expo SDK 54+ / React Native 0.81+
- React 18+

## Installation

```bash
npm install expo-squircle
```

Inside this repository, the example app already links to the package via `file:..`, so running `npm install` in `packages/expo-squircle/example` is enough for local previews.

## Usage

```tsx
import Squircle, { RoundedSurfaceOptions } from 'expo-squircle';

const cardBackdrop: RoundedSurfaceOptions = {
  baseRadius: 32,
  smoothFactor: 0.65,
  surfaceColor: '#101828',
  borderColor: '#98A2B3',
  borderWidth: 1,
};

export function Card() {
  return (
    <Squircle squircleParams={cardBackdrop} style={{ padding: 24 }}>
      {children}
    </Squircle>
  );
}
```

### `RoundedSurfaceOptions`

| Prop                | Type           | Default      | Description                                                      |
|---------------------|----------------|--------------|------------------------------------------------------------------|
| `baseRadius`        | `number`       | `0`          | Base radius applied when individual corners are not provided.    |
| `topLeftRadius`     | `number`       | `baseRadius` | Overrides the top-left radius.                                   |
| `topRightRadius`    | `number`       | `baseRadius` | Overrides the top-right radius.                                  |
| `bottomRightRadius` | `number`       | `baseRadius` | Overrides the bottom-right radius.                               |
| `bottomLeftRadius`  | `number`       | `baseRadius` | Overrides the bottom-left radius.                                |
| `smoothFactor`      | `number (0-1)` | required     | Corner smoothing value matching Figma’s interpretation.          |
| `surfaceColor`      | `ColorValue`   | `'#000'`     | Fill color for the squircle.                                     |
| `borderColor`       | `ColorValue`   | `'#000'`     | Stroke color when `borderWidth` is greater than zero.            |
| `borderWidth`       | `number`       | `0`          | Stroke width in logical pixels (auto-clamped to avoid overlaps). |

`Squircle` forwards every `View` prop, so layout, accessibility, and touch handlers work exactly as they would on a normal React Native `View`.

## Example App

```
cd packages/expo-squircle/example
npm install
npm start
```

The example renders a 200 × 200 squircle inside `react-native-safe-area-context`, making it easy to preview the component on simulators or physical devices.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

This package is released under the [MIT License](LICENSE).
