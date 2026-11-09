import { chromium } from 'playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

export const appUrl = process.env.E2E_APP_URL || 'http://localhost:8081'
export const apiUrl = process.env.E2E_API_URL || 'http://127.0.0.1:3000'

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
  await page.getByRole('button', { name: 'Abrir perfil', exact: true }).waitFor({ timeout: 20000 })
}

export async function loginProfessional(page, account = fixtures.groomer) {
  await openLogin(page)
  await page.getByRole('textbox', { name: 'E-mail' }).fill(account.email)
  await page.getByRole('textbox', { name: 'Senha' }).fill(account.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByText('Agenda do groomer').waitFor({ timeout: 20000 })
}

const apiBase = `${apiUrl}/api/v1`

async function apiCall(route, token, method = 'GET', payload) {
  const response = await fetch(apiBase + route, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  })
  const text = await response.text()
  const body = text ? JSON.parse(text) : null
  if (!response.ok) throw new Error(`${method} ${route} ${response.status} ${text}`)
  return body
}

async function apiToken(account = fixtures.tutor) {
  const response = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: account.email, password: account.password }),
  })
  const body = await response.json()
  if (!response.ok) throw new Error(`login ${account.email}`)
  return body.token
}

/**
 * Plano 028: a busca não digita mais o endereço. O helper torna `address` o endereço salvo padrão do tutor
 * (cria se faltar, com coordenadas da sugestão da API), recarrega o app e abre "Buscar um serviço".
 * Ao terminar, a tela de busca mostra o endereço salvo.
 */
export async function fillServiceAddress(page, address) {
  // Usa o token do tutor logado na página (alguns specs criam tutores próprios).
  const stored = await page.evaluate(() => localStorage.getItem('auth-store'))
  const token = JSON.parse(stored ?? '{}')?.state?.token ?? await apiToken()
  // Geocodificador externo pode responder 503 por instabilidade: tenta de novo antes de falhar.
  let suggestions = null
  for (let attempt = 0; attempt < 4 && !suggestions?.length; attempt += 1) {
    try {
      suggestions = (await apiCall(`/providers/service-location/autocomplete?text=${encodeURIComponent(address)}`, token)).data
    } catch (error) {
      if (attempt === 3) throw error
      await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)))
    }
  }
  // Prefere a sugestão que contém o nome digitado (ex.: 'Rua Vital Brasil'); senão, a primeira.
  const typed = address.split(',')[0].trim().toLowerCase()
  const suggestion = suggestions?.find(item => item.label.toLowerCase().includes(typed)) ?? suggestions?.[0]
  if (!suggestion) throw new Error(`Sem sugestão de endereço para: ${address}`)
  const saved = (await apiCall('/customer-addresses', token)).data ?? []
  const existing = saved.find((item) => item.address === suggestion.label)
  if (existing) {
    await apiCall(`/customer-addresses/${existing.id}`, token, 'PATCH', { is_default: true })
  } else {
    await apiCall('/customer-addresses', token, 'POST', {
      label: 'other',
      address: suggestion.label,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      is_default: true,
    })
  }
  // Volta à Home do início (o reload preservaria a tela atual, que pode não ser a Home).
  await page.goto(appUrl, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Abrir perfil', exact: true }).waitFor({ timeout: 20000 })
  await page.getByRole('button', { name: 'Buscar um serviço' }).click()
  try {
    await page.getByText(suggestion.label, { exact: false }).waitFor({ timeout: 15000 })
  } catch (error) {
    const shown = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)
    throw new Error(`Busca sem o endereço salvo "${suggestion.label}". Tela: ${shown}\n${error.message}`)
  }
  // Rótulo do endereço escolhido: é o que a busca, o cartão e o resumo mostram.
  return suggestion.label
}

/** Abre o painel de filtros da busca, se ainda estiver fechado. */
export async function openCoverageFilters(page) {
  const services = page.getByRole('radiogroup', { name: 'Serviço' })
  if (await services.count() === 0) {
    await page.getByRole('button', { name: /^Filtros/ }).click()
  }
  await services.waitFor({ timeout: 15000 })
}

export async function gateRoute(page, pattern, gate) {
  await page.route(pattern, async (route) => {
    // Repetições automáticas do cliente podem chegar a uma rota já tratada: ignora sem derrubar o processo.
    try {
      if (gate.fail) {
        await route.abort()
        return
      }
      if (gate.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, gate.delayMs))
      await route.continue()
    } catch (error) {
      if (!/already handled/i.test(String(error?.message))) throw error
    }
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
