---
title: Recur - Simple Onboarding Experience
version: 1.0.0
date: 2025-11-19
---

# Recur - Simple Onboarding PRD

## Overview
A minimalist, contextual onboarding experience that guides first-time users to add their first family member and class through just-in-time prompts on the home screen.

## Design Philosophy
- No separate onboarding screens or wizards
- Contextual prompts appear exactly when needed
- Users learn by doing, not by reading lengthy tutorials
- Clean, elegant login experience with minimal text
- Smart detection of setup completion status

## User Stories

### Login Experience
- As a new user, I want to see what Recur does immediately when I open the app
- As a user, I want a clean, uncluttered login screen that doesn't overwhelm me
- As a user, I want to understand the app's value proposition in one glance

### First-Time Setup
- As a new user, I want to be gently guided to add my first family member
- As a new user, I want to know I need to add a class without feeling forced
- As a user, I want prompts to disappear once I've completed the setup
- As a user, I don't want to see prompts for things I've already done

## Technical Requirements

### Login Screen Updates
- Display app icon from assets/icon.png (80-100pt size)
- App name: "Recur" (large, prominent heading below icon)
- Tagline: "Organize your classes, keep your rhythm."
- Maintain existing OTP login functionality
- Clean visual hierarchy with generous spacing
- Subtle color usage (primary text dark, tagline medium gray)

### Detection Logic
- Check if user has any family members in database
- Check if any family member has classes assigned
- Run checks on HomeScreen mount and data refresh
- Store check results in Zustand state
- Efficient queries to minimize database calls

### Prompt System
- **Family Member Prompt**
  - Condition: User has zero family members
  - Message: Friendly encouragement to add first member
  - Action: Navigate to AddFamilyMemberScreen
  - Dismissible: Yes, but persists on next visit
  - Auto-hide: When first family member is added

- **Class Prompt**
  - Condition: User has family members but no classes assigned
  - Message: Explain importance of adding classes
  - Action: Navigate to AddClassScreen
  - Dismissible: Yes, but persists on next visit
  - Auto-hide: When first class is added
  - Display: Only after family member prompt is resolved

### Display Rules
- Show only one prompt at a time
- Priority order: Family members first, then classes
- Re-evaluate conditions on screen focus
- Re-evaluate after pull-to-refresh
- Prompts should feel helpful, not nagging

## UI/UX Specifications

### Login Screen Design
- Icon: 80-100pt, centered, from assets/icon.png
- Typography:
  - App name: 32-36pt, bold, dark gray (#1F2937)
  - Tagline: 16-18pt, regular, medium gray (#6B7280)
  - Spacing: 12pt between icon and name, 8pt between name and tagline
- Layout: Centered, vertical alignment
- Background: Clean white or subtle gradient
- Icon positioned above app name

### Prompt Design
- Style: Card-based overlay or banner at top of HomeScreen
- Background: White with subtle shadow
- Border: Rounded corners (12-16pt radius)
- Padding: 16-20pt all sides
- Icon: Small friendly illustration from Lucide React
- Text: Clear, concise, action-oriented
- Button: Primary blue, prominent, 44pt touch target
- Animation: Gentle fade-in when appearing
- Dismissal: X button in corner

### Prompt Content

**Family Member Prompt:**
- Icon: UserPlus from lucide-react
- Headline: "Add your first family member"
- Body: "Start by adding yourself or a family member who attends classes."
- Button: "Add Family Member"

**Class Prompt:**
- Icon: Calendar from lucide-react
- Headline: "Add your first class"
- Body: "Add a class to start tracking attendance and payments."
- Button: "Add Class"

## Implementation Phases

### Phase 1: Login Screen Enhancement
- Update LoginScreen.tsx with app icon from assets/icon.png
- Add app name "Recur" with proper styling
- Add tagline with visual hierarchy
- Ensure proper spacing and alignment
- Test on various screen sizes

### Phase 2: Detection Logic
- Add helper functions to recur store for checking setup status
- Create function to check if family members exist
- Create function to check if classes are assigned
- Add state variables for prompt visibility
- Implement efficient Bolt Database queries

### Phase 3: Prompt Components
- Create reusable PromptCard component
- Build FamilyMemberPrompt with specific content
- Build ClassPrompt with specific content
- Add dismiss functionality
- Implement smooth animations

### Phase 4: HomeScreen Integration
- Add prompt display logic to HomeScreen
- Implement conditional rendering based on setup status
- Wire up navigation to AddFamilyMemberScreen and AddClassScreen
- Add re-check logic on screen focus
- Test prompt sequencing

### Phase 5: Polish and Testing
- Test entire flow from login to completion
- Verify prompts disappear appropriately
- Test edge cases (rapid navigation, back button, etc.)
- Ensure prompts work with pull-to-refresh
- Cross-device testing

## Database Schema (Reference)
- Uses existing Bolt Database schema
- family_members table for checking member existence
- classes table for checking class assignments
- Queries should be optimized with proper indexing

## Success Metrics
- 90%+ of new users add at least one family member within first session
- 80%+ of users add at least one class within first session
- Average time to complete setup under 60 seconds
- Zero user reports of confusing or overwhelming onboarding

## Out of Scope
- Multi-step tutorial screens
- Video walkthroughs
- Feature tours
- Tooltips on every screen
- Onboarding replay functionality (for initial version)

## Technical Notes
- Use existing Zustand store patterns
- Leverage existing navigation structure
- No new external dependencies required
- Bolt Database queries should use existing patterns
- Use Lucide React for prompt icons
- App icon loaded from assets/icon.png using React Native Image component


