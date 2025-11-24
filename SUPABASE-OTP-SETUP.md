# Supabase OTP Configuration Guide

## Problem
After creating a new Supabase database, you're receiving magic links instead of OTP codes in your email.

## Solution

You need to configure Supabase to use OTP (one-time password) authentication. Here are two ways to fix it:

---

## Method 1: Supabase Dashboard Settings (Recommended)

### Step-by-Step Instructions:

1. **Go to Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Open Authentication Settings**
   - Click **Authentication** in the left sidebar
   - Click **Providers**

3. **Configure Email Provider**
   - Find and click on **Email** provider
   - You'll see several toggle options

4. **Enable OTP**
   - Toggle **ON**: "Enable Email OTP"
   - Toggle **OFF**: "Confirm email" (unless you want double opt-in)
   - Toggle **OFF**: "Enable Email Magic Link" (if you want ONLY OTP)

5. **Save Changes**
   - Scroll down and click **Save**

### Email Templates (Optional)

You can also customize the OTP email template:

1. Go to **Authentication** → **Email Templates**
2. Select **Magic Link** template
3. Customize the email content
4. Use `{{ .Token }}` variable to display the OTP code
5. Save your changes

---

## Method 2: Code Update (Already Applied)

The app code has been updated to disable magic links:

```typescript
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    shouldCreateUser: true,
    emailRedirectTo: undefined, // Disable magic link
  },
});
```

This tells Supabase to send ONLY the OTP code without a magic link.

---

## How OTP Works

### User Flow:
1. User enters email in the app
2. Supabase sends an email with a 6-digit OTP code
3. User enters the code in the app
4. App verifies the code with Supabase
5. User is authenticated

### Email Content:
The email will contain:
- A 6-digit OTP code (e.g., "123456")
- Expiration time (typically 60 minutes)
- Optional: Instructions on how to use it

---

## Verification

After configuring, test the flow:

1. **Send OTP**
   - Enter your email in the app
   - Tap "Send OTP"

2. **Check Email**
   - You should receive an email with a 6-digit code
   - The email should NOT contain a clickable magic link

3. **Enter Code**
   - Enter the 6-digit code in the app
   - Should successfully authenticate

---

## Troubleshooting

### Still receiving magic links?

**Check Email Template:**
- Go to Authentication → Email Templates
- Check the "Magic Link" template
- Ensure it shows the token/code properly

**Check Provider Settings:**
- Verify "Enable Email OTP" is ON
- Verify "Enable Email Magic Link" is OFF

### Not receiving any emails?

**Check SMTP Settings:**
- By default, Supabase uses their SMTP
- For production, configure custom SMTP:
  - Go to Authentication → Settings
  - Configure SMTP credentials

**Check Spam Folder:**
- OTP emails might be marked as spam
- Add noreply@supabase.com to your contacts

**Check Rate Limiting:**
- Supabase limits OTP requests (4 per hour per IP)
- Wait a few minutes and try again

### OTP codes not working?

**Check Code Expiry:**
- OTP codes expire after 60 minutes
- Request a new code if expired

**Check Code Entry:**
- Ensure you're entering the exact 6 digits
- No spaces or special characters

---

## Security Best Practices

1. **Enable Rate Limiting**
   - Supabase automatically limits OTP requests
   - Prevents brute force attacks

2. **Set Appropriate Expiry**
   - Default: 60 minutes
   - Shorter is more secure but less convenient

3. **Monitor Failed Attempts**
   - Check Supabase logs for suspicious activity
   - Look for repeated failed verifications

4. **Email Confirmation (Optional)**
   - Enable "Confirm email" for extra security
   - Users must verify email before first login
   - Adds extra step but improves security

---

## Production Considerations

### Custom SMTP (Recommended for Production)

Using Supabase's default SMTP is fine for development, but for production:

1. **Configure Custom SMTP**
   - Go to Authentication → Settings → SMTP Settings
   - Add your SMTP credentials (e.g., SendGrid, Mailgun, AWS SES)

2. **Benefits:**
   - Better deliverability
   - Custom sender email
   - No rate limits
   - Better analytics

### Email Deliverability

Improve OTP email delivery:
- Use a verified domain
- Configure SPF, DKIM, and DMARC records
- Warm up your sending domain
- Monitor bounce rates

---

## Summary

✅ **Code Updated**: App now requests OTP-only authentication
✅ **Dashboard Setup**: Follow steps to enable OTP in Supabase
✅ **Testing**: Verify you receive 6-digit codes instead of magic links

The app is now configured to use OTP authentication. Make sure to complete the Supabase dashboard configuration to fully enable OTP mode.
