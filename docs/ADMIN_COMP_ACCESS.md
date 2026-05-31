# Admin: comp Pro access

Как выдавать Pro вручную нужным людям (друзья, бета-тестеры, журналисты,
инфлюенсеры) без покупки через App Store / RevenueCat.

> **Кратко**: один Bearer-токен в env, три HTTP endpoint'a, всё.

---

## Один раз: настроить токен на сервере

1. Сгенерировать длинный случайный токен:
   ```sh
   openssl rand -hex 32
   ```

2. Сохранить его в **1Password / Bitwarden** под именем `Rumbly admin token`.
   Если потеряешь — придётся ротировать (все старые ссылки на токен в
   скриптах перестанут работать).

3. Добавить в `/opt/nutrition-app-v2/.env`:
   ```env
   NUTRITION_ADMIN_TOKEN=<твой токен из шага 1>
   ```

4. Перезапустить backend, чтобы env подхватился:
   ```sh
   ssh <user>@<host>
   cd /opt/nutrition-app-v2
   docker compose --env-file .env -f infra/docker/docker-compose.prod.yml \
     up -d --force-recreate backend
   ```

5. Проверить, что не 503-ит:
   ```sh
   docker logs --tail 5 docker-backend-1 | grep -i admin
   ```
   Должна быть строка `Admin entitlement endpoints active (token length=...)`.

---

## Команды

Везде ниже подставь свой токен в `<TOKEN>`. Лучше один раз положить его в
переменную окружения у себя локально:

```sh
export RUMBLY_ADMIN_TOKEN='<твой токен>'
```

тогда команды можно копировать as-is.

### Посмотреть статус юзера

```sh
curl -s "https://rumblyeats.org/api/admin/entitlement?email=friend@example.com" \
  -H "Authorization: Bearer $RUMBLY_ADMIN_TOKEN" \
  | jq
```

Ответ:
```json
{
  "userId": "5cf5d98f-127b-4cc5-92fb-8784c9f5d23c",
  "email": "friend@example.com",
  "tier": "FREE",
  "trialEndsAt": "2026-05-08T19:31:00Z",
  "proActiveUntil": null,
  "founderNumber": null
}
```

`tier` бывает: `FREE`, `TRIAL`, `PRO`, `FOUNDER`.

### Выдать Pro на год

```sh
curl -s -X POST "https://rumblyeats.org/api/admin/grant-pro" \
  -H "Authorization: Bearer $RUMBLY_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"friend@example.com","days":365}' \
  | jq
```

Ответ — тот же формат что и lookup, уже с обновлённым `proActiveUntil`.

### Выдать «lifetime» Pro (5 лет)

Для близких друзей, на постоянку:

```sh
curl -s -X POST "https://rumblyeats.org/api/admin/grant-pro" \
  -H "Authorization: Bearer $RUMBLY_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"friend@example.com","days":1825}' \
  | jq
```

5 лет ≈ lifetime. Через 5 лет либо обновишь, либо приложение давно умрёт.

### Отозвать Pro

Если выдал по ошибке или человек больше не должен иметь доступ:

```sh
curl -s -X POST "https://rumblyeats.org/api/admin/revoke-pro?email=friend@example.com" \
  -H "Authorization: Bearer $RUMBLY_ADMIN_TOKEN" \
  | jq
```

`proActiveUntil` сдвинется в прошлое (`now - 1s`), tier станет FREE/TRIAL.

### Продлить уже выданный Pro

Просто вызови `grant-pro` ещё раз — он перезаписывает `proActiveUntil`
новым значением `now + days`. Не аддитивно (не +N к существующему сроку),
а абсолютно: будет действовать N дней от момента вызова.

---

## Что специально НЕ доступно

**Grant Founder** через admin endpoint не сделан намеренно.

Founder Lifetime ограничен **200 покупками** на пользователей (видно в UI
как "X / 200 left"). Если бы я раздал друзьям 50 founder-слотов через
admin, публичный счётчик показывал бы "150 left" — а реальных покупок
было бы 100. Маркетинг через нечестную scarcity = плохо.

Для постоянных comp'ов используй Pro на 1825 дней. Юзер видит просто
"Pro активен до 2031-...", без упоминания Founder-статуса.

---

## Безопасность

- Токен сверяется **constant-time** — нет timing attacks.
- `/api/admin/**` whitelisted в SessionAuthFilter, **не** требует логина
  юзера (свой auth через Bearer).
- Без `NUTRITION_ADMIN_TOKEN` env-переменной endpoint'ы возвращают **503**
  (fail loud) — забыл проставить = ничего не работает, а не дыра в auth.
- В логи пишется `admin granted Pro email=... days=...` для аудита.

Если кажется что токен утёк (попал в скрин, в чат, в git history) — сразу
ротируй: смени env на новое значение, перезапусти backend. Старый токен
сразу перестаёт работать.

---

## Ротация токена

1. Сгенерировать новый: `openssl rand -hex 32`.
2. Обновить в `.env` на сервере.
3. `docker compose ... up -d --force-recreate backend`.
4. Обновить запись в 1Password.
5. Старый токен сразу даёт 401.

---

## Откуда это всё в коде

- Контроллер: `backend/src/main/java/com/aiduparc/nutrition/entitlement/api/AdminEntitlementController.java`
- Whitelist в session-фильтре: `SessionAuthFilter.PUBLIC_PATTERNS`
- Конфиг: `nutrition.admin.token` в `application.yml`, env `NUTRITION_ADMIN_TOKEN`
- Используется `EntitlementService.setProActiveUntil()` и `revokePro()` —
  тот же путь, что у RevenueCat webhook.
