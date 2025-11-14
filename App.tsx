import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
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

  useEffect(() => {
    checkSession();
  }, []);

  if (!initialized) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <NavigationContainer>
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
