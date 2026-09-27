import { Stack, useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import {
  hasPlaceholders,
  LEGAL_PAGES_URL,
  LEGAL_UPDATED,
  legalDocument,
  splitLinks,
  type LegalBlock,
} from '@/legal/content';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/Feedback';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Txt } from '@/ui/Text';
import { spacing, useTheme, withAlpha } from '@/ui/theme';

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const { colors } = useTheme();
  const document = legalDocument(doc);

  if (!document) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Rechtliches' }} />
        <EmptyState icon="file-question-outline" title="Seite nicht gefunden" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: document.title }} />
      {hasPlaceholders() ? (
        <Card tint={withAlpha(colors.warning, 0.14)}>
          <View style={styles.row}>
            <Icon name="alert-outline" size={20} color={colors.warning} />
            <Txt variant="footnote" style={styles.flex}>
              Vorlage: Name, Anschrift und Kontakt sind noch nicht eingetragen (src/legal/content.ts).
            </Txt>
          </View>
        </Card>
      ) : null}
      <Txt variant="title2">{document.title}</Txt>
      {document.intro ? (
        <Txt variant="callout" color="textSecondary">
          {document.intro}
        </Txt>
      ) : null}
      {document.sections.map((section, index) => (
        <View key={section.heading ?? index} style={styles.section}>
          {section.heading ? <Txt variant="headline">{section.heading}</Txt> : null}
          {section.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </View>
      ))}
      <Txt variant="caption" color="textTertiary">
        Stand: {LEGAL_UPDATED}
      </Txt>
      <LinkedText text={`Online: ${LEGAL_PAGES_URL}/${document.id}.html`} variant="caption" />
    </Screen>
  );
}

function Block({ block }: { block: LegalBlock }) {
  const { colors } = useTheme();
  if (block.kind === 'p') return <LinkedText text={block.text} />;
  if (block.kind === 'lines') {
    return (
      <View>
        {block.lines.map((line) => (
          <LinkedText key={line} text={line} />
        ))}
      </View>
    );
  }
  return (
    <View style={styles.list}>
      {block.items.map((item) => (
        <View key={item} style={styles.item}>
          <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
          <View style={styles.flex}>
            <LinkedText text={item} />
          </View>
        </View>
      ))}
    </View>
  );
}

function LinkedText({ text, variant = 'callout' }: { text: string; variant?: 'callout' | 'caption' }) {
  return (
    <Txt variant={variant} color={variant === 'caption' ? 'textTertiary' : 'text'} selectable>
      {splitLinks(text).map((part, i) =>
        part.href ? (
          <Txt
            key={i}
            variant={variant}
            color="primary"
            accessibilityRole="link"
            onPress={() => void Linking.openURL(part.href!)}
          >
            {part.text}
          </Txt>
        ) : (
          part.text
        ),
      )}
    </Txt>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  section: { gap: spacing.sm },
  list: { gap: spacing.sm },
  item: { flexDirection: 'row', gap: spacing.sm },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
});
