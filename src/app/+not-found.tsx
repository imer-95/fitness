import { router, Stack } from 'expo-router';

import { EmptyState } from '@/ui/Feedback';
import { Screen } from '@/ui/Screen';

export default function NotFoundScreen() {
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Nicht gefunden' }} />
      <EmptyState
        icon="map-marker-question-outline"
        title="Seite nicht gefunden"
        message="Diese Ansicht gibt es nicht (mehr)."
        action={{ label: 'Zur Startseite', onPress: () => router.replace('/') }}
      />
    </Screen>
  );
}
