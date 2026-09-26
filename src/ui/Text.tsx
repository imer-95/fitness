import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme, type ThemeColors } from './theme';

export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.6 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.4 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.2 },
  title3: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  headline: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  subhead: { fontSize: 14, lineHeight: 19, fontWeight: '500' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  number: { fontSize: 26, lineHeight: 32, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.4 },
  numberLarge: { fontSize: 40, lineHeight: 46, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -1 },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof typography;

export interface TxtProps extends TextProps {
  variant?: TextVariant;
  /** Theme color key or any color value. */
  color?: keyof ThemeColors | (string & {});
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
  tabular?: boolean;
}

export function Txt({ variant = 'body', color = 'text', weight, align, tabular, style, ...rest }: TxtProps) {
  const { colors } = useTheme();
  const resolved = color in colors ? colors[color as keyof ThemeColors] : color;
  return (
    <Text
      {...rest}
      style={[
        typography[variant],
        { color: resolved },
        weight ? { fontWeight: weight } : null,
        align ? { textAlign: align } : null,
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    />
  );
}
