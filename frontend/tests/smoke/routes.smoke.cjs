const puppeteer = require('puppeteer-core')

const URL = process.env.SMOKE_URL || 'http://127.0.0.1:5174'
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const errors = []
const consoleErrors = []

async function expect(label, fn) {
  try {
    await fn()
    console.log(`✓ ${label}`)
  } catch (e) {
    console.log(`✗ ${label}\n   ${e.message}`)
    errors.push(label)
  }
}

const fakeUser = {
  accountId: 'fake-account', email: 'test@example.com', displayName: 'Test User',
  nutritionUserId: 'fake-nutrition-id', authenticated: true, hasProfile: true, emailVerified: true,
}

const fakeSummary = {
  dateLabel: '2026-05-06', weightKg: 70, weightUpdatedAt: null,
  consumedCalories: 0, dailyTargetCalories: 2000, remainingCalories: 2000,
  proteinGrams: 0, fatGrams: 0, fiberGrams: 0, carbsGrams: 0,
  proteinTargetGrams: 100, fatTargetGrams: 70, carbsTargetGrams: 250, fiberTargetGrams: 25,
  waterGlasses: 0, waterGoalGlasses: 8,
  targetWeightKg: 65, startingWeightKg: 75,
  loggingStreakDays: 0, weightTrend7d: null,
}

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--user-data-dir=/tmp/puppeteer-chrome-profile-' + Date.now()],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844 })

  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })

  await page.setRequestInterception(true)
  page.on('request', req => {
    const url = req.url()
    if (url.includes('/api/auth/me')) return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeUser) })
    if (url.includes('/api/history/today-summary')) return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeSummary) })
    if (url.startsWith('http://127.0.0.1:5174/api/')) return req.respond({ status: 200, contentType: 'application/json', body: '{}' })
    req.continue()
  })

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 15000 })

  await expect('after auth, bottom tab bar appears', async () => {
    await page.waitForSelector('.bottom-tab-bar', { timeout: 5000 })
  })

  await expect('Today active by default at /', async () => {
    await page.waitForFunction(() => {
      const a = document.querySelector('.bottom-tab-item--active .bottom-tab-item__label')
      return a?.textContent.trim() === 'Today'
    }, { timeout: 3000 })
  })

  await expect('clicking Stats → URL becomes #/stats', async () => {
    await Promise.all([
      page.waitForFunction(() => location.hash === '#/stats', { timeout: 3000 }),
      page.evaluate(() => {
        const link = [...document.querySelectorAll('.bottom-tab-item')].find(a => a.textContent.includes('Stats'))
        link?.click()
      }),
    ])
  })

  await expect('Stats tab is active', async () => {
    await page.waitForFunction(() => {
      const a = document.querySelector('.bottom-tab-item--active .bottom-tab-item__label')
      return a?.textContent.trim() === 'Stats'
    }, { timeout: 3000 })
  })

  await expect('clicking Library → URL becomes #/library', async () => {
    await Promise.all([
      page.waitForFunction(() => location.hash === '#/library', { timeout: 3000 }),
      page.evaluate(() => {
        const link = [...document.querySelectorAll('.bottom-tab-item')].find(a => a.textContent.includes('Library'))
        link?.click()
      }),
    ])
  })

  // Direct navigation via hash
  await page.goto(`${URL}/#/profile`, { waitUntil: 'networkidle2', timeout: 10000 })
  await expect('direct /#/profile → Me tab active', async () => {
    await page.waitForFunction(() => {
      const a = document.querySelector('.bottom-tab-item--active .bottom-tab-item__label')
      return a?.textContent.trim() === 'Me'
    }, { timeout: 5000 })
  })

  await page.goto(`${URL}/#/fasting`, { waitUntil: 'networkidle2', timeout: 10000 })
  await expect('direct /#/fasting → Fast tab active', async () => {
    await page.waitForFunction(() => {
      const a = document.querySelector('.bottom-tab-item--active .bottom-tab-item__label')
      return a?.textContent.trim() === 'Fast'
    }, { timeout: 3000 })
  })

  // Critical: page reload preserves hash route (the WHOLE point of HashRouter)
  await page.reload({ waitUntil: 'networkidle2' })
  await expect('reload on /#/fasting still shows Fast', async () => {
    await page.waitForFunction(() => {
      const a = document.querySelector('.bottom-tab-item--active .bottom-tab-item__label')
      return a?.textContent.trim() === 'Fast'
    }, { timeout: 5000 })
  })

  // Browser back
  await expect('browser back returns to previous route', async () => {
    await Promise.all([
      page.waitForFunction(() => location.hash === '#/profile', { timeout: 3000 }),
      page.goBack(),
    ])
  })

  // Unknown route → fallback to /
  await page.goto(`${URL}/#/nonexistent-xyz`, { waitUntil: 'networkidle2', timeout: 10000 })
  await expect('unknown hash route redirects to /', async () => {
    await page.waitForFunction(() => location.hash === '' || location.hash === '#/', { timeout: 3000 })
  })

  console.log('\n--- Console errors during run (excluding NaN warnings) ---')
  const real = consoleErrors.filter(e => !e.includes('Received NaN'))
  if (real.length === 0) console.log('(none)')
  else real.slice(0, 10).forEach(e => console.log(`  ${e.slice(0, 200)}`))

  console.log(`\n${errors.length === 0 ? 'ALL PASSED' : `FAILED: ${errors.length}`}`)
  await browser.close()
  process.exit(errors.length === 0 ? 0 : 1)
})().catch(e => { console.error(e); process.exit(1) })
