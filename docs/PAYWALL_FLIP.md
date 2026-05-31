# Paywall flip — open beta → paid

Как переключить приложение из «бесплатно для всех» в «Free + 7-day trial + Pro».

> **TL;DR**:
> 1. Купить + настроить RevenueCat
> 2. Установить плагин во фронт и подключить кнопки покупки
> 3. Создать продукты в App Store Connect + Play Console + RevenueCat
> 4. Поставить два env на сервере: `PAYWALL_ENABLED=true` и `PAYWALL_LAUNCHED_AT`
> 5. Передеплоить backend
>
> После шага 4 все существующие beta-юзеры получат свежий 7-day trial,
> новые регистрации — тоже честный 7-day trial, купившие Pro / Founder —
> переходят прямо в свой tier.

---

## Что произойдёт в момент флипа

| Группа юзеров | До флипа | После флипа |
|---|---|---|
| **Beta-юзеры** (signup до `PAYWALL_LAUNCHED_AT`) | PRO (open-beta tier) | **TRIAL** 7 дней от даты лонча (grandfather) |
| **Юзеры в активном RC-trial** | PRO | TRIAL до конца их сроков |
| **Купившие Pro через RC** | PRO | PRO, `pro_active_until` сохранён |
| **Founder Lifetime** (первые 200) | PRO | FOUNDER навсегда |
| **Новые юзеры после флипа** | — | TRIAL 7 дней с момента регистрации |

Grandfather-механика встроена в `EntitlementService.tierOf()`: если у юзера
`trial_ends_at < PAYWALL_LAUNCHED_AT` (т.е. trial истёк в open-beta), то
trial виртуально пересчитывается как `LAUNCHED_AT + 7 days`. Никаких
DB-миграций не нужно — пересчёт идёт в read-time.

---

## Чек-лист перед флипом

### 1. RevenueCat dashboard

- [ ] Создать аккаунт https://app.revenuecat.com
- [ ] Project: Rumbly Eats
- [ ] App: iOS + Android
- [ ] Linked App Store Connect (через shared secret) — для iOS subscription state
- [ ] Linked Play Console (через service account JSON) — для Android
- [ ] Products привязаны и видны в RC dashboard
- [ ] Entitlement key `pro` создан (через него tier проверяется)
- [ ] **Webhook** настроен:
  - URL: `https://rumblyeats.org/api/webhooks/revenuecat`
  - Authorization header: тот же что в `REVENUECAT_WEBHOOK_AUTH` env на сервере
  - События: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE, REFUND, NON_RENEWING_PURCHASE, PRODUCT_CHANGE, UNCANCELLATION

### 2. App Store Connect

- [ ] **Subscription group**: `Rumbly Pro`
  - [ ] `rumbly_pro_yearly` — Auto-renewable, $39.99/year, 7-day intro free
  - [ ] `rumbly_pro_monthly` — Auto-renewable, $5.99/month
- [ ] **Non-renewing**: `rumbly_founder_lifetime` — $79.99
- [ ] Subscription metadata заполнен: name, description, review screenshot
- [ ] Tax category выставлена
- [ ] Pricing approved (Apple даёт автоматически по тире)

### 3. Play Console

- [ ] Same product IDs: `rumbly_pro_yearly`, `rumbly_pro_monthly`,
  `rumbly_founder_lifetime`
- [ ] Pricing + countries
- [ ] Subscription benefits заполнены

### 4. Backend env

В `/opt/nutrition-app-v2/.env` добавь / проверь:

```env
# Master switch.
PAYWALL_ENABLED=true

# Дата лонча (ISO-8601, UTC). Юзеры созданные ДО получают fresh trial.
PAYWALL_LAUNCHED_AT=2026-06-15T00:00:00Z

# Salt для email-hash защиты от gaming (НЕ менять после установки)
TRIAL_EMAIL_SALT=<уже должен быть установлен>

# RevenueCat webhook secret — должен совпадать с тем что в RC dashboard
REVENUECAT_WEBHOOK_AUTH=<тот же токен>

# Если используешь Founder — список product_id'ов для RC
NUTRITION_REVENUECAT_FOUNDER_PRODUCT_IDS=rumbly_founder_lifetime
```

### 5. Frontend

- [ ] RevenueCat SDK установлен: `npm i @revenuecat/purchases-capacitor`
- [ ] Инициализация на startup с user UUID: `Purchases.logIn(userUuid)`
- [ ] Кнопки `paywall-plan--primary` и др. в `PaywallSheet.tsx` вызывают
  `Purchases.purchaseProduct(productId)` (сейчас они `disabled`)
- [ ] iOS Bundle ID совпадает с App Store Connect
- [ ] Android package name совпадает с Play Console
- [ ] Цены динамические из RC SDK (`getProducts()`), а не hardcoded строки

### 6. Native rebuild

- [ ] iOS: rebuild + upload в App Store Connect → TestFlight → submit
- [ ] Android: rebuild AAB + upload в Play Console → submit

---

## Команда флипа (когда всё готово)

```sh
ssh <user>@<host>
cd /opt/nutrition-app-v2

# 1. Открыть .env
nano .env

# 2. Поменять / добавить:
#    PAYWALL_ENABLED=true
#    PAYWALL_LAUNCHED_AT=2026-06-15T00:00:00Z

# 3. Перезапустить backend, чтобы env подхватился
docker compose --env-file .env -f infra/docker/docker-compose.prod.yml \
  up -d --force-recreate backend

# 4. Проверить
docker logs --tail 10 docker-backend-1 | grep -i entitlement
#    Должна быть строка:
#    entitlement initialised paywallEnabled=true paywallLaunchedAt=2026-06-15T00:00Z
```

После этого:
- Frontend юзеров автоматически переключится (получат новый
  `/api/me` ответ с `tier=TRIAL` или соответствующим)
- PaywallSheet начнёт показывать реальные плашки покупки вместо
  "Coming soon" (зависит от того что фронт сделал в шаге 5)

---

## Откат (если что-то пошло не так)

Просто переключить обратно:

```env
PAYWALL_ENABLED=false
```

Затем `up -d --force-recreate backend`. Все вернутся в open-beta tier.
Никаких потерь данных. Купленные через RC подписки сохраняются в БД
(`pro_active_until`, `founder_number`), просто не используются пока
`paywallEnabled=false`.

---

## Comp-аккаунты после флипа

Видишь [`ADMIN_COMP_ACCESS.md`](ADMIN_COMP_ACCESS.md). После флипа можешь
выдавать Pro вручную друзьям через admin endpoint без покупки в RC.

---

## Что забыли проверить — chek list

Открой [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) — там полный список
env-переменных, файлов, и компонентов которые должны быть на месте.
