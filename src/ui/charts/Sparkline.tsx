import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '../theme';

/** Tiny line chart without axes. */
export function Sparkline({
  values,
  width = 96,
  height = 36,
  color,
  strokeWidth = 2.2,
}: {
  values: readonly number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const { colors } = useTheme();
  const accent = color ?? colors.primary;
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = strokeWidth + 2;
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / range) * (height - pad * 2);
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = values[values.length - 1];
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={accent} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={x(values.length - 1)} cy={y(last)} r={strokeWidth + 1} fill={accent} />
    </Svg>
  );
}
