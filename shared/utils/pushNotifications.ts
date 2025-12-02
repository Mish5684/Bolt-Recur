/**
 * Push Notification Utilities
 * Handles Expo push notification token registration and management
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../api/supabase';

/**
 * Register push notification token for the current user
 * Call this after user logs in
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Check if running on physical device
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission to send push notifications denied');
      return null;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '0110b14c-bcf6-4a71-a59d-ebb4d43a463f', 
    });

    const expoPushToken = tokenData.data;
    console.log('Expo push token:', expoPushToken);

    // Get device ID
    const deviceId = Device.osInternalBuildId || Device.osBuildId || 'unknown';

    // Save token to database
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('No authenticated user');
      return null;
    }

    const { error: upsertError } = await supabase
      .from('user_push_tokens')
      .upsert({
        user_id: user.id,
        expo_push_token: expoPushToken,
        device_id: deviceId,
        is_active: true,
        last_used_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,expo_push_token'
      });

    if (upsertError) {
      console.error('Error saving push token:', upsertError);
      return null;
    }

    console.log('Push token registered successfully');
    return expoPushToken;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Unregister push notification token (call on logout)
 */
export async function unregisterPushNotifications(): Promise<void> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return;
    }

    // Mark all tokens for this user as inactive
    await supabase
      .from('user_push_tokens')
      .update({ is_active: false })
      .eq('user_id', user.id);

    console.log('Push tokens unregistered');
  } catch (error) {
    console.error('Error unregistering push notifications:', error);
  }
}

/**
 * Configure notification behavior
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Handle notification received (when app is in foreground)
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Handle notification response (when user taps notification)
 */
export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
