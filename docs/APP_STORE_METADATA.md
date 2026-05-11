# App Store Metadata — Rumbly Eats

Paste-ready copy for App Store Connect. Canada storefront.

---

## App Name (max 30)
```
Rumbly Eats
```

## Subtitle (max 30)
```
Bad days don't break you
```

## Promotional Text (max 170, can be edited without resubmission)
```
One bad day shouldn't break your streak. Rumbly Eats has a calorie bank — deposit on light days, withdraw on heavy ones, take a relax day when life happens.
```

## Description (max 4000)

First three lines are visible without tapping "more" — keep them load-bearing.

```
One bad day shouldn't break your progress.

Rumbly Eats is a food coach for people who keep quitting calorie apps after a bad meal. Built around a calorie bank: every day under target deposits, bad days withdraw, and two "relax days" a month let real life happen.

🏦 CALORIE BANK
Every day under target deposits calories into your bank. Going over? Withdraw up to 200 kcal. Your streak holds. Your deficit holds. You keep going.

🎂 RELAX DAYS
Two free-pass days every month. Birthdays, weddings, the week your kid was sick — they don't count against you. Built for actual humans.

🧠 COACH WATCHES YOUR WEEK
Patterns the dashboard hides. "Wednesdays you go 30% over target." "After late dinners your wellbeing drops 1.5 stars." Quiet pushes when something matters, not three reminders a day.

⚡ TRACK HOW FOOD MAKES YOU FEEL
Pick what matters: energy, mood, weight, performance. Coach connects what you eat to how you feel. No more guessing why Tuesdays feel rough.

🍎 LOG IN SECONDS
Snap a photo. Say "chicken rice and salad." Scan a barcode. Save your favorite meals for one-tap re-log. Built to be the lightest part of your day.

🍃 SYNC WITH APPLE HEALTH
Steps, sleep, weight — Rumbly Eats reads them and weaves them into Coach insights.

PRIVACY
Your food log is yours. We don't sell it. Sign in with Apple — no email, no password to forget.

No ads. No guilt. Just a coach.
```

## Keywords (max 100 chars, comma-separated, no spaces)
```
calorie,coach,macro,nutrition,protein,weight,fitness,diet,health,wellness,track,log,bank,streak
```

(91 chars; Apple indexes title + subtitle separately, so brand and "rumbly eats" don't need to repeat here.)

## Category
- Primary: **Health & Fitness**
- Secondary: **Food & Drink**

## Age Rating
4+ (no objectionable content; calorie data is educational)

## URLs
- Marketing URL (optional): `https://rumblyeats.org`
- Support URL (required): `https://rumblyeats.org/support` (or contact email page)
- Privacy Policy URL (required): `https://rumblyeats.org/privacy`

## Screenshots — order and captions

App Store shows the first 3 screenshots without scrolling. Lead with the differentiator.

| # | Screen | Caption (overlay text, ≤40 chars) |
|---|--------|-----------------------------------|
| 1 | Calorie Bank badge active ("−200 from bank") on dashboard | **Bad day? Withdraw, keep going.** |
| 2 | Relax Day calendar with 🎂 marked | **2 free-pass days every month.** |
| 3 | Coach Insights card with pattern callout | **Coach finds what you can't see.** |
| 4 | Quick Add (camera/voice/barcode + saved meals) | **Log in 2 seconds.** |
| 5 | Weekly Recap card with share button | **Your week, in numbers worth sharing.** |
| 6 | Onboarding welcome slide ("Bad days happen") | **Built for real life, not perfection.** |

## What's New (release notes — for v1.0 launch)
```
Hi 👋 — Rumbly Eats is live.

It's a food coach with a calorie bank: deposit on light days, withdraw on heavy ones, plus two free-pass relax days a month. No streak-breaking over one bad meal.

Comments and bug reports go to feedback@rumblyeats.org. We read everything.
```

## Apple App Privacy (data collected)

Required to fill in App Store Connect privacy questionnaire.

### Data Linked to User

| Category | Specific data | Purpose |
|---|---|---|
| Contact Info | Email Address | App Functionality (account, sign-in via Google/Apple) |
| Contact Info | Name | App Functionality (Apple Sign-In may pass user's name on first login) |
| Health & Fitness | Food logs, weight entries, wellbeing ratings, fasting windows | App Functionality |
| User Content | Other User Content (typed meal descriptions, coach focus notes, AI-generated meal items from photo/voice) | App Functionality |
| Identifiers | User ID (Apple ID / Google account ID) | App Functionality |
| Diagnostics | Crash Data, Performance Data (Sentry) | App Functionality |
| Usage Data | Product Interaction (PostHog analytics — screen views, feature usage) | Analytics |

### Data NOT Collected
Location, Contacts, Browsing History, Search History, Financial Info, Sensitive Info, Purchases (handled by Apple), Advertising Data.

### Tracking
None. We do not use third-party SDKs for advertising or cross-app/site tracking.

### Privacy questionnaire wording
"We use your food log only to power the app for you. We don't sell or share it with third parties for advertising."

## Monetization (v1.0)

**v1.0 ships free with no in-app purchases.** App Store Connect → App Information → "Does your app use Apple's StoreKit framework?" = **No**. Pricing tier = **Free**.

### Future paywall guardrails (do not violate when monetizing)

If/when we add a subscription in a later version, the paywall must meet Apple guideline 3.1.2(a) AND avoid the Cal-AI removal pattern (April 2026). Concrete rules - bake into the implementation review:

1. **The headline price is the price the user is charged.** If the plan is $39.99/year, show "$39.99 per year" in the largest type. Do NOT show "$0.77/week" larger than the actual annual charge. Cal-AI was pulled for putting the weekly-equivalent above the real billing amount.
2. **Free-trial toggle must clearly show what auto-renews.** A toggle for "Start free trial" must say next to it "Renews at $X/year after 7 days." Not in fine print, not collapsed.
3. **Cancel must work from inside the app.** Settings → Subscription → Manage opens Apple's standard subscription management. No "contact support to cancel."
4. **All purchases go through Apple IAP.** No external billing links, no Stripe redirect, no "buy on our website for less." Cal-AI's primary removal cause.
5. **Restore Purchases button is visible on every paywall.** Required by guideline 3.1.1.
6. **No dark-pattern colour priority** - the "Continue free / Maybe later" option must be readable, not greyed-out to ghost-button invisibility.

A free-tier-only ship is the safest path for v1.0. Hold this section as the bar for any future paid tier.

### Notes on photo/voice retention (verified 2026-05-10)
- **Meal photos:** uploaded as `multipart/form-data` to `/api/photo-analysis`, forwarded to OpenAI Vision, and **not persisted** — `photo_analysis_drafts` stores only the parsed `analysis_json`, no `image_url`/blob column. Apple "Photos or Videos" → **Data Not Collected**.
- **Voice:** transcribed **on-device** (Web Speech / iOS Speech). The backend's `/api/voice-analysis` receives plain text (`request.description`), not audio. Apple "Audio Data" → **Data Not Collected**.
- The AI-parsed meal items (calories, macros, food names) are stored as text under User Content → Other User Content, linked to the user, for the meal history.
