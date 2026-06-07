// Shim for `react-native` when bundling for the web.
// `game-icons-react` → `react-native-svg` → `react-native`.
// The react-native-svg shim now renders plain SVG, so most RN APIs
// are never actually called. We keep this shim for safety.

const api = {
  StyleSheet: {
    create: (s) => s,
    hairlineWidth: 1,
    flatten: (s) => s,
    absoluteFill: {},
    absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  },
  Platform: { OS: 'web', select: (obj) => obj.web ?? obj.default },
  PixelRatio: {
    get: () => 1,
    getFontScale: () => 1,
    getPixelSizeForLayoutSize: (s) => s,
    roundToNearestPixel: (s) => Math.round(s),
  },
  Dimensions: {
    get: () => (typeof window !== 'undefined'
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 0, height: 0 }),
    addEventListener: () => {},
    removeEventListener: () => {},
  },
  View: 'div',
  Text: 'span',
  ScrollView: 'div',
  TouchableOpacity: 'button',
  Pressable: 'button',
  Image: 'img',
  AppState: { addEventListener: () => {}, removeEventListener: () => {} },
  Appearance: { getColorScheme: () => 'light', addChangeListener: () => ({ remove: () => {} }) },
  UIManager: { measure: () => {} },
  processColor: (c) => c,
  requireNativeComponent: () => null,
  NativeModules: {},
  PanResponder: { create: () => ({ panHandlers: {} }) },
  findNodeHandle: () => null,
  unstable_createElement: (type, props) => {
    if (typeof document !== 'undefined') {
      const el = document.createElement(type);
      if (props) Object.assign(el, props);
      return el;
    }
    return null;
  },
};

module.exports = api;
