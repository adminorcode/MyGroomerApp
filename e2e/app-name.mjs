import path from 'node:path'
import { mkdirSync } from 'node:fs'
import { APP_NAME, appUrl, checkContrast, evidenceFile, launchBrowser, openPage, openRegistrationWelcome, startRun } from './harness.mjs'

const run = startRun({
  command: 'node e2e/app-name.mjs',
  evidence: evidenceFile('025-nome-do-aplicativo', 'app-name.log'),
})
const { check, fail, finish } = run
const shots = path.dirname(evidenceFile('025-nome-do-aplicativo', 'ui-review/placeholder'))
mkdirSync(shots, { recursive: true })
const capture = (page, name) => page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true })

try {
  for (const url of [appUrl, 'http://localhost:3000/api/v1/runtime']) {
    if (!(await fetch(url)).ok) throw new Error(`Indisponível: ${url}`)
  }
  const browser = await launchBrowser()

  const mobile = await openPage(browser, { viewport: 'mobile' })
  await openRegistrationWelcome(mobile)
  const title = mobile.getByText(APP_NAME, { exact: true })
  await title.waitFor()
  const body = await mobile.locator('body').innerText()
  check('AC-01 boas-vindas exibe o nome configurado', body.includes(APP_NAME) && !/boame/i.test(body))
  await checkContrast(mobile, title, 'AC-02 nome com contraste', check)
  const mobileBox = await title.boundingBox()
  check('AC-02 nome em uma linha no celular', mobileBox.height <= 48)
  await capture(mobile, '01-welcome-mobile')

  const desktop = await openPage(browser, { viewport: 'desktop' })
  await openRegistrationWelcome(desktop)
  await desktop.getByText(APP_NAME, { exact: true }).waitFor()
  check('AC-03 nome visível no desktop', await desktop.getByText(APP_NAME, { exact: true }).isVisible())
  await capture(desktop, '02-welcome-desktop')

  const narrow = await openPage(browser)
  await narrow.setViewportSize({ width: 320, height: 760 })
  await openRegistrationWelcome(narrow)
  const narrowTitle = narrow.getByText(APP_NAME, { exact: true })
  await narrowTitle.waitFor()
  const narrowBox = await narrowTitle.boundingBox()
  check('AC-04 nome em uma linha em 320', narrowBox.height <= 41)
  await capture(narrow, '03-welcome-320')

  await finish(browser)
} catch (error) {
  fail(error)
  await finish()
}
