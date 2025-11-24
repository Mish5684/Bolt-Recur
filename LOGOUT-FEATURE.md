# Logout Feature

## Overview

An elegant Settings screen has been added to the app with a clean sign-out button.

## What Was Added

### 1. Settings Screen (`screens/SettingsScreen.tsx`)

A new Settings screen that includes:
- **User Account Information**: Displays the logged-in user's email
- **Sign Out Button**: Prominent logout button with confirmation dialog
- **App Information**: Shows app version and tagline

#### Features:
- Clean, modern design matching the app's aesthetic
- Confirmation dialog before signing out (prevents accidental logouts)
- Automatically navigates to login screen after sign out
- Shows user's email address for verification

### 2. Updated Tab Navigator (`navigation/TabNavigator.tsx`)

Added a third tab to the bottom navigation:
- **Home Tab** (🏠): View family members
- **Analytics Tab** (📊): View charts and statistics
- **Settings Tab** (⚙️): Account settings and logout

## How to Use

### For Users:

1. **Navigate to Settings**
   - Tap the Settings icon (⚙️) in the bottom tab bar

2. **Sign Out**
   - Tap the "Sign Out" button
   - Confirm in the dialog that appears
   - You'll be automatically redirected to the login screen

3. **Security**
   - After signing out, your session is completely cleared
   - No user data remains accessible
   - You must log in again to access the app

## Design Choices

### Why a Settings Tab?

1. **Discoverable**: Easy to find - standard location for logout
2. **Non-intrusive**: Doesn't clutter the main screens
3. **Scalable**: Room to add more settings in the future (notifications, preferences, etc.)
4. **Familiar UX**: Follows iOS and Android conventions

### Confirmation Dialog

- Prevents accidental sign-outs
- Gives users a chance to cancel
- Uses destructive red styling to indicate a significant action

### Visual Design

- Matches the app's existing design system
- Uses consistent colors, borders, and spacing
- Clean card-based layout
- Emoji icons for visual appeal

## Technical Details

### Authentication Flow

```typescript
// Sign out process:
1. User taps "Sign Out" button
2. Confirmation dialog appears
3. If confirmed:
   - Calls `await signOut()` from auth store
   - Clears user session in Supabase
   - Resets local auth state
   - Navigates to Login screen
```

### Security

- Uses Supabase's built-in `signOut()` method
- Properly clears authentication tokens
- Session is invalidated on the server
- No residual data access after logout

## Future Enhancements

The Settings screen can be expanded to include:
- Profile editing
- Notification preferences
- Theme selection (light/dark mode)
- Currency and locale settings
- Export data functionality
- Delete account option
- Help and support links

## Testing

To test the logout feature:

1. **Sign in** with any email
2. Create some test data (family members, classes)
3. Navigate to **Settings tab**
4. Tap **Sign Out**
5. Verify the confirmation dialog appears
6. Confirm sign out
7. Verify you're on the login screen
8. Verify you cannot navigate back to authenticated screens
9. Sign in again with a **different email**
10. Verify you see a clean slate (no previous user's data)

## Code Location

- Settings Screen: `screens/SettingsScreen.tsx`
- Tab Navigator: `navigation/TabNavigator.tsx`
- Auth Store: `shared/stores/auth.ts` (signOut method already existed)
