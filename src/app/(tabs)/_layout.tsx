import { Redirect } from 'expo-router';
import { BottomTabBar, Tabs } from 'expo-router/js-tabs';
import { View, type ColorValue } from 'react-native';

import { ActiveWorkoutBar } from '@/components/ActiveWorkoutBar';
import { useSettings } from '@/state/settings';
import { Icon, type IconName } from '@/ui/Icon';
import { useTheme } from '@/ui/theme';

function tabIcon(active: IconName, inactive: IconName) {
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Icon name={focused ? active : inactive} size={25} color={String(color)} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const onboarded = useSettings((s) => s.onboarded);
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      tabBar={(props) => (
        <View>
          <ActiveWorkoutBar />
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Heute', tabBarIcon: tabIcon('home-variant', 'home-variant-outline') }}
      />
      <Tabs.Screen name="training" options={{ title: 'Training', tabBarIcon: tabIcon('dumbbell', 'dumbbell') }} />
      <Tabs.Screen
        name="nutrition"
        options={{ title: 'Ernährung', tabBarIcon: tabIcon('food-apple', 'food-apple-outline') }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Fortschritt', tabBarIcon: tabIcon('chart-box', 'chart-box-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profil', tabBarIcon: tabIcon('account-circle', 'account-circle-outline') }}
      />
    </Tabs>
  );
}
