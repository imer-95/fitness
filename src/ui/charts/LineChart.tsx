import { useId, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { Txt } from '../Text';
import { CHART_FONT, radius, spacing, useTheme } from '../theme';

import { niceDomain } from './scale';

export interface ChartPoint {
  x: number;
  y: number;
}

export interface ChartSeries {
  key: string;
  points: ChartPoint[];
  color: string;
  strokeWidth?: number;
  dots?: boolean;
  area?: boolean;
  dashed?: boolean;
  opacity?: number;
}

export interface LineChartProps {
  series: ChartSeries[];
  height?: number;
  goal?: number | null;
  goalLabel?: string;
  formatY?: (value: number) => string;
  formatX?: (x: number) => string;
  /** Tooltip text for a selected point. */
  formatTooltip?: (point: ChartPoint) => string;
  minYRange?: number;
  yTicks?: number;
  xLabels?: number;
  /** Index of the series used for touch selection. */
  selectSeries?: number;
}

const PAD = { top: 14, right: 44, bottom: 24, left: 6 };

export function LineChart({
  series,
  height = 200,
  goal,
  goalLabel,
  formatY = (v) => String(Math.round(v)),
  formatX = (x) => String(x),
  formatTooltip,
  minYRange = 0,
  yTicks = 4,
  xLabels = 4,
  selectSeries = 0,
}: LineChartProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<ChartPoint | null>(null);
  const gradientId = `grad${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const all = series.flatMap((s) => s.points);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  if (all.length === 0) {
    return <View style={{ height }} onLayout={onLayout} />;
  }

  let xMin = Math.min(...all.map((p) => p.x));
  let xMax = Math.max(...all.map((p) => p.x));
  if (xMin === xMax) {
    xMin -= 1;
    xMax += 1;
  }
  const ys = all.map((p) => p.y);
  if (goal != null) ys.push(goal);
  const domain = niceDomain(Math.min(...ys), Math.max(...ys), yTicks, minYRange);

  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const innerH = Math.max(1, height - PAD.top - PAD.bottom);
  const sx = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin)) * innerW;
  const sy = (y: number) => PAD.top + (1 - (y - domain.min) / (domain.max - domain.min)) * innerH;

  const pathFor = (points: ChartPoint[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');

  const labelXs: number[] = [];
  for (let i = 0; i < xLabels; i++) {
    labelXs.push(xMin + ((xMax - xMin) * i) / Math.max(1, xLabels - 1));
  }

  const selectable = series[selectSeries]?.points ?? [];
  const handleTouch = (e: GestureResponderEvent) => {
    if (selectable.length === 0) return;
    const x = e.nativeEvent.locationX;
    let best = selectable[0];
    for (const p of selectable) {
      if (Math.abs(sx(p.x) - x) < Math.abs(sx(best.x) - x)) best = p;
    }
    setSelected(best);
  };

  const tooltipText = selected
    ? formatTooltip
      ? formatTooltip(selected)
      : `${formatY(selected.y)} · ${formatX(selected.x)}`
    : null;
  const tooltipLeft = selected ? Math.min(Math.max(sx(selected.x) - 70, 0), Math.max(0, width - 140)) : 0;

  return (
    <View
      style={{ height }}
      onLayout={onLayout}
      onStartShouldSetResponder={() => true}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
      onResponderRelease={() => setTimeout(() => setSelected(null), 1600)}
      onResponderTerminationRequest={() => true}
      accessibilityLabel="Diagramm"
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            {series.map((s, i) => (
              <LinearGradient key={s.key} id={`${gradientId}${i}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={s.color} stopOpacity={0.28} />
                <Stop offset="1" stopColor={s.color} stopOpacity={0} />
              </LinearGradient>
            ))}
          </Defs>

          {domain.ticks.map((t) => (
            <Line
              key={`grid${t}`}
              x1={PAD.left}
              x2={PAD.left + innerW}
              y1={sy(t)}
              y2={sy(t)}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="3,4"
            />
          ))}
          {domain.ticks.map((t) => (
            <SvgText
              fontFamily={CHART_FONT}
              key={`label${t}`}
              x={width - 2}
              y={sy(t) + 4}
              fontSize={11}
              fill={colors.textTertiary}
              textAnchor="end"
            >
              {formatY(t)}
            </SvgText>
          ))}
          {labelXs.map((x, i) => (
            <SvgText
              fontFamily={CHART_FONT}
              key={`x${i}`}
              x={sx(x)}
              y={height - 6}
              fontSize={11}
              fill={colors.textTertiary}
              textAnchor={i === 0 ? 'start' : i === labelXs.length - 1 ? 'end' : 'middle'}
            >
              {formatX(x)}
            </SvgText>
          ))}

          {goal != null ? (
            <>
              <Line
                x1={PAD.left}
                x2={PAD.left + innerW}
                y1={sy(goal)}
                y2={sy(goal)}
                stroke={colors.success}
                strokeWidth={1.5}
                strokeDasharray="6,5"
              />
              {goalLabel ? (
                <SvgText
                  fontFamily={CHART_FONT}
                  x={PAD.left + 4}
                  y={sy(goal) - 5}
                  fontSize={11}
                  fill={colors.success}
                  fontWeight="600"
                >
                  {goalLabel}
                </SvgText>
              ) : null}
            </>
          ) : null}

          {series.map((s, i) =>
            s.area && s.points.length > 1 ? (
              <Path
                key={`area${s.key}`}
                d={`${pathFor(s.points)} L${sx(s.points[s.points.length - 1].x).toFixed(1)},${PAD.top + innerH} L${sx(
                  s.points[0].x,
                ).toFixed(1)},${PAD.top + innerH} Z`}
                fill={`url(#${gradientId}${i})`}
              />
            ) : null,
          )}
          {series.map((s) =>
            s.points.length > 1 ? (
              <Path
                key={`line${s.key}`}
                d={pathFor(s.points)}
                stroke={s.color}
                strokeWidth={s.strokeWidth ?? 2.5}
                strokeOpacity={s.opacity ?? 1}
                strokeDasharray={s.dashed ? '5,5' : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
                fill="none"
              />
            ) : null,
          )}
          {series.map((s) =>
            s.dots || s.points.length === 1
              ? s.points.map((p, j) => (
                  <Circle
                    key={`dot${s.key}${j}`}
                    cx={sx(p.x)}
                    cy={sy(p.y)}
                    r={s.points.length > 60 ? 2 : 3}
                    fill={s.color}
                    fillOpacity={s.opacity ?? 1}
                  />
                ))
              : null,
          )}

          {selected ? (
            <>
              <Line
                x1={sx(selected.x)}
                x2={sx(selected.x)}
                y1={PAD.top}
                y2={PAD.top + innerH}
                stroke={colors.textTertiary}
                strokeWidth={1}
              />
              <Circle
                cx={sx(selected.x)}
                cy={sy(selected.y)}
                r={6}
                fill={series[selectSeries]?.color ?? colors.primary}
                stroke={colors.surface}
                strokeWidth={2.5}
              />
            </>
          ) : null}
        </Svg>
      ) : null}
      {tooltipText ? (
        <View pointerEvents="none" style={[styles.tooltip, { left: tooltipLeft, backgroundColor: colors.text }]}>
          <Txt variant="caption" color={colors.background} weight="700" align="center" numberOfLines={1}>
            {tooltipText}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    top: -6,
    width: 140,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
});
