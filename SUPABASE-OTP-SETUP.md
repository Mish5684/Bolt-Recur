# Supabase OTP Configuration Guide

## Problem
After creating a new Supabase database, you're receiving magic links instead of OTP codes in your email.

## ⚠️ CRITICAL: This MUST Be Fixed in Supabase Dashboard

**The app code CANNOT control which type of email Supabase sends.** This is controlled entirely by your Supabase project configuration. You MUST update your Supabase dashboard settings - there is no code change that can fix this.

## Solution

You need to configure Supabase Authentication settings in the dashboard:

---

## Step-by-Step Fix (Supabase Dashboard)

### 🔧 Configuration Steps:

**Step 1: Open Supabase Dashboard**
- Go to: https://supabase.com/dashboard
- Select your project from the list

**Step 2: Navigate to Authentication**
- Click **"Authentication"** in the left sidebar
- Click **"Providers"** tab at the top

**Step 3: Configure Email Provider**
- Scroll down to find the **"Email"** provider
- Click on it to expand the settings panel

**Step 4: Toggle Settings (MOST IMPORTANT)**

You'll see these toggle switches - configure them EXACTLY as shown:

✅ **"Enable Email OTP"** → Toggle **ON** (must be enabled)
❌ **"Enable Email Magic Link"** → Toggle **OFF** (must be disabled)
❌ **"Confirm email"** → Toggle **OFF** (unless you want double opt-in)

**Step 5: Save**
- Scroll to the bottom of the settings panel
- Click the **"Save"** button
- Wait for the success message

### ⏱️ Changes Take Effect Immediately
Once saved, the next authentication email will use OTP instead of magic links.

### Email Templates (Optional)

You can also customize the OTP email template:

1. Go to **Authentication** → **Email Templates**
2. Select **Magic Link** template
3. Customize the email content
4. Use `{{ .Token }}` variable to display the OTP code
5. Save your changes

---

## Why Code Changes Don't Work

Some developers try to set `emailRedirectTo: undefined` or other options in the code, but **these do not control whether magic links are sent**. The authentication method (OTP vs Magic Link) is controlled by:

1. **Supabase project configuration** (Dashboard settings)
2. **Email template settings** (Dashboard → Email Templates)

The app code only triggers the authentication flow - it doesn't control what Supabase sends.

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
