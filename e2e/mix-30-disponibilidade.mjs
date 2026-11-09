import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { evidenceFile, gateRoute, launchBrowser, loginProfessional, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-30-disponibilidade.mjs',
  evidence: evidenceFile(plan, 'mix-30-disponibilidade.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
require(path.join(apiRoot, 'node_modules/dotenv')).config({ path: path.join(apiRoot, '.env'), quiet: true })
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const providerId = '10000000-0000-4000-8000-000000000003'
const WEEKLY = '**/api/v1/providers/weekly-availability'
const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (R1)
const TEXT_PINK = 'rgb(198, 38, 105)' // action.primaryOutline / rosa-texto (R5)
const TEAL = 'rgb(22, 125, 131)' // action.secondary / brand.teal (R3)
const TEAL_SUBTLE = 'rgb(233, 243, 242)' // surface.tealSubtle
const TEXT_PRIMARY = 'rgb(37, 61, 66)' // text.primary
const WHITE = 'rgb(255, 255, 255)'
const SUCCESS = 'rgb(23, 107, 84)' // feedback.success
const DISABLED_SURFACE = 'rgb(228, 232, 232)' // state.disabledSurface
const DISABLED_TEXT = 'rgb(96, 118, 122)' // state.disabledText

let snapshot
let weekdayRows = []
let manualRows = []
let captured = false

async function capture() {
  const current = await pool.query(
    'SELECT travel_gap_minutes, manual_fit FROM providers WHERE id = $1',
    [providerId],
  )
  snapshot = current.rows[0]
  weekdayRows = (await pool.query(
    'SELECT weekday, start_minute, end_minute, break_start_minute, break_end_minute FROM provider_weekdays WHERE provider_id = $1 ORDER BY weekday',
    [providerId],
  )).rows
  manualRows = (await pool.query(
    'SELECT id, starts_at, ends_at FROM provider_manual_appointments WHERE provider_id = $1',
    [providerId],
  )).rows
  captured = true
}

async function prepareEmptyRoutine() {
  await pool.query('DELETE FROM provider_manual_appointments WHERE provider_id = $1', [providerId])
  await pool.query('DELETE FROM provider_weekdays WHERE provider_id = $1', [providerId])
  await pool.query(
    'UPDATE providers SET travel_gap_minutes = NULL, manual_fit = false WHERE id = $1',
    [providerId],
  )
}

async function restore() {
  if (!captured) return
  await pool.query('DELETE FROM provider_manual_appointments WHERE provider_id = $1', [providerId])
  for (const row of manualRows) {
    await pool.query(
      'INSERT INTO provider_manual_appointments (id, provider_id, starts_at, ends_at) VALUES ($1, $2, $3, $4)',
      [row.id, providerId, row.starts_at, row.ends_at],
    )
  }
  await pool.query('DELETE FROM provider_weekdays WHERE provider_id = $1', [providerId])
  for (const day of weekdayRows) {
    await pool.query(
      `INSERT INTO provider_weekdays (provider_id, weekday, start_minute, end_minute, break_start_minute, break_end_minute)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [providerId, day.weekday, day.start_minute, day.end_minute, day.break_start_minute, day.break_end_minute],
    )
  }
  if (!snapshot) return
  await pool.query(
    'UPDATE providers SET travel_gap_minutes = $2, manual_fit = $3 WHERE id = $1',
    [providerId, snapshot.travel_gap_minutes, snapshot.manual_fit],
  )
}

const button = (page, name) => page.getByRole('button', { name, exact: true })

async function openServices(page) {
  const tab = page.getByRole('tab', { name: 'Serviços' })
  const tabButton = page.getByRole('button', { name: 'Serviços', exact: true })
  await tab.or(tabButton).first().waitFor({ timeout: 20000 })
  if (await tab.count()) await tab.click()
  else await tabButton.click()
}

async function disabled(locator) {
  return locator.evaluate(element => element.getAttribute('aria-disabled') === 'true' || element.hasAttribute('disabled'))
}

async function waitEnabled(page) {
  const continueButton = button(page, 'Continuar')
  const started = Date.now()
  while (Date.now() - started < 25000) {
    if (!(await disabled(continueButton))) return continueButton
    await page.waitForTimeout(200)
  }
  throw new Error('Continuar permaneceu desabilitado')
}

// Abre Disponibilidade semanal pelo fluxo do groomer: Serviços -> Local de atendimento -> Disponibilidade.
async function openAvailability(page) {
  await openServices(page)
  await page.getByText('Dados do serviço', { exact: true }).waitFor({ timeout: 20000 })
  await waitEnabled(page)
  await button(page, 'Continuar').click()
  await button(page, 'Disponibilidade semanal').click()
}

async function boxOf(locator) {
  return locator.evaluate(el => {
    const cs = getComputedStyle(el)
    return { background: cs.backgroundColor, border: cs.borderTopColor, borderWidth: cs.borderTopWidth, radius: cs.borderRadius, minHeight: cs.minHeight }
  })
}

async function textColorOf(locator, text) {
  return locator.getByText(text, { exact: true }).first().evaluate(el => getComputedStyle(el).color)
}

// Primeiro fundo não transparente acima do texto: o bloco que o contém.
async function surfaceOf(locator, text) {
  return locator.getByText(text, { exact: true }).first().evaluate(el => {
    let node = el
    while (node && node !== document.body) {
      const bg = getComputedStyle(node).backgroundColor
      if (bg !== 'rgba(0, 0, 0, 0)') return bg
      node = node.parentElement
    }
    return 'sem fundo'
  })
}

async function iconStrokeNear(page, text) {
  return page.getByText(text, { exact: true }).first().evaluate(el => {
    const svg = el.parentElement?.querySelector('svg')
    return svg ? [svg, ...svg.querySelectorAll('*')].map(node => getComputedStyle(node).stroke).find(stroke => stroke && stroke !== 'none') ?? 'none' : 'sem ícone'
  })
}

async function runMainFlow(browser) {
  const page = await openPage(browser, { viewport: 'mobile' })
  await loginProfessional(page)
  await openAvailability(page)
  await page.getByRole('button', { name: 'segunda-feira, desligado' }).waitFor({ timeout: 15000 })

  // Vazio: sem dia ativo, o editor explica o estado com texto.
  check('AC-08 dia desligado explica com texto que não oferece horário', await page.getByText('Dia desligado não oferece horário.', { exact: true }).count() > 0)
  // Encaixe desligado: Incluir atendimento fica desabilitado com superfície e texto de desabilitado.
  const include = button(page, 'Incluir atendimento')
  const includeBox = await boxOf(include)
  const includeText = await textColorOf(include, 'Incluir atendimento')
  check('AC-08 Incluir atendimento desabilitado usa superfície e texto de desabilitado', includeBox.background === DISABLED_SURFACE && includeText === DISABLED_TEXT, JSON.stringify(includeBox))
  await shot(page, 'disponibilidade-vazia')

  // Dia ativo (R1): chip selecionado em action.primary com texto branco.
  await button(page, 'segunda-feira, desligado').click()
  const activeDay = button(page, 'segunda-feira, ligado')
  const activeBox = await boxOf(activeDay)
  check('R1 dia ativo usa action.primary', activeBox.background === CTA_PINK, JSON.stringify(activeBox))
  check('R1 texto do dia ativo é branco', await textColorOf(activeDay, 'Seg') === WHITE)

  // Blocos de horário (R3): tealSubtle com texto text.primary; ícone de intervalo em teal.
  const schedule = await surfaceOf(page, 'Horário de trabalho')
  check('R3 bloco de horário de trabalho usa tealSubtle', schedule === TEAL_SUBTLE, schedule)
  check('R5 texto do bloco de horário usa text.primary', await textColorOf(page, 'Horário de trabalho') === TEXT_PRIMARY)
  check('CMP-19 ícone de intervalo usa teal', await iconStrokeNear(page, 'Intervalo (opcional)') === TEAL, await iconStrokeNear(page, 'Intervalo (opcional)'))

  // Tempo entre atendimentos: seleção sólida em action.primary (R1) e card com borda de 1 pt.
  await button(page, '30 minutos').click()
  const gapChip = button(page, '30 minutos, selecionado')
  const gapBox = await boxOf(gapChip)
  check('R1 tempo selecionado usa action.primary com texto branco', gapBox.background === CTA_PINK && await textColorOf(gapChip, '30 min') === WHITE, JSON.stringify(gapBox))

  // Segundo dia ativo: cartão de outro dia em tealSubtle e rótulo de gerenciar em rosa-texto.
  await button(page, 'terça-feira, desligado').click()
  const otherRange = page.getByText('09:00 às 18:00', { exact: true }).first()
  await otherRange.waitFor({ timeout: 5000 })
  check('R3 cartão de outro dia ativo usa tealSubtle', await surfaceOf(page, '09:00 às 18:00') === TEAL_SUBTLE)
  check('R5 texto do cartão de outro dia usa text.primary', await textColorOf(page, '09:00 às 18:00') === TEXT_PRIMARY)
  check('R5 Gerenciar todos os dias usa rosa-texto sobre canvas', await textColorOf(page, 'Gerenciar todos os dias') === TEXT_PINK)
  await shot(page, 'disponibilidade-editor')

  // Passos: concluídos em teal e atual em rosa-texto (CMP-19).
  const stepper = page.getByLabel('Passo 4 de 4: Horários')
  check('CMP-19 passo atual Horários usa rosa-texto', await textColorOf(stepper, 'Horários') === TEXT_PINK)
  check('CMP-19 passos concluídos usam teal', await textColorOf(stepper, 'Local') === TEAL, await textColorOf(stepper, 'Local'))

  // Salvar: aviso de rotina salva com semântica de sucesso e texto.
  await button(page, 'Ir para revisão').click()
  const saved = page.getByText('Rotina salva.', { exact: true })
  await saved.waitFor({ timeout: 15000 })
  check('R6 aviso de rotina salva usa semântica de sucesso com texto', await saved.evaluate(el => getComputedStyle(el).color) === SUCCESS)

  // Encaixe ligado e rotina persistida: Incluir atendimento vira CTA em action.primary.
  await page.getByRole('switch', { name: 'Encaixe manual' }).click()
  await button(page, 'Ir para revisão').click()
  await page.getByText('Rotina salva.', { exact: true }).waitFor({ timeout: 15000 })
  const enabledInclude = button(page, 'Incluir atendimento')
  await enabledInclude.waitFor()
  const enabledBox = await boxOf(enabledInclude)
  check('R1 Incluir atendimento usa action.primary com texto branco', enabledBox.background === CTA_PINK && await textColorOf(enabledInclude, 'Incluir atendimento') === WHITE, JSON.stringify(enabledBox))
  await shot(page, 'disponibilidade-salva')
  await page.context().close()
}

async function runErrorFlow(browser) {
  const page = await openPage(browser, { viewport: 'mobile' })
  // Uma única rota com estado mutável: sem unroute/nova rota sobre a mesma requisição.
  const gate = { fail: true, delayMs: 0 }
  await gateRoute(page, WEEKLY, gate)
  await loginProfessional(page)
  await openAvailability(page)
  const errorText = page.getByText('Não foi possível conectar. Verifique sua internet e tente novamente.')
  await errorText.waitFor({ timeout: 15000 })
  check('AC-08 erro da disponibilidade mostra texto de recuperação', (await errorText.count()) === 1)
  await shot(page, 'disponibilidade-erro')

  // Carregando: nova tentativa com resposta atrasada.
  gate.fail = false
  gate.delayMs = 2500
  await button(page, 'Tentar novamente').click()
  await page.getByLabel('Carregando').first().waitFor({ timeout: 5000 })
  check('AC-08 carregamento da disponibilidade mostra indicador', (await page.getByLabel('Carregando').count()) > 0)
  await shot(page, 'disponibilidade-carregando')
  gate.delayMs = 0
  // O fluxo principal salvou a rotina com segunda ligada: o rótulo pode estar em qualquer um dos dois estados.
  await page.getByRole('button', { name: /^segunda-feira, (ligado|desligado)$/ }).first().waitFor({ timeout: 20000 })
  await page.context().close()
}

let browser
try {
  await capture()
  await prepareEmptyRoutine()
  browser = await launchBrowser()
  await runMainFlow(browser)
  await runErrorFlow(browser)
} catch (error) {
  run.fail(error)
} finally {
  await restore().catch(error => run.fail(error))
  await pool.end().catch(() => {})
  await run.finish(browser)
}
