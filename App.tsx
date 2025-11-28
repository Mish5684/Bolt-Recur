import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, Linking } from 'react-native';
import { useAuth } from './shared/stores/auth';

import LoginScreen from './screens/LoginScreen';
import TabNavigator from './navigation/TabNavigator';
import AddFamilyMemberScreen from './screens/AddFamilyMemberScreen';
import FamilyMemberDetailScreen from './screens/FamilyMemberDetailScreen';
import AddClassScreen from './screens/AddClassScreen';
import EditClassScreen from './screens/EditClassScreen';
import ClassDetailScreen from './screens/ClassDetailScreen';
import RecordPaymentScreen from './screens/RecordPaymentScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const { user, initialized, checkSession } = useAuth();
  const navigationRef = useRef<any>();

  useEffect(() => {
    checkSession();
  }, []);

  // Handle deep links
  useEffect(() => {
    if (!user) return;

    // Handle initial URL (app opened from notification)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle URLs when app is already open
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  const handleDeepLink = (url: string) => {
    if (!navigationRef.current || !user) return;

    // Parse deep link URL
    // Format: recur://path?params
    const urlParts = url.replace('recur://', '').split('?');
    const path = urlParts[0];
    const params = new URLSearchParams(urlParts[1] || '');

    console.log('Deep link:', path, params);

    // Route based on path
    if (path === 'add-family-member') {
      navigationRef.current.navigate('AddFamilyMember');
    } else if (path === 'add-class') {
      navigationRef.current.navigate('AddClass');
    } else if (path === 'home') {
      navigationRef.current.navigate('Main', { screen: 'Home' });
    } else if (path === 'analytics') {
      navigationRef.current.navigate('Main', { screen: 'Analytics' });
    } else if (path.startsWith('class/')) {
      const parts = path.split('/');
      const classId = parts[1];
      const action = parts[2]; // edit, record-payment, etc.

      if (action === 'edit') {
        navigationRef.current.navigate('EditClass', { classId });
      } else if (action === 'record-payment') {
        navigationRef.current.navigate('RecordPayment', { classId });
      } else {
        navigationRef.current.navigate('ClassDetail', { classId });
      }
    } else if (path.startsWith('family/')) {
      const parts = path.split('/');
      const memberId = parts[1];
      navigationRef.current.navigate('FamilyMemberDetail', { memberId });
    } else {
      // Default: navigate to home
      navigationRef.current.navigate('Main', { screen: 'Home' });
    }
  };

  if (!initialized) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <NavigationContainer
        ref={navigationRef}
        linking={{
          prefixes: ['recur://'],
          config: {
            screens: {
              Main: {
                screens: {
                  Home: 'home',
                  Analytics: 'analytics',
                },
              },
              AddFamilyMember: 'add-family-member',
              AddClass: 'add-class',
              ClassDetail: 'class/:classId',
              EditClass: 'class/:classId/edit',
              RecordPayment: 'class/:classId/record-payment',
              FamilyMemberDetail: 'family/:memberId',
            },
          },
        }}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          {!user ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : (
            <>
              <Stack.Screen name="Main" component={TabNavigator} />
              <Stack.Screen
                name="AddFamilyMember"
                component={AddFamilyMemberScreen}
              />
              <Stack.Screen
                name="FamilyMemberDetail"
                component={FamilyMemberDetailScreen}
              />
              <Stack.Screen name="AddClass" component={AddClassScreen} />
              <Stack.Screen name="EditClass" component={EditClassScreen} />
              <Stack.Screen name="ClassDetail" component={ClassDetailScreen} />
              <Stack.Screen
                name="RecordPayment"
                component={RecordPaymentScreen}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
