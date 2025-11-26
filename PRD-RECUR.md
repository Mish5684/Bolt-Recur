testing sync 11:30 11/26
---
title: Recur - Recurring Class Management System
version: 1.0.0
platform: Web + Mobile (Android first, iOS later)
domain: getrecur.app
date: 2025-10-23
---

# Recur - Product Requirements Document

## Overview
Recur is a mobile-first application for individuals and parents to track attendance and expenses for any recurring classes (yoga, piano, math tutoring, badminton, swimming, dance, etc.) for themselves or their family members.

## Product Vision
Track all your recurring classes in one place. Whether you're managing your own yoga sessions, your child's piano lessons, or multiple kids' sports activities - Recur keeps everything organized with simple attendance tracking and expense management.

## Target Audience
- **Primary**: Parents managing kids' extracurricular activities
- **Secondary**: Adult learners taking recurring classes (yoga, music, language, fitness)
- **Tertiary**: Class instructors tracking their own students (future feature)

## Key Differentiators
- **Class-agnostic**: Works for ANY recurring class type (not just yoga or sports)
- **Family-focused**: Track multiple family members in one app
- **Simple & Fast**: Quick attendance marking and payment recording
- **Multi-currency**: Support for global users (USD, INR, EUR, etc.)
- **Mobile-first**: Designed for on-the-go access

## User Stories

### Family Member Management
- As a user, I want to add family members (myself, kids, spouse) to track their classes
- As a user, I want to view all family members in one place
- As a user, I want to see detailed class information for each member
- As a user, I want to manage multiple people's classes separately

### Class Management
- As a user, I want to create different class types (yoga, piano, math, sports, etc.)
- As a user, I want to assign family members to specific classes
- As a user, I want to track multiple classes per family member
- As a user, I want to rename or delete classes as needed
- As a user, I want to set pricing per class for expense tracking

### Attendance Tracking
- As a user, I want to quickly mark attendance for each class
- As a user, I want to view attendance history in a calendar
- As a user, I want to see attendance patterns and trends
- As a user, I want to edit attendance dates if I make a mistake
- As a user, I want to see how many classes attended vs paid

### Payment/Expense Management
- As a user, I want to record payments made for classes
- As a user, I want to specify how many classes were paid for
- As a user, I want to track expenses in multiple currencies
- As a user, I want to see payment history over time
- As a user, I want to know how many prepaid classes remain
- As a user, I want to see total expenses per class and per member

### Analytics & Insights
- As a user, I want to see attendance trends over time
- As a user, I want to know when I'm running low on prepaid classes
- As a user, I want to see monthly/yearly attendance summaries
- As a user, I want to visualize attendance patterns with charts
- As a user, I want insights on class participation rates

## Technical Requirements

### Frontend (Web)
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS for responsive design
- **State Management**: Zustand for client state
- **Routing**: React Router v6
- **Date Handling**: date-fns for date operations
- **Icons**: Lucide React
- **Build Tool**: Vite

### Frontend (Mobile)
- **Framework**: React Native with Expo (managed workflow)
- **Platform**: Android first, iOS later
- **Navigation**: React Navigation (tabs + stack)
- **State Management**: Zustand (shared with web)
- **UI Components**: React Native Paper or NativeWind
- **Offline Support**: AsyncStorage for local caching

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with OTP (email/phone)
- **Real-time**: Supabase subscriptions
- **Security**: Row Level Security (RLS) policies
- **API**: Supabase client SDK (@supabase/supabase-js)

### Database Schema

#### family_members
- `id` (UUID, primary key)
- `name` (text) - Member name
- `class_id` (UUID, nullable, FK to classes) - Default class assignment
- `user_id` (UUID, FK to auth.users) - Owner
- `created_at` (timestamptz)

#### classes
- `id` (UUID, primary key)
- `name` (text) - Class name (e.g., "Piano Lessons", "Yoga", "Math Tutoring")
- `price_per_class` (numeric, optional) - Price per session
- `currency` (text, default 'USD') - Currency code
- `user_id` (UUID, FK to auth.users) - Owner
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### payments
- `id` (UUID, primary key)
- `family_member_id` (UUID, FK) - Who the payment is for
- `class_id` (UUID, FK) - Which class
- `classes_paid` (integer) - Number of sessions paid for
- `amount` (numeric) - Amount paid
- `currency` (text, default 'USD') - Currency code
- `payment_date` (date) - When payment was made
- `user_id` (UUID, FK to auth.users) - Owner
- `created_at` (timestamptz)

#### class_attendance
- `id` (UUID, primary key)
- `family_member_id` (UUID, FK) - Who attended
- `class_id` (UUID, FK) - Which class
- `class_date` (date) - Date of attendance
- `user_id` (UUID, FK to auth.users) - Owner
- `created_at` (timestamptz)

#### class_subscriptions
- `id` (UUID, primary key)
- `family_member_id` (UUID, FK) - Member
- `class_id` (UUID, FK) - Class they're subscribed to
- `user_id` (UUID, FK to auth.users) - Owner
- `created_at` (timestamptz)

### Security Requirements
- All tables have RLS enabled
- Users can only access their own data (auth.uid() check)
- Cascade deletes to prevent orphaned records
- Secure token storage in mobile app
- HTTPS-only communication

## Design System

### Color Palette
- **Primary**: Teal (#14b8a6) - Professional, calm, suitable for productivity apps
- **Secondary**: Gray for supporting elements
- **Success**: Green (#10b981) - Confirmations, positive actions
- **Warning**: Amber (#f59e0b) - Low balance alerts
- **Error**: Red (#ef4444) - Validation errors
- **Background**: White (#ffffff) / Light gray (#f9fafb)
- **Text**: Dark gray (#1f2937) primary, Medium gray (#6b7280) secondary

**Note**: Avoiding purple/indigo/violet hues as per design requirements

### Typography
- **Headings**: Bold, 20-24pt
- **Body**: Regular, 16pt
- **Small text**: 14pt
- **Line height**: 150% for body, 120% for headings
- **Fonts**: System fonts (SF Pro for iOS, Roboto for Android, System UI for web)

### Spacing
- Base unit: 8px
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px

### Components
- **Buttons**: 8px border radius, proper touch targets (44x44 minimum)
- **Cards**: 12px border radius, subtle shadows
- **Inputs**: 8px border radius, clear focus states
- **Modals**: 16px border radius

## Implementation Phases

### Phase 1: Codebase Refactoring (Current) ✅
- Rename "setu" to "recur" throughout codebase ✅
- Update store names and imports ✅
- Update package.json and index.html ✅
- Remove yoga-specific terminology ✅
- Organize code for platform-agnostic reuse

### Phase 2: Mobile App - Core Setup (Week 1)
- Initialize React Native project with Expo
- Set up navigation structure (tabs + stack)
- Configure Supabase connection
- Implement authentication (OTP)
- Create basic app shell

### Phase 3: Mobile App - Family & Classes (Week 2)
- Family member list and CRUD operations
- Class list and CRUD operations
- Member-class subscription management
- Basic member details view

### Phase 4: Mobile App - Attendance & Payments (Week 3)
- Attendance calendar UI
- Mark attendance functionality
- Payment recording form
- Payment history view
- Attendance history view

### Phase 5: Mobile App - Analytics & Polish (Week 4)
- Dashboard with summary cards
- Attendance trend charts
- Attendance heatmap
- Insights panel
- Mobile UX improvements (pull-to-refresh, haptic feedback)
- Offline support

### Phase 6: Mobile App - Testing & Assets (Week 5)
- Test on real Android devices
- Fix bugs and edge cases
- Create app icon and splash screen
- Capture screenshots for Play Store
- Write store listing

### Phase 7: Android Launch (Week 6)
- Generate production APK/AAB
- Set up Google Play Developer account
- Create store listing
- Submit for review
- Launch on Google Play Store

### Phase 8: Marketing Website - Setup (Week 7)
- Initialize Next.js project
- Design homepage
- Create features page
- Build pricing page
- Set up download page

### Phase 9: Marketing Website - SEO Content (Week 8-9)
- Write 15-20 blog posts
- Optimize all pages for SEO
- Implement structured data
- Set up sitemap and robots.txt
- Deploy to getrecur.app

### Phase 10: Growth & Iteration (Week 10+)
- Monitor analytics and metrics
- Gather user feedback
- Fix bugs and issues
- Plan iOS version
- Add requested features

## Marketing Website Structure

### Core Pages
- **Homepage** (getrecur.app): Hero, features, download CTAs
- **Features** (/features): Detailed feature breakdown
- **Pricing** (/pricing): Free tier details, future premium
- **Download** (/download): App store links, QR codes
- **Use Cases** (/use-cases): Different class types and scenarios
- **Support** (/support): FAQ, troubleshooting, contact
- **About** (/about): Mission, team, contact
- **Privacy Policy** (/privacy): Required for app stores
- **Terms of Service** (/terms): Legal protection

### Blog Strategy (SEO)
Target keywords:
- "class attendance tracking app"
- "recurring class expense management"
- "track kids extracurricular activities"
- "manage piano lesson payments"
- "sports class attendance tracker"

Content types:
- How-to guides (3000+ words)
- Comparison articles (Recur vs spreadsheets)
- Resource pages (class management checklist)
- Use case stories (parent tracking multiple kids)

## Success Metrics

### Mobile App (3 months)
- 1,000+ downloads on Android
- 4.0+ star rating
- 30% D30 retention rate
- 99%+ crash-free rate
- 50%+ weekly active users mark attendance

### Marketing Website (3 months)
- 1,000+ monthly organic visitors
- Ranking top 10 for 5+ target keywords
- 5-10% conversion rate (visit → app download)
- 20+ quality backlinks

### Business Metrics
- 100+ weekly active users
- 20+ positive reviews/testimonials
- Clear product-market fit signals
- Low churn rate

## Future Roadmap

### iOS Launch (Phase 2)
- Port mobile app to iOS
- Test on iOS devices
- Submit to Apple App Store
- Launch on both platforms

### Web App (Phase 3)
- Extract shared code into monorepo
- Build React web app reusing business logic
- Deploy as PWA
- Maintain feature parity

### Premium Features (Phase 4)
- Push notifications (class reminders)
- Calendar integration (Google Calendar, Apple Calendar)
- Recurring payment setup
- Invoice generation and export
- Multi-user family accounts
- Advanced analytics and reporting
- Data export (CSV, PDF)

### Advanced Features (Phase 5+)
- Dark mode
- Multiple language support (i18n)
- Class scheduling and calendar view
- Photo uploads for members
- Notes and comments
- Goals and achievements
- WhatsApp/SMS reminders
- Payment app integration

## Monetization Strategy

### Free Tier (Launch)
- 3 classes
- 5 family members
- Basic attendance tracking
- Basic payment tracking
- Basic analytics

### Premium Tier (Future)
- Unlimited classes
- Unlimited family members
- Advanced analytics
- Data export
- Push notifications
- Priority support
- **Price**: $2.99/month or $29.99/year

### Family Plan (Future)
- Multiple users per account
- Shared family data
- **Price**: $4.99/month

## Competitive Advantages

1. **Class-agnostic**: Not limited to yoga or sports
2. **Simple UX**: Easy to use for non-technical parents
3. **Mobile-first**: Built for on-the-go tracking
4. **Privacy-focused**: User data stays private
5. **Affordable**: Free for most users, cheap premium
6. **Multi-currency**: Works for global users
7. **Offline-capable**: Works without internet

## Risks & Mitigation

### Technical Risks
- **App store rejection**: Follow all guidelines, test thoroughly
- **Performance on older devices**: Test on minimum spec devices
- **Database schema changes**: Version API calls carefully
- **Offline sync conflicts**: Implement conflict resolution

### Business Risks
- **Low user adoption**: Focus on SEO and word-of-mouth
- **Competition from free spreadsheets**: Emphasize ease of use
- **Monetization challenges**: Start free, test willingness to pay

### User Experience Risks
- **Confusing navigation**: Follow platform conventions
- **Slow performance**: Optimize queries and caching
- **Data loss fears**: Clear sync indicators, auto-save

## Launch Checklist

### Pre-Launch
- [x] Refactor codebase to "Recur" branding
- [ ] Build mobile app with all core features
- [ ] Test on multiple Android devices
- [ ] Create app store assets
- [ ] Write privacy policy
- [ ] Build marketing website
- [ ] Write initial blog content
- [ ] Set up analytics

### Launch Day
- [ ] Submit app to Google Play Store
- [ ] Deploy website to getrecur.app
- [ ] Announce on social media
- [ ] Email friends and family
- [ ] Post in relevant communities

### Post-Launch
- [ ] Monitor crash reports
- [ ] Respond to reviews
- [ ] Fix critical bugs
- [ ] Publish regular blog posts
- [ ] Build backlinks
- [ ] Plan iOS version

## Conclusion

Recur represents a unique opportunity in the class management space by focusing on simplicity and broad applicability. Unlike competitors focused on specific class types or studio management, Recur serves individual parents and learners tracking any recurring classes.

By launching mobile-first on Android with a strong SEO-driven marketing website, we can validate the concept with minimal investment while building toward a multi-platform product with sustainable monetization.

Success depends on maintaining simplicity, delivering reliable performance, and building organic growth through search and word-of-mouth.
