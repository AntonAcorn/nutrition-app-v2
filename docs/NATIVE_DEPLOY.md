# Native deploy — iOS и Android

Пошагово: от изменений в коде до билдов в App Store и Play Store.

> **Когда это нужно?** Не каждый раз. SPA-фиксы (JS/CSS/UI) на rumblyeats.org
> подтягиваются автоматически — только закрой/открой приложение. Native rebuild
> нужен только когда меняется:
> - `capacitor.config.ts`
> - папки `frontend/ios/` или `frontend/android/`
> - entitlements / intent-filters / манифесты
> - native плагины Capacitor
> - patch-ios.js
> - app icons / splash screens
> - `versionCode` / `versionName` / build number

---

## Перед билдом — что должно быть готово на твоей машине

| Что | iOS | Android |
|---|---|---|
| Xcode (последняя стабильная) | ✅ | — |
| Android Studio + Android SDK | — | ✅ |
| Apple Developer account активен | ✅ | — |
| Google Play Console account активен | — | ✅ |
| Release keystore `~/keystores/rumblyeats-release.jks` существует | — | ✅ |
| `frontend/android/app/google-services.json` для FCM | — | ✅ (если хочешь push) |
| Java 21 (для backend; для Android вне зависимости) | ✅ | ✅ |

---

## Общий шаг — обновить веб-часть

Из корня репо:

```sh
cd frontend
git pull origin main
npm install              # на случай если в package.json что-то менялось
npm run build            # собирает SPA в dist/
npm run cap:sync         # копирует dist/ в ios/ и android/, запускает patch-ios.js
```

`npm run cap:sync` важен — обычный `npx cap sync` пропустит patch-ios.js, и
Google Sign-In плагин снова сломается. Всегда `npm run cap:sync`.

---

## iOS — детальная инструкция

### 1. Поднять номер версии

В Xcode (см. шаг 3) можно поднять через UI; либо отредактировать `Info.plist`
напрямую — но проще в Xcode.

### 2. Запустить cap sync

```sh
cd frontend
npm run cap:sync
```

### 3. Открыть Xcode workspace

```sh
open ios/App/App.xcworkspace
```

> ⚠️ **Открывай `.xcworkspace`, НЕ `.xcodeproj`**. Capacitor использует CocoaPods,
> и `.xcodeproj` не подтягивает зависимости.

### 4. Проверить настройки в Xcode

Слева в навигаторе клик на проект **App**. Открой вкладки:

**Signing & Capabilities**:
- ✅ **Team**: твой Apple Developer Team (X2TU497SDG)
- ✅ **Bundle Identifier**: `com.aiduparc.rumblyeats`
- ✅ **Automatically manage signing** должно быть включено
- ✅ Capabilities (все должны быть в списке):
  - Associated Domains (`applinks:rumblyeats.org`)
  - HealthKit
  - Push Notifications
  - Sign In with Apple
- Если чего-то не хватает — `+ Capability` сверху

**General → Identity**:
- ✅ **Version**: например `1.0.1` (semver, видно юзерам)
- ✅ **Build**: поднять **на 1** относительно прошлого билда (например `5 → 6`).
  Apple требует чтобы Build был уникальным для каждой заливки в App Store.

### 5. Выбрать target и схему

В тулбаре сверху:
- **Scheme**: `App` (должно стоять по умолчанию)
- **Destination**: `Any iOS Device (arm64)`. НЕ симулятор.

### 6. Archive

`Product` → `Archive` (Cmd+Shift+B → нет, это Build. Archive — в меню Product).

Билд занимает 3–7 минут. Если всё ок, откроется окно **Organizer** с твоим
новым архивом.

### 7. Загрузить в App Store Connect

В **Organizer**:
1. Выбери свой свежий архив
2. Жми **Distribute App**
3. Method: **App Store Connect** → **Next**
4. Destination: **Upload** → **Next**
5. Options: оставь дефолты → **Next**
6. Signing: **Automatically manage signing** → **Next**
7. Жми **Upload**. Ждёшь 2–5 минут.

### 8. Дождаться обработки в App Store Connect

1. Открой https://appstoreconnect.apple.com → **TestFlight**
2. Через 5–15 минут билд появится в списке (с пометкой «Processing»)
3. Когда обработается, появится зелёная галка
4. Если хочешь сразу запушить TestFlight beta-тестерам — выбери build, добавь в
   internal testing group

### 9. Submit for App Store Review

Только когда уверен что готов:
1. App Store Connect → твоё приложение → **App Store** таб
2. В разделе **Builds** жми **+** → выбери свежий обработанный билд
3. Заполни **What's New in This Version** (что нового — важно для review)
4. Скриншоты / app preview — если что-то менялось
5. Сверху жми **Add for Review** → **Submit to App Review**

Review занимает 1–3 дня. Если отклонят, придёт письмо с причиной.

---

## Android — детальная инструкция

### 1. Поднять `versionCode`

Открой `frontend/android/app/build.gradle`. Найди:
```gradle
versionCode 5
versionName "1.0"
```

Подними **`versionCode` на 1** (например `5 → 6`). Это число должно расти
монотонно — Play Store отвергнет билд с тем же или меньшим `versionCode`.

`versionName` обнови если меняешь видимую юзеру версию (например `1.0` → `1.0.1`).

### 2. Запустить cap sync

```sh
cd frontend
npm run cap:sync
```

### 3. Убедиться что есть `google-services.json` (если используешь FCM)

```sh
ls frontend/android/app/google-services.json
```

Если файла нет — Android push (FCM) работать не будет. Скачай его из Firebase
Console → Project settings → твоё Android app → **google-services.json**.

⚠️ **Не коммить** этот файл в git — он содержит ключи.

### 4. Собрать AAB

```sh
cd frontend/android
./gradlew bundleRelease
```

Билд занимает 1–3 минуты. AAB будет в:
```
frontend/android/app/build/outputs/bundle/release/app-release.aab
```

### 5. Загрузить в Play Console

1. Открой https://play.google.com/console
2. Выбери приложение **Rumbly Eats**
3. Слева в меню: **Тестирование и выпуск** → **Тестирование** → **Внутреннее тестирование**
   (или **Test and release** → **Testing** → **Internal testing**)
4. Сверху справа: **Create new release**
5. **Upload** → выбери `app-release.aab` → жди обработки (1–3 минуты)
6. Заполни **Release name** (например `1.0.1 (6)`) и **Release notes**
7. **Review release** → **Start rollout to Internal testing**

Билд станет доступен внутренним тестерам через 5–15 минут.

### 6. Promote to production

Когда внутреннее тестирование прошло:
1. Внутреннее тестирование → найди свой релиз → **Promote release**
2. Выбери таргет:
   - **Closed testing** — для приватной беты
   - **Open testing** — публичная бета (любой может попасть по ссылке)
   - **Production** — основной prod
3. **Review release** → **Start rollout**

Play review занимает 1–7 дней (быстрее чем Apple). Для **обновлений** часто
проходит за сутки.

---

## После заливки — обновление на устройстве для теста

### iOS

1. На iPhone открой приложение **TestFlight** (если нет — скачай из App Store)
2. Войди под тем же Apple ID что и Developer account
3. **Rumbly Eats** в списке → **Update**
4. Открой обновлённое приложение

### Android

1. На устройстве открой **Google Play Store**
2. Войди под аккаунтом, добавленным во внутренние тестеры
3. **Rumbly Eats** → **Update** (или **Install** если первый раз)
4. Открой обновлённое приложение

Можно также установить APK напрямую через ADB:
```sh
cd frontend/android
./gradlew assembleRelease    # вместо bundleRelease для APK
adb install -r app/build/outputs/apk/release/app-release.apk
```

---

## Troubleshooting

### iOS: «Provisioning profile doesn't include the entitlement»

В Xcode → **Signing & Capabilities** проверь что Automatic signing включено и
выбран правильный Team. Если нужная capability добавлена недавно (типа
Associated Domains), Xcode может сначала не подтянуть новый profile. Жми
**Try Again** или удали и добавь capability заново.

### iOS: Build номер не растёт автоматически

Это вручную в Xcode → General → Build. Apple не делает auto-increment.

### Android: Build падает с `keystore.properties not found`

`frontend/android/keystore.properties` должен существовать на машине где
билдишь. Format:
```
storeFile=/Users/acorn/keystores/rumblyeats-release.jks
storePassword=...
keyAlias=rumblyeats-upload
keyPassword=...
```

⚠️ Не коммить.

### Android: `versionCode 6 already exists`

Кто-то (ты или сборка) уже занял этот номер в Play Console. Подними ещё на 1.

### Google Sign-In снова не работает на Android после rebuild

Проверь что после `cap sync` файл `GoogleSignInPlugin.java` всё ещё в
`frontend/android/app/src/main/java/com/aiduparc/rumblyeats/`. Cap sync его не
удаляет (он не cap-managed), но иногда `gradlew clean` может что-то поломать.

### iOS: `cap sync` затирает `Package.swift`

Это ожидаемо. `npm run cap:sync` сразу после копирования запускает
`scripts/patch-ios.js`, который восстанавливает GoogleSignIn зависимость в
`Package.swift`. Если запускал `npx cap sync ios` напрямую без npm wrap —
запусти `node frontend/scripts/patch-ios.js` руками.

---

## Что не нужно делать каждый раз

**Не нужно** перекачивать AASA / assetlinks.json на rumblyeats.org — они уже
на сервере, deploy frontend контейнера их обновит автоматически.

**Не нужно** менять Universal Links / App Links конфигурацию — она в native
билдах и AASA на сервере.

**Не нужно** запускать backend deploy при native rebuild — это разные миры.

---

## Когда стоит сделать новый native rebuild

Прямо сейчас (накопилось за сессию):
- ✅ Google Sign-In Android (новый файл + plugin)
- ✅ Associated Domains entitlement (Universal Links iOS)
- ✅ App Links intent-filter (App Links Android)
- ✅ FCM-плагин backend (если настроишь Firebase project — добавишь
      google-services.json)

После этого rebuild можно отложить пока:
- не меняется entitlements / интент-фильтры
- не подключаешь RevenueCat SDK (это native плагин)
- не подключаешь новые Capacitor плагины

---

## См. также

- [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) — что ещё должно быть готово
  перед лончем
- [`PAYWALL_FLIP.md`](PAYWALL_FLIP.md) — что произойдёт с native билдом, когда
  будешь подключать RevenueCat SDK
