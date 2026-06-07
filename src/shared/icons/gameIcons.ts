/**
 * Centralised re-export of the game-icons-react icons we use in the project.
 *
 * Importing the top-level `game-icons-react` pulls in 4 000+ icons and is
 * noisy. This barrel keeps a single, auditable list of which icons are
 * actually consumed and by which feature.
 *
 * The package targets React Native via `react-native-svg`, but the web
 * build of `react-native-svg` is fully compatible with Vite/React DOM.
 */
export { Sbed, Lorc, Delapouite, Skoll } from 'game-icons-react';
