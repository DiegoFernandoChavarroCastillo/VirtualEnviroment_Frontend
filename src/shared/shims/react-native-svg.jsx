// Minimal web shim for `react-native-svg`.
// `game-icons-react` icons only need `<Svg>` + `<Path>`.
// We render them as plain inline SVG elements instead of pulling
// in the full react-native-svg module tree (which has native deps).

import React from 'react';

export function Svg({ children, viewBox, width, height, color, fill, style, ...props }) {
  return (
    <svg
      viewBox={viewBox || '0 0 512 512'}
      width={width}
      height={height}
      fill={fill || color || 'currentColor'}
      style={style}
      {...props}
    >
      {children}
    </svg>
  );
}

export function Path({ d, fill, stroke, strokeWidth, ...props }) {
  return <path d={d} fill={fill || 'currentColor'} stroke={stroke} strokeWidth={strokeWidth} {...props} />;
}

export default Svg;
