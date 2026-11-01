import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

export const appUrl = 'http://localhost:8081'
export const apiUrl = 'http://127.0.0.1:3000'

export const fixtures = {
  tutor: { email: 'tutor@email.com', password: 'admin' },
  groomer: { email: 'groomer@email.com', password: 'admin' },
}

export const viewports = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
}

export function evidenceFile(planDir, fileName) {
  return path.resolve(here, '../../Plans', planDir, 'evidencias', fileName)
}

export function launchBrowser() {
  return chromium.launch()
}

export async function openPage(browser, { viewport = 'mobile', colorScheme = 'light', videoDir } = {}) {
  const size = viewports[viewport]
  if (!size) throw new Error(`Viewport desconhecido: ${viewport}`)
  const context = await browser.newContext({
    viewport: size,
    colorScheme,
    locale: 'pt-BR',
    recordVideo: videoDir ? { dir: videoDir, size } : undefined,
  })
  return context.newPage()
}

export async function openLogin(page) {
  await page.goto(appUrl, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Entrar', exact: true }).waitFor({ timeout: 90000 })
}

export async function openRegistrationWelcome(page) {
  await openLogin(page)
  await page.getByRole('button', { name: 'Não tem uma conta? Cadastre-se', exact: true }).click()
  await page.getByRole('button', { name: 'Sou tutor', exact: true }).waitFor()
}

export async function loginTutor(page, account = fixtures.tutor) {
  await openLogin(page)
  await page.getByRole('textbox', { name: 'E-mail' }).fill(account.email)
  await page.getByRole('textbox', { name: 'Senha' }).fill(account.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByText(/^Olá/).waitFor({ timeout: 20000 })
}

export async function loginProfessional(page, account = fixtures.groomer) {
  await openLogin(page)
  await page.getByRole('textbox', { name: 'E-mail' }).fill(account.email)
  await page.getByRole('textbox', { name: 'Senha' }).fill(account.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByText('Agendamentos').waitFor({ timeout: 20000 })
}

export async function fillServiceAddress(page, address) {
  const field = page.getByRole('combobox', { name: 'Endereço do atendimento' })
  await field.waitFor({ timeout: 15000 })
  await field.fill('')
  const pending = page.waitForResponse(
    (response) => response.url().includes('/service-location/autocomplete'),
    { timeout: 15000 },
  )
  await field.fill(address)
  await pending
  await field.blur()
  await page.getByRole('listbox').waitFor({ state: 'hidden', timeout: 5000 })
  await page.getByRole('progressbar', { name: 'Buscando endereços' }).waitFor({ state: 'hidden', timeout: 5000 })
}

export async function gateRoute(page, pattern, gate) {
  await page.route(pattern, async (route) => {
    if (gate.fail) {
      await route.abort()
      return
    }
    if (gate.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, gate.delayMs))
    await route.continue()
  })
}

export async function checkContrast(page, locator, name, check) {
  await locator.waitFor()
  const color = await locator.evaluate((element) => getComputedStyle(element).color)
  const background = await page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor)
  check(name, color !== background && color !== 'rgba(0, 0, 0, 0)', `${color} sobre ${background}`)
}

export function startRun({ command, evidence }) {
  const failures = []
  const lines = []
  const started = new Date().toISOString()
  let closed = false

  function check(name, condition, detail = '') {
    if (condition) {
      const line = `ok ${name}`
      lines.push(line)
      console.log(line)
      return
    }
    const message = `${name}${detail ? ` — ${detail}` : ''}`
    failures.push(message)
    const line = `fail ${message}`
    lines.push(line)
    console.error(line)
  }

  function fail(error) {
    const message = error?.stack || String(error)
    failures.push(message)
    lines.push(`error: ${message}`)
    console.error(message)
  }

  async function finish(browser) {
    if (closed) return
    closed = true
    if (browser) await browser.close().catch(() => {})
    const exitCode = failures.length ? 1 : 0
    if (evidence) {
      mkdirSync(path.dirname(evidence), { recursive: true })
      writeFileSync(evidence, [
        `command: ${command}`,
        'cwd: React App',
        `started: ${started}`,
        `exit: ${exitCode}`,
        '',
        ...lines,
        '',
      ].join('\n'), 'utf8')
    }
    if (exitCode) process.exit(1)
  }

  return { check, fail, finish, failures }
}
