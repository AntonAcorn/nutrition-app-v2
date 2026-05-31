# Launch checklist

Всё что нужно сделать, проверить, и иметь под рукой перед лончем.
Маркируй галочки как делаешь.

> **Если что-то не сделано — что сломается?** В каждом блоке есть колонка
> "Без этого", чтобы понимать риск пропуска.

---

## 0. Имеющиеся env-переменные

Краткий справочник — какой env что включает.

| Env | Где | Дефолт | Что включает |
|---|---|---|---|
| `POSTGRES_*` | server `.env` | стартер из .env.example | БД (обязательно) |
| `APP_DOMAIN`, `APP_BASE_URL`, `CADDY_SITE_ADDRESS` | server | localhost | Production URL |
| `OPENAI_API_KEY` | server | пустой | AI photo + voice + coach |
| `COACH_OPENAI_API_KEY` | server | falls back to OPENAI_API_KEY | Coach AI отдельно если хочешь разные ключи |
| `GOOGLE_CLIENT_ID/SECRET` | server | пустой | Google OAuth (server-side flow) |
| `GOOGLE_NATIVE_CLIENT_IDS` | server | iOS default | Allowlist for native Google Sign-In idTokens |
| `SMTP_*` + `MAIL_FROM` | server | пустой | Verify email + password reset |
| `VAPID_*` | server | пустой | Web push (PWA только) |
| `NUTRITION_PUSH_APNS_*` | server | пустой | iOS native push |
| `FIREBASE_*` | server | пустой | Android native push (FCM) |
| `NUTRITION_PUSH_APNS_BUNDLE_ID` | server | com.aiduparc.rumblyeats | APNs target bundle |
| `REVENUECAT_WEBHOOK_AUTH` | server | пустой | RevenueCat webhook authentication |
| `TRIAL_EMAIL_SALT` | server | dev placeholder | Trial gaming protection |
| `PAYWALL_ENABLED` | server | false | Master switch на платную версию |
| `PAYWALL_LAUNCHED_AT` | server | пустой | Grandfather window для beta-юзеров |
| `NUTRITION_ADMIN_TOKEN` | server | пустой | Comp Pro grants admin endpoint |
| `SENTRY_DSN`, `VITE_SENTRY_DSN` | server | пустой | Error reporting (backend + frontend) |
| `VITE_POSTHOG_KEY` | server | пустой | Frontend analytics |
| `VITE_VAPID_PUBLIC_KEY` | server | пустой | Frontend web push subscribe |

Полный шаблон в [`/.env.example`](../.env.example).

---

## 1. Backend infrastructure

| Item | Без этого |
|---|---|
| [ ] Postgres работает, миграции применены (V50 минимум) | Нет приложения |
| [ ] Backend healthcheck `/api/health` 200 | Caddy → 502 |
| [ ] Caddy с https + правильным доменом | Нет HTTPS, App Store откажет |
| [ ] Frontend контейнер работает + отдаёт SPA с правильным cache-control | Stale chunks |

## 2. Auth (login / signup)

| Item | Без этого |
|---|---|
| [ ] Email/password registration работает | Большинство users не могут зайти |
| [ ] Verify email приходит (Resend настроен) | Юзеры залогинены но не верифицированы |
| [ ] Forgot password приходит | Юзер забыл пароль = потерян |
| [ ] Google Sign-In (iOS) работает | iOS users теряют этот канал |
| [ ] Google Sign-In (Android) работает | Android users теряют этот канал |
| [ ] Apple Sign-In iOS работает | Apple отклонит app review |
| [ ] ToS checkbox показан перед register | PIPEDA нарушение |
| [ ] Age gate 13+ enforced | App Store отклонит |

## 3. AI / OpenAI

| Item | Без этого |
|---|---|
| [ ] `OPENAI_API_KEY` установлен | Photo / voice analysis ломается |
| [ ] AI rate limits проверены: 30/день анти-abuse, 1/день free quota | Bill bomb |
| [ ] AI cost budget global cap $5/день стоит | Без верхней границы spend |
| [ ] Coach gate (`assertCoachAccess`) применяется к /coach endpoints | Free user может жечь GPT-4 |

## 4. Push notifications

### iOS

| Item | Без этого |
|---|---|
| [ ] APNs `.p8` ключ загружен в env | iOS push не работают |
| [ ] `NUTRITION_PUSH_APNS_KEY_ID` + `NUTRITION_PUSH_APNS_TEAM_ID` | Те же |
| [ ] APNs environment правильный (production для App Store / TestFlight) | Push silently dropped |
| [ ] App.entitlements содержит `aps-environment: production` | Push не зарегистрируется |

### Android

| Item | Без этого |
|---|---|
| [ ] Firebase project создан, `google-services.json` в `frontend/android/app/` | Push регистрация падает |
| [ ] `FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY` в env | Backend не может слать FCM |
| [ ] AndroidManifest содержит `com.google.gms.google-services` плагин (auto-applied if google-services.json present) | Build fails |

### Веб push (опционально, для PWA users)

| Item | Без этого |
|---|---|
| [ ] `VAPID_PUBLIC_KEY` и `VAPID_PRIVATE_KEY` | Web push не работают |
| [ ] `VITE_VAPID_PUBLIC_KEY` matches backend public key | Subscribe вызовы 400 |

## 5. Email доставка

| Item | Без этого |
|---|---|
| [ ] Resend domain `rumblyeats.org` verified | Emails в спам |
| [ ] Resend API key в `SMTP_PASSWORD` | SMTP отвергает auth |
| [ ] `MAIL_FROM=noreply@rumblyeats.org` | From rejected |
| [ ] DMARC / SPF / DKIM на rumblyeats.org правильные | Emails в спам / отвергаются |
| [ ] Test: register fresh email → letter приходит за < 30 sec | Юзер ждёт и уходит |

## 6. Deep links (Universal / App Links)

| Item | Без этого |
|---|---|
| [ ] `apple-app-site-association` на `https://rumblyeats.org/.well-known/` | iOS не открывает app по ссылкам из email |
| [ ] AASA содержит правильный `appID` (Team ID + bundle) | Universal Links не работают |
| [ ] `assetlinks.json` на `.well-known/` с обоими SHA-256 (upload + Play app signing) | Android App Links не работают |
| [ ] Both served as `application/json` (nginx уже настроен) | iOS / Android отвергают |
| [ ] iOS app rebuilt с Associated Domains entitlement | Universal Link бесполезен |
| [ ] Android app rebuilt с intent-filter (autoVerify=true) | App Link бесполезен |
| [ ] Test: открыть `https://rumblyeats.org/email-verified/` из Mail → откроется app | UX поломан |

## 7. Monetization / paywall

См. отдельный [`PAYWALL_FLIP.md`](PAYWALL_FLIP.md) для пошагового флипа.

| Item | Без этого |
|---|---|
| [ ] `PAYWALL_ENABLED` решено (false для open beta, true для launch) | Юзеры либо в beta либо в paid limbo |
| [ ] `PAYWALL_LAUNCHED_AT` установлен на дату флипа | Beta-юзеры сразу падают в FREE — burn goodwill |
| [ ] `TRIAL_EMAIL_SALT` уникальный для prod, сохранён в 1Password | Trial gaming работает |
| [ ] `NUTRITION_ADMIN_TOKEN` установлен (см. [`ADMIN_COMP_ACCESS.md`](ADMIN_COMP_ACCESS.md)) | Не можешь comp'ить друзей |
| [ ] RevenueCat dashboard настроен (см. PAYWALL_FLIP.md шаг 1) | Покупки не учитываются |
| [ ] Webhook URL в RC указан на rumblyeats.org | Покупки не доходят до backend |
| [ ] `REVENUECAT_WEBHOOK_AUTH` совпадает на backend и RC dashboard | Webhook 401-ит |
| [ ] App Store products созданы | Юзер не может купить |
| [ ] Play products созданы | Те же |
| [ ] PaywallSheet кнопки реально дёргают RC SDK (currently `disabled`) | Юзер видит paywall, но купить не может |

## 8. Compliance (App Store / PIPEDA / GDPR)

| Item | Без этого |
|---|---|
| [ ] /privacy /terms /support pages live | Apple отклонит |
| [ ] Account deletion работает (Profile → Delete account) | Apple отклонит (5.1.1(v)) |
| [ ] Subscription manage link reachable (Profile tools) | Apple отклонит |
| [ ] Subscription disclosures на PaywallSheet (auto-renew, cancel link, Terms/Privacy) | Apple отклонит (3.1.2) |
| [ ] Push opt-in / opt-out работает | Apple отклонит (4.5.4) |
| [ ] Privacy disclosures для всех 3rd parties (OpenAI, Sentry, PostHog, RC, FCM, APNs) | Юридический риск |
| [ ] BMI safety check — target weight с BMI < 17 блокируется | Eating disorder риск (1.4.1) |

## 9. Observability

| Item | Без этого |
|---|---|
| [ ] `SENTRY_DSN` backend стоит → ошибки в Sentry проекте | Не узнаешь о ломке |
| [ ] `VITE_SENTRY_DSN` frontend стоит → JS-ошибки в Sentry | Не узнаешь о ломке UI |
| [ ] `VITE_POSTHOG_KEY` стоит (опционально) → analytics events | Воронка слепая |
| [ ] Тест: triggered ошибка в Sentry виднa | False sense of security |

## 10. Native rebuild (когда готов)

Все накопленные за разработку native-фиксы (Google Sign-In Android, FCM,
Universal Links, App Links, Associated Domains) применятся только после
пересборки и установки нового билда.

**iOS**:
```sh
cd frontend
npm run cap:sync
open ios/App/App.xcworkspace
# Xcode: Product → Archive → Distribute App → App Store Connect
```

В Xcode проверить:
- [ ] Build number поднят
- [ ] Signing & Capabilities содержит:
  - Associated Domains (`applinks:rumblyeats.org`)
  - Push Notifications
  - Sign In with Apple
  - HealthKit

**Android**:
```sh
cd frontend
# bump versionCode in android/app/build.gradle
npm run cap:sync
cd android && ./gradlew bundleRelease
# upload AAB to Play Console
```

Проверить:
- [ ] `versionCode` поднят
- [ ] `google-services.json` в `android/app/` (для FCM)
- [ ] AAB подписан release-keystore
- [ ] Play App Signing включён в Play Console

---

## Что обычно "забывают"

Список граблей за эту сессию:

1. **Google Sign-In Android** — backend и frontend готовы, но Android-плагин
   native, нужен rebuild + добавить Web Client ID в `GOOGLE_NATIVE_CLIENT_IDS`.
2. **APNs creds** — backend стартанёт без них и молча отключит iOS push.
   Проверить логи на `APNs credentials not configured`.
3. **FCM creds** — то же самое для Android. Без `FIREBASE_*` env Android push
   не работает.
4. **Universal Links** — даже после deploy AASA + entitlement, требуется
   rebuild iOS app для активации.
5. **App Links** — то же для Android: intent-filter в манифесте + assetlinks
   на rumblyeats.org + rebuild AAB.
6. **TRIAL_EMAIL_SALT** — без установки prod использует dev-placeholder,
   gaming protection слабая.
7. **PAYWALL_LAUNCHED_AT** — без него флип `PAYWALL_ENABLED=true` сразу
   роняет beta-юзеров в FREE без grandfather.
8. **NUTRITION_ADMIN_TOKEN** — без него admin endpoints 503-ят.
9. **REVENUECAT_WEBHOOK_AUTH** — без него RC webhook 503-ит и retries
   останавливаются через несколько дней.
10. **PaywallSheet кнопки disabled** — UI готов, но RevenueCat SDK во фронте
    ещё не подключён. До этого юзер видит «Coming soon», купить не может.

---

## После лонча — мониторить

- Sentry: новые ошибки за первые 24-48 часов
- Backend logs: `docker logs -f docker-backend-1 | grep -iE "error|exception"`
- App Store Connect: review status
- Play Console: rollout status + crash rate
- PostHog: signup → onboarding → first log conversion rate
- RevenueCat dashboard: trial start rate, conversion rate
