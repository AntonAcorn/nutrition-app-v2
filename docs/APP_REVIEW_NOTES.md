# App Review Notes — Rumbly Eats

Paste this verbatim into App Store Connect → App Information → **App Review Information** → **Notes** field (max 4000 chars).

Apple's reviewer reads this BEFORE testing the build. Good notes shave 1-2 days off review time and prevent confused-reviewer rejections.

---

## Notes (paste-ready)

```
Rumbly Eats is a calorie and nutrition tracker with a behavioral coach layer. The differentiator is a "calorie bank" that prevents streak-breaking on bad days.

KEY FLOW TO TEST (≤2 minutes):

1. Tap "Sign in with Apple" — creates the account in one step. No email verification screen, no password setup. Apple's relay email is accepted.

2. Onboarding (3 welcome slides about the bank/relax-days/coach, then 3-step profile setup, then a "How it works" screen with 3 cards). All slides are skippable.

3. From the dashboard, tap "+ Add food" (large blue button bottom right). Quick Add sheet opens with four input methods:
   - Camera: snap a meal photo, AI estimates calories (requires backend + OpenAI)
   - Gallery: pick existing photo
   - Voice: describe the meal verbally
   - Barcode: scan packaged food
   Plus search of saved meals / 3M+ products database, and "+ Custom entry" for manual macros.

4. After the first meal is logged, the Coach Tour pops up automatically — 5 slides about how the calorie bank works. The bank badge then appears on the dashboard showing "+X to bank tonight" (a projected deposit based on your current intake).

PERMISSIONS (each requested with clear justification at the moment of use):
- Camera + Photos: meal photo logging
- Microphone + Speech Recognition: voice meal logging
- HealthKit (read): steps, active calories, sleep, weight — used to factor activity into nutrition coach insights
- HealthKit (write): saving the user's weight back to Apple Health when they enter it
- Push Notifications: proactive coach insights (plateau detection, streak break follow-up, weekly recap). Never more than once per day.

THIRD-PARTY SERVICES (disclosed in privacy policy):
- OpenAI Vision: photo analysis for nutrition estimates
- PostHog: anonymised product analytics (EU region servers)
- Sentry: anonymised crash reporting

BACKEND:
- The app is a thin client. Photo analysis, coach insights, and account data live on rumblyeats.org. The backend is live and serving production traffic during this review.
- AI photo analysis takes 2-5 seconds during normal operation. If the OpenAI API is having issues, the app falls back to manual entry without crashing.

ANTI-SHAME POSITIONING:
The Coach copy is intentionally non-shaming. We do not use language like "binge", "cheat day", "fell off". The calorie bank lets users withdraw up to 200 kcal on over-target days without breaking their streak. Users get two relax days per month where overage doesn't withdraw at all.

NO IN-APP PURCHASES IN v1.0:
The app is fully free at launch. Premium features (advanced bank withdrawals, weekly coach recap, additional relax days) will be added in a later version with StoreKit IAP.

PRIVACY AND DATA DELETION:
Users can delete their account in-app: Me tab → Delete account. This permanently removes all data immediately. The full privacy policy is at https://rumblyeats.org/privacy and support is at https://rumblyeats.org/support.

CONTACT FOR REVIEW QUESTIONS:
support@rumblyeats.org — replies within 24 hours.

Thanks for reviewing!
```

---

## Demo account

**NOT NEEDED.** Sign in with Apple lets the reviewer create their own test account in one tap using their Apple ID. The reviewer's Apple ID gets a fresh account on the backend.

If you'd want to provide a pre-populated demo account anyway (e.g., to show the dashboard with a week of data), create one manually and include credentials here. Not recommended unless the reviewer asks — keeps the review path closer to a real first-time user.

## Contact information

In App Store Connect → App Review Information → Sign-In Information / Contact:

- **First name / Last name:** твоё реальное имя
- **Phone number:** реальный (Apple звонит крайне редко, только при сложных rejections)
- **Email:** `support@rumblyeats.org`

## Если Apple задаст вопросы

Apple reviewer пишет через App Store Connect → Resolution Center. Уведомления приходят на email, который указан в Contact. Отвечать желательно в течение 24 часов — иначе review может встать в очередь снова.
