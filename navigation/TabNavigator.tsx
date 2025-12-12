import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import HomeScreen from '../screens/HomeScreen';
import InsightsScreen from '../screens/InsightsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useAuth } from '../shared/stores/auth';
import { getActionableCount } from '../shared/utils/notificationValidation';

const Tab = createBottomTabNavigator();

const HomeIcon = ({ focused }: { focused: boolean }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: 24 }}>{focused ? '🏠' : '🏘️'}</Text>
  </View>
);

const InsightsIcon = ({ focused }: { focused: boolean }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: 24 }}>{focused ? '📊' : '📈'}</Text>
  </View>
);

const NotificationsIcon = ({ focused, badgeCount }: { focused: boolean; badgeCount: number }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: 24 }}>🔔</Text>
    {badgeCount > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {badgeCount > 99 ? '99+' : badgeCount}
        </Text>
      </View>
    )}
  </View>
);

const SettingsIcon = ({ focused }: { focused: boolean }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: 24 }}>{focused ? '⚙️' : '⚙️'}</Text>
  </View>
);

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export default function TabNavigator() {
  const user = useAuth((state) => state.user);
  const [badgeCount, setBadgeCount] = useState(0);

  const updateBadgeCount = async () => {
    if (!user?.id) return;
    const count = await getActionableCount(user.id);
    setBadgeCount(count);
  };

  useEffect(() => {
    updateBadgeCount();
    const interval = setInterval(updateBadgeCount, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useFocusEffect(
    React.useCallback(() => {
      updateBadgeCount();
    }, [user?.id])
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          backgroundColor: '#FFFFFF',
          height: 88,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: HomeIcon,
        }}
      />
      <Tab.Screen
        name="InsightsTab"
        component={InsightsScreen}
        options={{
          tabBarLabel: 'Insights',
          tabBarIcon: InsightsIcon,
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Notifications',
          tabBarIcon: ({ focused }) => (
            <NotificationsIcon focused={focused} badgeCount={badgeCount} />
          ),
        }}
        listeners={{
          tabPress: () => {
            updateBadgeCount();
          },
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: SettingsIcon,
        }}
      />
    </Tab.Navigator>
  );
}
