const puppeteer = require('puppeteer-core')

const URL = process.env.SMOKE_URL || 'http://127.0.0.1:5174'
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const errors = []
const consoleErrors = []
const requestErrors = []

async function expect(label, fn) {
  try {
    await fn()
    console.log(`✓ ${label}`)
  } catch (e) {
    console.log(`✗ ${label}\n   ${e.message}`)
    errors.push(label)
  }
}

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--user-data-dir=/tmp/puppeteer-chrome-profile-' + Date.now()],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844 }) // iPhone-ish

  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('requestfailed', r => requestErrors.push(`${r.method()} ${r.url()} — ${r.failure()?.errorText}`))

  // 1. Initial load
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 15000 })

  await expect('login screen renders (email field exists)', async () => {
    await page.waitForSelector('input[type="email"]', { timeout: 5000 })
  })

  await expect('login screen has password field', async () => {
    await page.waitForSelector('input[type="password"]', { timeout: 2000 })
  })

  await expect('login submit button shows "Log in"', async () => {
    const text = await page.$eval('button.auth-btn-primary', b => b.textContent.trim())
    if (!/log in/i.test(text)) throw new Error(`got: "${text}"`)
  })

  await expect('Sign up switch button visible', async () => {
    const found = await page.$$eval('button.auth-switch-link', els => els.some(b => /sign up/i.test(b.textContent)))
    if (!found) throw new Error('Sign up button not found')
  })

  // 2. Click "Sign up"
  await expect('clicking Sign up shows Name field', async () => {
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button.auth-switch-link')].find(b => /sign up/i.test(b.textContent))
      btn?.click()
    })
    await page.waitForFunction(() => {
      return [...document.querySelectorAll('label.auth-label')].some(l => /name/i.test(l.textContent.trim().split('\n')[0]))
    }, { timeout: 2000 })
  })

  await expect('register submit button shows "Create account"', async () => {
    const text = await page.$eval('button.auth-btn-primary', b => b.textContent.trim())
    if (!/create account/i.test(text)) throw new Error(`got: "${text}"`)
  })

  // 3. Click "Log in" link to go back, then click "Forgot?"
  await expect('clicking Log in link returns to login', async () => {
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button.auth-switch-link')].find(b => /log in/i.test(b.textContent))
      btn?.click()
    })
    await page.waitForFunction(() => {
      return document.querySelector('button.auth-btn-primary')?.textContent.match(/log in/i)
    }, { timeout: 2000 })
  })

  await expect('Forgot? link visible on login', async () => {
    await page.waitForSelector('button.auth-forgot-link', { timeout: 2000 })
  })

  await expect('clicking Forgot? shows reset form', async () => {
    await page.click('button.auth-forgot-link')
    await page.waitForFunction(() => {
      const btn = document.querySelector('button.auth-btn-primary')
      return btn && /send reset link/i.test(btn.textContent)
    }, { timeout: 2000 })
  })

  // 4. Reset-password screen via URL
  await page.goto(`${URL}/?reset_token=fake-token-123`, { waitUntil: 'networkidle2', timeout: 10000 })
  await expect('?reset_token=... shows "Set new password" button', async () => {
    await page.waitForFunction(() => {
      const btn = document.querySelector('button.auth-btn-primary')
      return btn && /set new password/i.test(btn.textContent)
    }, { timeout: 3000 })
  })

  // 5. Theme toggle
  await page.goto(URL, { waitUntil: 'networkidle2' })
  await expect('theme toggle button works (data-theme changes)', async () => {
    const before = await page.$eval('html', h => h.getAttribute('data-theme'))
    await page.click('button.theme-toggle-btn')
    await new Promise(r => setTimeout(r, 100))
    const after = await page.$eval('html', h => h.getAttribute('data-theme'))
    if (before === after) throw new Error(`theme didn't change (was ${before}, still ${after})`)
  })

  console.log('\n--- Console errors during run ---')
  if (consoleErrors.length === 0) console.log('(none)')
  else consoleErrors.forEach(e => console.log(`  ${e}`))

  console.log('\n--- Failed network requests ---')
  if (requestErrors.length === 0) console.log('(none)')
  else requestErrors.slice(0, 8).forEach(e => console.log(`  ${e}`))

  console.log(`\n${errors.length === 0 ? 'ALL PASSED' : `FAILED: ${errors.length}`}`)
  await browser.close()
  process.exit(errors.length === 0 ? 0 : 1)
})().catch(e => { console.error(e); process.exit(1) })
