import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { Txt } from '../Text';
import { CHART_FONT, spacing, useTheme, withAlpha } from '../theme';

import { niceDomain } from './scale';

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

export interface BarChartProps {
  data: BarDatum[];
  height?: number;
  color?: string;
  goal?: number | null;
  formatValue?: (value: number) => string;
  /** Highlighted bar (defaults to the last). */
  highlightIndex?: number;
}

const PAD = { top: 22, bottom: 4, right: 40 };

export function BarChart({
  data,
  height = 170,
  color,
  goal,
  formatValue = (v) => String(Math.round(v)),
  highlightIndex,
}: BarChartProps) {
  const { colors } = useTheme();
  const accent = color ?? colors.primary;
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  const max = Math.max(1, goal ?? 0, ...data.map((d) => d.value));
  const domain = niceDomain(0, max, 3);
  const chartHeight = height - 22;
  const innerH = chartHeight - PAD.top - PAD.bottom;
  const innerW = Math.max(1, width - PAD.right);
  const slot = data.length > 0 ? innerW / data.length : innerW;
  const barW = Math.max(4, Math.min(34, slot * 0.62));
  const sy = (v: number) => PAD.top + (1 - v / domain.max) * innerH;
  const active = selected ?? highlightIndex ?? data.length - 1;
  // Show only as many x labels as fit (about 44 px each).
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(innerW / 44))));
  const showLabel = (i: number) =>
    i === active || (i % labelEvery === (data.length - 1) % labelEvery && Math.abs(i - active) >= labelEvery);

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 ? (
        <Svg width={width} height={chartHeight}>
          {domain.ticks.map((t) => (
            <Line key={`g${t}`} x1={0} x2={innerW} y1={sy(t)} y2={sy(t)} stroke={colors.border} strokeDasharray="3,4" />
          ))}
          {domain.ticks.map((t) => (
            <SvgText
              fontFamily={CHART_FONT}
              key={`l${t}`}
              x={width - 2}
              y={sy(t) + 4}
              fontSize={11}
              fill={colors.textTertiary}
              textAnchor="end"
            >
              {formatValue(t)}
            </SvgText>
          ))}
          {goal != null && goal > 0 ? (
            <Line
              x1={0}
              x2={innerW}
              y1={sy(goal)}
              y2={sy(goal)}
              stroke={colors.success}
              strokeWidth={1.5}
              strokeDasharray="6,5"
            />
          ) : null}
          {data.map((d, i) => {
            const x = slot * i + (slot - barW) / 2;
            const h = Math.max(d.value > 0 ? 3 : 0, (d.value / domain.max) * innerH);
            const isActive = i === active;
            const barColor = d.color ?? accent;
            return (
              <Rect
                key={i}
                x={x}
                y={PAD.top + innerH - h}
                width={barW}
                height={h}
                rx={Math.min(6, barW / 2)}
                fill={isActive ? barColor : withAlpha(barColor, 0.45)}
              />
            );
          })}
          {data[active] && data[active].value > 0 ? (
            <SvgText
              fontFamily={CHART_FONT}
              x={Math.min(Math.max(slot * active + slot / 2, 20), innerW - 20)}
              y={Math.max(12, sy(data[active].value) - 7)}
              fontSize={12}
              fontWeight="700"
              fill={colors.text}
              textAnchor="middle"
            >
              {formatValue(data[active].value)}
            </SvgText>
          ) : null}
        </Svg>
      ) : null}
      <View style={[styles.labels, { width: innerW }]}>
        {data.map((d, i) => (
          <Pressable key={i} style={styles.label} onPress={() => setSelected(i)} hitSlop={{ top: 120 }}>
            <Txt
              variant="caption"
              color={i === active ? 'text' : 'textTertiary'}
              weight={i === active ? '700' : '500'}
              numberOfLines={1}
              align="center"
              style={styles.labelText}
            >
              {showLabel(i) ? d.label : ''}
            </Txt>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', marginTop: spacing.xs },
  label: { flex: 1, alignItems: 'center', overflow: 'visible' },
  labelText: { minWidth: 44 },
});
