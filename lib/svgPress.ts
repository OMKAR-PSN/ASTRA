import { Platform } from 'react-native';

/**
 * react-native-svg's web renderer forwards React Native responder props to real DOM
 * nodes when a shape receives `onPress`, which React 19 flags as unknown. It also
 * overwrites `onClick` with `props.onPress` unless `onPress` is exactly null, so the
 * explicit null lets web clicks survive while native keeps the RN press handler.
 */
export function svgPress(handler: () => void): Record<string, unknown> {
  return Platform.OS === 'web' ? { onClick: handler, onPress: null } : { onPress: handler };
}
