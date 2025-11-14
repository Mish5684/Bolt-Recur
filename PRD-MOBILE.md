---
title: Yoga Class Management System - Mobile App
version: 1.0.0
platform: React Native with Expo
target: iOS and Android
date: 2025-10-23
---

# Yoga Class Management System - Mobile App PRD

## Overview
A native mobile application for iOS and Android to manage yoga class attendance and payments for family members. Built with React Native and Expo, the app provides on-the-go access to class management features while connecting to the same Supabase backend as the web application.

## Project Context
This mobile app is a companion to the existing web application. Both platforms share the same Supabase database, ensuring data synchronization across all devices.

## Target Platforms
- Android (Google Play Store) - Priority 1
- iOS (Apple App Store) - Priority 2
- Minimum Android version: Android 5.0 (API 21)
- Minimum iOS version: iOS 13.0

## User Stories

### Family Member Management
- As an administrator, I want to view all family members in a scrollable mobile list
- As an administrator, I want to add new family members using mobile-friendly input forms
- As an administrator, I want to tap on a family member to view their detailed information
- As an administrator, I want to pull-to-refresh the family member list to get latest data
- As an administrator, I want to see member information optimized for small screens

### Class Management
- As an administrator, I want to view all my classes in a mobile-friendly list
- As an administrator, I want to create new classes with name and pricing
- As an administrator, I want to edit class names and prices
- As an administrator, I want to see which members are subscribed to each class
- As an administrator, I want to manage class subscriptions from mobile device

### Payment Management
- As an administrator, I want to record payments using number-pad optimized inputs
- As an administrator, I want to use mobile native number inputs for payment amounts
- As an administrator, I want to see payment history in a mobile-scrollable view
- As an administrator, I want confirmation dialogs before saving payments
- As an administrator, I want to quickly access payment recording from member details
- As an administrator, I want to select payment currency (USD, INR, etc.)

### Attendance Tracking
- As an administrator, I want to mark attendance using mobile date pickers
- As an administrator, I want touch-friendly attendance marking buttons
- As an administrator, I want to view attendance history in a mobile-optimized layout
- As an administrator, I want to mark attendance for multiple members efficiently
- As an administrator, I want visual feedback when attendance is recorded
- As an administrator, I want to see attendance trends and analytics

### Mobile-Specific Features
- As a user, I want the app to work offline and sync when connection returns
- As a user, I want pull-to-refresh on all list screens
- As a user, I want haptic feedback for button presses
- As a user, I want the app to handle keyboard properly on forms
- As a user, I want proper loading states during data operations
- As a user, I want the app to work on both phones and tablets

## Technical Requirements

### Frontend Framework
- React Native via Expo managed workflow
- TypeScript for type safety
- Expo SDK 50+ for latest features
- React Navigation for screen navigation
- NativeWind or React Native Paper for UI components
- Expo Vector Icons for iconography

### Navigation Structure
- Stack Navigator for main navigation flow
- Bottom Tab Navigator for primary sections:
  - Home/Dashboard
  - Family Members
  - Classes
  - Attendance
  - Settings (future)
- Deep linking support for future features

### State Management
- Zustand for client-side state management
- React Query or SWR for server state caching
- AsyncStorage for local data persistence
- Offline-first data handling strategy

### Backend Integration
- Supabase JavaScript client (@supabase/supabase-js)
- Same Supabase project as web application
- Real-time subscriptions for data updates
- Secure authentication flow with email/password
- Row Level Security respecting existing policies

### Database Schema (Shared with Web)
Uses existing Supabase tables:

#### family_members
- id (UUID, primary key)
- name (text)
- class_id (UUID, nullable, foreign key to classes)
- created_at (timestamp)
- user_id (UUID, foreign key to auth.users)

#### classes
- id (UUID, primary key)
- name (text)
- price_per_class (numeric)
- currency (text, default 'USD')
- created_at (timestamp)
- user_id (UUID, foreign key to auth.users)

#### payments
- id (UUID, primary key)
- family_member_id (UUID, foreign key)
- num_classes (integer)
- amount (numeric)
- currency (text, default 'USD')
- payment_date (date)
- created_at (timestamp)
- user_id (UUID, foreign key to auth.users)

#### class_attendance
- id (UUID, primary key)
- family_member_id (UUID, foreign key)
- class_id (UUID, nullable, foreign key)
- class_date (date)
- created_at (timestamp)
- user_id (UUID, foreign key to auth.users)

#### class_subscriptions
- id (UUID, primary key)
- family_member_id (UUID, foreign key)
- class_id (UUID, foreign key)
- created_at (timestamp)
- user_id (UUID, foreign key to auth.users)

### Mobile-Specific Considerations
- Responsive layouts for various screen sizes (320px to 428px+ width)
- Safe area insets for notched devices
- Keyboard avoiding views for input forms
- Touch target minimum size of 44x44 points
- Optimized images and assets for mobile bandwidth
- Efficient data loading with pagination
- Background data refresh capability
- Push notification infrastructure (for future use)

### Performance Requirements
- App launch time under 3 seconds
- Screen transitions under 300ms
- List scrolling at 60fps
- Image loading with progressive enhancement
- Offline data availability
- Maximum app size under 50MB

## User Interface Design

### Screen Structure

#### 1. Authentication Screens
- **Login Screen**
  - Email input field
  - Password input field
  - Sign in button
  - Link to registration
  - Auto-focus on email field
  - Secure password input
  - Loading state during authentication

- **Registration Screen**
  - Email input field
  - Password input field
  - Confirm password field
  - Sign up button
  - Link back to login
  - Password strength indicator
  - Validation messages

#### 2. Home/Dashboard Screen
- Summary cards showing:
  - Total family members
  - Total classes
  - Recent attendance count
  - Recent payment total
- Quick action buttons for common tasks
- Recent activity feed
- Navigation to main sections

#### 3. Family Members Section
- **Member List Screen**
  - Scrollable list of all family members
  - Member name and assigned class displayed
  - Add member floating action button
  - Pull-to-refresh gesture
  - Search/filter capability
  - Empty state for no members
  - Tap to view member details

- **Member Detail Screen**
  - Member name prominently displayed
  - Assigned class information
  - Quick action buttons for payment and attendance
  - Tabbed or sectioned view:
    - Payments tab
    - Attendance tab
    - Statistics tab
  - Scrollable content area
  - Edit and delete options
  - Back navigation button

- **Add/Edit Member Screen**
  - Name input field
  - Class selection dropdown
  - Mobile keyboard automatically shown
  - Clear save and cancel buttons
  - Loading state during submission
  - Success feedback after creation/update

#### 4. Classes Section
- **Class List Screen**
  - Scrollable list of all classes
  - Class name and price displayed
  - Add class floating action button
  - Pull-to-refresh gesture
  - Empty state for no classes
  - Tap to view class details

- **Class Detail Screen**
  - Class name and price
  - List of subscribed members
  - Edit and delete options
  - Quick actions for managing subscriptions
  - Back navigation button

- **Add/Edit Class Screen**
  - Class name input
  - Price per class input
  - Currency selection
  - Save and cancel buttons
  - Validation messages

#### 5. Payments Section
- **Record Payment Screen**
  - Family member selection dropdown
  - Number input for class count
  - Currency input for amount
  - Currency selector
  - Date picker for payment date
  - Confirmation dialog before saving
  - Validation messages for required fields
  - Success feedback

- **Payment History Screen**
  - List of all payments (across all members or per member)
  - Date, amount, currency, and class count displayed
  - Filter by member or date range
  - Sorted by date (newest first)
  - Empty state if no payments
  - Pull-to-refresh

#### 6. Attendance Section
- **Mark Attendance Screen**
  - Date picker for class date (defaults to today)
  - Class selection (if multiple classes)
  - Family member selection checkboxes or list
  - Submit button
  - Batch marking capability
  - Success confirmation

- **Attendance History Screen**
  - Calendar or list view of attended classes
  - Filter by member or class
  - Date display with visual indicators
  - Count of total classes attended
  - Attendance heatmap visualization
  - Trend chart showing attendance over time
  - Empty state if no attendance records

- **Attendance Analytics Screen**
  - Visual charts and graphs
  - Attendance trends by member
  - Attendance trends by class
  - Monthly/weekly summaries
  - Member comparison metrics

### Design System
- **Typography:** System fonts (San Francisco for iOS, Roboto for Android)
  - Headings: Bold, 20-24pt
  - Body text: Regular, 16pt
  - Small text: 14pt
  - Line height: 150% for body, 120% for headings

- **Color Palette:** Professional and calming (avoid purple/indigo tones)
  - Primary: Blue (#2563eb) or teal (#14b8a6) for yoga/wellness feel
  - Secondary: Neutral gray for supporting elements
  - Success: Green (#10b981) for confirmations
  - Warning: Amber (#f59e0b) for alerts
  - Error: Red (#ef4444) for validation errors
  - Background: White (#ffffff) / light gray (#f9fafb)
  - Card background: White with subtle shadow
  - Text primary: Dark gray (#1f2937)
  - Text secondary: Medium gray (#6b7280)

- **Spacing:** 8px base unit
  - Extra small: 4px
  - Small: 8px
  - Medium: 16px
  - Large: 24px
  - Extra large: 32px

- **Border Radius:**
  - Small: 8px (buttons, inputs)
  - Medium: 12px (cards)
  - Large: 16px (modals)

- **Shadows:** Subtle elevation
  - Card shadow: 0 1px 3px rgba(0,0,0,0.1)
  - Modal shadow: 0 10px 25px rgba(0,0,0,0.15)

- **Touch Targets:** Minimum 44x44 points for all interactive elements

### Mobile UI Patterns
- Pull-to-refresh on all list screens
- Swipe actions for quick operations (future: delete, edit)
- Bottom sheets for forms and selections
- Toast notifications for success/error messages
- Loading skeletons during data fetch
- Floating action button for primary actions
- Native date picker modals
- Native number pad for numeric inputs
- Haptic feedback on button presses
- Keyboard-avoiding views on forms
- Safe area handling for notched devices

## Implementation Phases

### Phase 1: Project Setup and Core Infrastructure
- Initialize Expo project with TypeScript template
- Install required dependencies (@supabase/supabase-js, react-navigation, etc.)
- Configure Supabase client connection with existing credentials
- Set up navigation structure (stack, tabs)
- Implement basic app shell and routing
- Configure app.json with app name and bundle identifier
- Create app icon and splash screen
- Set up development environment with Expo Go
- Test basic navigation flow

### Phase 2: Authentication
- Create login screen with email/password inputs
- Create registration screen
- Implement Supabase auth integration
- Set up authentication state management with Zustand
- Create protected route component
- Implement logout functionality
- Add loading states for auth operations
- Test authentication flow thoroughly

### Phase 3: Family Member Management
- Create member list screen with data fetching from Supabase
- Implement add member screen and form
- Add class selection in member form
- Build member detail screen with tabs
- Implement edit member functionality
- Add delete member with confirmation
- Add pull-to-refresh functionality
- Implement loading and error states
- Test data synchronization with web app
- Add empty states

### Phase 4: Class Management
- Create class list screen
- Implement add class screen with price and currency
- Build class detail screen showing subscribed members
- Implement edit class functionality
- Add delete class with confirmation
- Implement class subscription management
- Add validation for class inputs
- Test class CRUD operations

### Phase 5: Payment Recording
- Create payment recording screen
- Implement mobile-optimized input fields
- Add family member selection dropdown
- Add currency selection dropdown
- Implement native number pad inputs
- Add date picker for payment date
- Implement form validation
- Save payments to Supabase with user_id
- Create payment history view (global and per-member)
- Display payment statistics
- Test payment flow end-to-end

### Phase 6: Attendance Tracking
- Create attendance marking screen
- Implement date selection for class date (defaults to today)
- Add class selection if multiple classes exist
- Add member selection for batch marking
- Save attendance records to Supabase with user_id
- Create attendance history screen
- Implement calendar view for attendance
- Display attendance count and statistics
- Add attendance heatmap visualization
- Add attendance trend chart
- Test attendance tracking flow

### Phase 7: Dashboard and Analytics
- Create home dashboard screen
- Implement summary cards with real-time data
- Add recent activity feed
- Create attendance analytics screen
- Implement charts and visualizations
- Add insights panel with key metrics
- Test all dashboard widgets

### Phase 8: Mobile Polish and Enhancement
- Implement offline data caching with AsyncStorage
- Add haptic feedback for interactions
- Optimize performance and loading times
- Add empty states for all screens
- Implement proper error handling with retry options
- Add confirmation dialogs for important actions
- Implement pull-to-refresh across all list screens
- Add loading skeletons
- Test on various device sizes (small phones, tablets)
- Optimize images and assets
- Test offline mode functionality

### Phase 9: Android Deployment
- Configure app.json for Android build
  - Set package name
  - Set version code and name
  - Configure permissions
- Create app icons in all required sizes (48dp to 512dp)
- Create adaptive icon for Android
- Generate production build with EAS Build
- Create Google Play Console listing
  - Write app description
  - Create feature graphic
  - Upload screenshots from various devices
  - Complete privacy policy
  - Fill content rating questionnaire
- Upload APK/AAB to Google Play Console
- Submit for review and publish to Google Play Store

### Phase 10: iOS Deployment (Optional)
- Configure app.json for iOS build
  - Set bundle identifier
  - Set version and build number
  - Configure permissions and info.plist
- Create iOS app icons in all required sizes
- Generate iOS build with EAS Build
- Set up Apple Developer account and certificates
- Submit to TestFlight for beta testing
- Test on multiple iOS devices
- Create App Store listing
  - Write app description
  - Upload screenshots for all device sizes
  - Add app preview video (optional)
  - Complete privacy questionnaire
- Submit for App Store review
- Respond to review feedback
- Publish to App Store

### Phase 11: Post-Launch
- Monitor crash reports and errors via Expo/Sentry
- Gather user feedback from app store reviews
- Plan feature enhancements based on usage
- Coordinate updates with web version
- Use Expo OTA updates for quick bug fixes
- Maintain app store presence with regular updates
- Respond to user reviews

## Mobile-Specific Features

### Implemented
- Pull-to-refresh on list screens
- Native date pickers
- Native number inputs with appropriate keyboards
- Touch-optimized button sizes (44x44 minimum)
- Mobile-responsive layouts
- Loading indicators and skeletons
- Error messages with retry options
- Confirmation dialogs for destructive actions
- Haptic feedback on interactions
- Keyboard-avoiding views
- Safe area handling for notched devices
- Offline data caching
- Fast app launch and transitions

### Future Enhancements
- Push notifications for payment reminders
- Background sync for offline changes
- Biometric authentication (fingerprint, Face ID)
- Camera integration for member photos
- Share functionality for reports (PDF, CSV export)
- Swipe gestures for quick actions (delete, edit)
- Calendar widget for class schedule
- Home screen widgets (iOS 14+, Android)
- Dark mode support
- Multiple language support (i18n)
- In-app messaging or notes for members
- Barcode/QR code scanning for quick member lookup
- Voice input for adding members
- Batch operations (bulk delete, bulk edit)
- Advanced filtering and sorting
- Data backup and restore
- Family member groups/categories
- Recurring payment setup
- Payment reminders and notifications
- Attendance goals and achievements
- Gamification elements

## App Store Requirements

### Android (Google Play Store)
- Application package name (e.g., com.yourstudio.yogamanagement)
- App icon 512x512 PNG (high-res)
- Adaptive icon (foreground + background layers)
- Feature graphic 1024x500 PNG
- Screenshots minimum 2, recommended 4-8:
  - Phone: 16:9 or 9:16 ratio
  - 7-inch tablet (optional)
  - 10-inch tablet (optional)
- Privacy policy URL (required)
- App description up to 4000 characters
- Short description up to 80 characters
- App category selection
- Content rating questionnaire completion
- Target age group declaration
- Store listing contact details
- Consent for Google Play policies

### iOS (Apple App Store)
- Bundle identifier (e.g., com.yourstudio.YogaManagement)
- App icons all required sizes via asset catalog:
  - 20pt, 29pt, 40pt, 60pt (iPhone)
  - 20pt, 29pt, 40pt, 76pt, 83.5pt (iPad)
  - 1024pt App Store icon
- Screenshots for all device types:
  - iPhone 6.7" display (required)
  - iPhone 6.5" display (required)
  - iPhone 5.5" display (optional)
  - iPad Pro 12.9" (if supporting iPad)
- App preview video (optional but recommended)
- Privacy policy URL (required)
- App description (no character limit)
- Keywords for search (100 character limit)
- Promotional text (170 characters)
- Support URL
- Marketing URL (optional)
- Age rating via questionnaire
- Export compliance information
- App Review information and demo account

## Privacy and Data Security

### Data Collection Disclosure
- User authentication data (email)
- Family member names
- Payment information (amounts, dates)
- Attendance records
- User-generated content

### Security Measures
- Supabase connection over HTTPS only
- Row Level Security policies enforced
- JWT authentication tokens
- Secure token storage in device keychain
- No third-party analytics tracking (initially)
- Local data encryption for cached information
- Secure credential handling

### Privacy Policy Requirements
- What data is collected
- How data is used
- Where data is stored (Supabase servers)
- User rights (access, deletion, export)
- Data retention policies
- Third-party service disclosure
- Contact information for privacy inquiries
- GDPR compliance (if applicable)
- CCPA compliance (if applicable)

### Data Deletion Process
- User can delete account from settings
- All user data deleted from Supabase
- Cascade deletion of related records
- Local cache cleared from device
- Confirmation required before deletion
- Irreversible action warning

## Success Metrics

### Technical Metrics
- App store approval within stated timelines
- Zero critical bugs at launch
- App launch time under 3 seconds
- Crash-free rate above 99%
- API response times under 500ms
- Offline functionality working correctly

### User Metrics
- Positive user reviews (target 4+ star rating)
- Download count tracking
- Daily active users (DAU)
- Monthly active users (MAU)
- User retention rate (day 1, 7, 30)
- Session length and frequency
- Feature adoption rates

### Business Metrics
- Time saved vs manual tracking
- User satisfaction survey results
- Support ticket volume
- App store ranking in category
- Feature request frequency
- Conversion rate (downloads to active users)

## Known Limitations at Launch

### Feature Limitations
- No multi-user/multi-studio support
- No photo upload for members
- No advanced reporting/export features
- No custom fields for members
- No payment reminders/notifications
- No recurring payment setup
- No invoice generation
- No SMS/email notifications
- No class scheduling/calendar
- No member check-in system
- No waiting list management

### Technical Limitations
- Requires internet connection for most features
- Limited offline capability
- No real-time collaborative editing
- No backup/restore from app
- No data migration tools
- No API for third-party integrations

## Development Environment

### Required Tools
- Node.js LTS version
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Git for version control
- Code editor (VS Code recommended)
- Expo Go app on physical devices

### Testing Environment
- Expo Go for development testing
- Real Android device for Android testing
- Real iOS device for iOS testing (requires Mac for building)
- EAS Build for production builds
- TestFlight for iOS beta testing
- Google Play Internal Testing for Android beta

### CI/CD (Future)
- EAS Build for automated builds
- GitHub Actions for testing
- Automated deployment pipelines
- Version management automation

## Budget Considerations

### One-Time Costs
- Google Play Console registration: $25
- Apple Developer Program: $99/year (if doing iOS)

### Ongoing Costs
- Expo free tier: $0 (adequate for launch)
- Expo paid plans: $29-$99/month (optional, for teams)
- Supabase free tier: $0 (shared with web)
- Supabase paid plans: $25+/month (if scaling)
- Domain for privacy policy: $10-15/year (if needed)

### Total Launch Investment
- Android only: $25 minimum
- Android + iOS: $124 first year, $99/year thereafter
- With Expo paid plan: +$348/year (if needed)

## Timeline Estimate

### Development Phase
- Project setup: 30-60 minutes
- Authentication: 2-3 hours
- Core features: 3-5 hours
- Polish and testing: 1-2 hours
- **Total development: 6-10 hours using Bolt.new**

### Testing Phase
- Internal testing: 1-2 days
- Bug fixes: 1-2 hours
- Device testing: 1 day

### Deployment Phase
- Android build and submission: 2-4 hours
- Android review: 1-3 days
- iOS build and submission: 2-4 hours (if applicable)
- iOS review: 3-7 days (if applicable)

### Total Timeline
- Android only: 5-7 days from start to live
- Android + iOS: 10-14 days from start to both live

## Dependencies and Prerequisites

### Existing Resources (Already Available)
- Supabase project with configured schema
- Database tables with RLS policies
- Web application for reference
- Supabase credentials (.env file)

### New Requirements
- Expo account (free to create)
- Google Play Developer account ($25)
- Apple Developer account ($99/year, optional)
- Physical Android device for testing
- Physical iOS device for testing (optional)
- Privacy policy webpage
- App store assets (icons, screenshots)

### Technical Dependencies
- @supabase/supabase-js: ^2.39.7
- expo: ~50.0.0+
- react-native: 0.73.0+
- react-navigation: ^6.0.0+
- zustand: ^4.5.0+
- @react-native-async-storage/async-storage
- expo-secure-store (for token storage)
- date-fns: ^3.3.1 (date handling)
- Additional Expo modules as needed

## Risk Mitigation

### Technical Risks
- **Risk:** App store rejection
  - **Mitigation:** Follow all guidelines, test thoroughly, have clear privacy policy
- **Risk:** Performance issues on older devices
  - **Mitigation:** Test on minimum spec devices, optimize performance
- **Risk:** Database schema changes breaking compatibility
  - **Mitigation:** Version API calls, handle gracefully
- **Risk:** Offline sync conflicts
  - **Mitigation:** Implement conflict resolution, last-write-wins strategy

### Business Risks
- **Risk:** Low user adoption
  - **Mitigation:** Focus on core features, gather feedback early
- **Risk:** Competing with web app
  - **Mitigation:** Mobile-specific features, convenience factor
- **Risk:** Maintenance burden
  - **Mitigation:** Use Expo OTA updates, minimize custom native code

### User Experience Risks
- **Risk:** Confusing navigation
  - **Mitigation:** Follow platform conventions, user testing
- **Risk:** Slow performance
  - **Mitigation:** Optimize queries, implement caching
- **Risk:** Data loss fears
  - **Mitigation:** Clear sync indicators, auto-save, confirmation dialogs

## Support and Maintenance Plan

### Monitoring
- Crash reporting via Expo/Sentry
- App store review monitoring
- User feedback collection
- Performance metrics tracking
- API error rate monitoring

### Update Frequency
- Bug fixes: As needed via OTA updates
- Minor features: Monthly
- Major features: Quarterly
- OS compatibility updates: As needed

### User Support
- App store review responses
- Support email address
- FAQ/help documentation
- In-app help (future)

### Maintenance Tasks
- Review and respond to app store reviews weekly
- Monitor crash reports daily
- Update dependencies quarterly
- Renew certificates annually (iOS)
- Coordinate with web app updates
- Test on new OS versions when released

## Success Criteria Checklist

### Pre-Launch
- [ ] All core features implemented and tested
- [ ] Authentication working correctly
- [ ] Data syncs with web app
- [ ] Tested on multiple device sizes
- [ ] Performance meets defined metrics
- [ ] App icons and splash screen created
- [ ] Privacy policy published
- [ ] App store listings prepared
- [ ] Screenshots captured
- [ ] Beta testing completed

### Launch
- [ ] App submitted to Google Play Store
- [ ] App submitted to Apple App Store (if applicable)
- [ ] Both store submissions approved
- [ ] Apps published and available for download
- [ ] Download links working
- [ ] Web app updated with app store links

### Post-Launch
- [ ] Zero critical bugs reported
- [ ] Positive user reviews (4+ stars average)
- [ ] Active user base growing
- [ ] Support requests manageable
- [ ] Performance metrics met
- [ ] Feature roadmap established
- [ ] Regular updates scheduled

## Conclusion

This mobile app represents a critical expansion of the Yoga Class Management System, bringing powerful management features to mobile devices. By leveraging Expo and React Native, we can build a professional native app without requiring deep native development expertise. The shared Supabase backend ensures data consistency across platforms while keeping development costs low.

The phased approach allows for iterative development, starting with Android to validate the concept before expanding to iOS. Using Bolt.new as the development platform makes this achievable for non-developers while still producing production-quality results.

Success depends on maintaining feature parity with the web application while adding mobile-specific enhancements that make the mobile experience compelling. Regular updates, user feedback incorporation, and attention to platform guidelines will ensure long-term success in the app stores.
