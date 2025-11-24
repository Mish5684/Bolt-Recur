# Testing User Data Isolation

## Quick Test Guide

Follow these steps to verify that different users see different data:

### Step 1: Test with First User

1. **Start the app**
   ```bash
   npm start
   ```

2. **Login with first email**
   - Use email: `user1@test.com`
   - Enter the OTP code sent to your email
   - Or check Supabase dashboard for the magic link

3. **Create test data for User 1**
   - Add a family member: "Alice" (Self)
   - Add a class: "Yoga - Morning Session"
   - Subscribe Alice to the Yoga class
   - Add an attendance record for today
   - Add a payment record

4. **Note what you see**
   - You should see 1 family member (Alice)
   - You should see 1 class (Yoga - Morning Session)

### Step 2: Test with Second User

1. **Logout from the app**
   - Find and tap the logout button
   - Or clear app data and restart

2. **Login with different email**
   - Use email: `user2@test.com`
   - Enter the OTP code

3. **Verify empty state**
   - You should see NO family members
   - You should see NO classes
   - The app should show onboarding prompts

4. **Create different test data for User 2**
   - Add a family member: "Bob" (Self)
   - Add a class: "Piano Lessons"
   - Subscribe Bob to Piano
   - Add attendance and payment records

5. **Verify User 2 only sees their data**
   - You should see ONLY Bob (not Alice)
   - You should see ONLY Piano Lessons (not Yoga)

### Step 3: Verify Data Isolation

1. **Switch back to User 1**
   - Logout from User 2
   - Login again as `user1@test.com`

2. **Confirm User 1 sees original data only**
   - Should see ONLY Alice
   - Should see ONLY Yoga class
   - Bob and Piano should be completely invisible

3. **Switch back to User 2**
   - Logout from User 1
   - Login again as `user2@test.com`

4. **Confirm User 2 sees their data only**
   - Should see ONLY Bob
   - Should see ONLY Piano class
   - Alice and Yoga should be completely invisible

## Expected Results

✅ **PASS**: Different users see completely different data
❌ **FAIL**: If any user can see data from another user, there's a security issue

## What to Look For

### Good Signs (Secure)
- Each user has a completely isolated view
- No cross-user data visibility
- Onboarding appears for new users
- Data persists when logging back in

### Bad Signs (Security Issue)
- User 2 can see User 1's family members
- User 2 can see User 1's classes
- All users see the same records
- Data from multiple users appears mixed together

## Troubleshooting

### If users can see each other's data:

1. **Check RLS is enabled**
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public';
   ```
   All tables should show `rowsecurity = true`

2. **Check policies exist**
   ```sql
   SELECT tablename, policyname
   FROM pg_policies
   WHERE schemaname = 'public'
   ORDER BY tablename;
   ```
   Should see policies like "Users can view own classes", etc.

3. **Check user_id is being set**
   - Verify user_id is NOT NULL in database
   - Check application code assigns user_id on insert

### If login doesn't work:

1. **Check Supabase connection**
   - Verify .env file has correct SUPABASE_URL and SUPABASE_ANON_KEY
   - Check network connectivity

2. **Check OTP in email**
   - Some email providers may delay magic link emails
   - Check spam folder
   - Use Supabase dashboard to see auth logs

## Database Verification (Optional)

If you have database access, you can verify directly:

```sql
-- Check that records have different user_ids
SELECT
  'family_members' as table_name,
  user_id,
  count(*) as record_count
FROM family_members
GROUP BY user_id;

-- Should show separate counts for each user_id
```

## Success Criteria

✅ User isolation is working correctly when:
1. User 1 cannot see User 2's data
2. User 2 cannot see User 1's data
3. Each user sees only their own records
4. New users start with empty state
5. Logging out and back in preserves correct user data
