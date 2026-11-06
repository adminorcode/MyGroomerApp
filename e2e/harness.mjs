import { chromium } from 'playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

export const appUrl = 'http://localhost:8081'
export const apiUrl = 'http://127.0.0.1:3000'

const brandSource = readFileSync(new URL('../constants/brand.ts', import.meta.url), 'utf8')

function brandDefault(name) {
  const match = brandSource.match(new RegExp(`export const ${name} = '([^']*)'`))
  if (!match) throw new Error(`constants/brand.ts não declara ${name}`)
  return match[1]
}

export const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME?.trim() || brandDefault('APP_NAME_DEFAULT')
export const APP_SCHEME = process.env.EXPO_PUBLIC_APP_SCHEME?.trim() || brandDefault('APP_SCHEME_DEFAULT')

export const fixtures = {
  tutor: { email: 'tutor@email.com', password: 'admin' },
  groomer: { email: 'groomer@email.com', password: 'admin' },
}

export const viewports = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
}

export function evidenceFile(planDir, fileName) {
  // Permite revalidar outro plano sem sobrescrever seus logs históricos.
  const destination = process.env.E2E_EVIDENCE_PLAN || planDir
  if (process.env.E2E_EVIDENCE_PLAN && !/^\d{3}-[a-z0-9-]+$/.test(destination)) throw new Error('Diretório de evidência inválido')
  return path.resolve(here, '../../Plans', destination, 'evidencias', fileName)
}

export async function writeEvidence(file, data) {
  mkdirSync(path.dirname(file), { recursive: true })
  let last
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      writeFileSync(file, data)
      return
    } catch (error) {
      last = error
      if (!['UNKNOWN', 'EBUSY', 'EPERM'].includes(error?.code)) throw error
      await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)))
    }
  }
  throw last
}

export async function saveScreenshot(page, file, options = {}) {
  const image = await page.screenshot(options)
  await writeEvidence(file, image)
  if (process.env.E2E_UI_AUDIT === '1') {
    const { inspectRenderedText } = await import('./visual-audit.mjs')
    const auditFile = /\.png$/i.test(file) ? file.replace(/\.png$/i, '.audit.json') : `${file}.audit.json`
    await writeEvidence(auditFile, JSON.stringify(await inspectRenderedText(page), null, 2))
  }
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
  await page.getByText('Agenda do groomer').waitFor({ timeout: 20000 })
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

function assertE2eDatabase() {
  let database
  try {
    database = new URL(process.env.DATABASE_URL || '')
  } catch {
    database = null
  }
  const local = database && ['localhost', '127.0.0.1', '[::1]'].includes(database.hostname)
  if (!local || database.pathname !== '/mygroomer_e2e') {
    throw new Error('Teste de ponta a ponta recusou o banco. Use node --import ./e2e/preload.mjs para rodar em mygroomer_e2e.')
  }
}

export function startRun({ command, evidence }) {
  assertE2eDatabase()
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
      await writeEvidence(evidence, [
        `command: ${process.execArgv.includes('--import') && !command.includes('--import') ? command.replace(/^node /, 'node --import ./e2e/preload.mjs ') : command}`,
        'cwd: React App',
        `started: ${started}`,
        `exit: ${exitCode}`,
        '',
        ...lines,
        '',
      ].join('\n'))
    }
    if (exitCode) process.exit(1)
  }

  return { check, fail, finish, failures }
}
