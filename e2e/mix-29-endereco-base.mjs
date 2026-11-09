import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { evidenceFile, gateRoute, launchBrowser, loginProfessional, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-29-endereco-base.mjs',
  evidence: evidenceFile(plan, 'mix-29-endereco-base.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
require(path.join(apiRoot, 'node_modules/dotenv')).config({ path: path.join(apiRoot, '.env'), quiet: true })
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const providerId = '10000000-0000-4000-8000-000000000003'
let snapshot

const SERVICE_LOCATION = '**/api/v1/providers/service-location'
const MAP_TILES = '**/providers/service-location/map-tiles**'
const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (CMP-03, R1)
const TEXT_PINK = 'rgb(198, 38, 105)' // action.primaryOutline / rosa-texto (R5)
const TEAL = 'rgb(22, 125, 131)' // brand.teal / action.secondary (R3, CMP-16)
const TEAL_SUBTLE = 'rgb(233, 243, 242)' // surface.tealSubtle
const WHITE = 'rgb(255, 255, 255)'
const SUCCESS = 'rgb(23, 107, 84)' // feedback.success
const DISABLED_SURFACE = 'rgb(228, 232, 232)' // state.disabledSurface
const DISABLED_TEXT = 'rgb(96, 118, 122)' // state.disabledText
const MAP_FRAME = 'iframe[title*="Mapa do atendimento"]'

async function capture() {
  const current = await pool.query(
    `SELECT base_address, base_postal_code, base_complement, base_latitude, base_longitude,
            radius_km, travel_fee_mode, travel_fee_per_km
     FROM providers WHERE id = $1`,
    [providerId],
  )
  snapshot = current.rows[0]
}

async function restore() {
  if (!snapshot) return
  await pool.query(
    `UPDATE providers SET
        base_address = $2,
        base_postal_code = $3,
        base_complement = $4,
        base_latitude = $5,
        base_longitude = $6,
        radius_km = $7,
        travel_fee_mode = $8,
        travel_fee_per_km = $9
     WHERE id = $1`,
    [
      providerId,
      snapshot.base_address,
      snapshot.base_postal_code,
      snapshot.base_complement,
      snapshot.base_latitude,
      snapshot.base_longitude,
      snapshot.radius_km,
      snapshot.travel_fee_mode,
      snapshot.travel_fee_per_km,
    ],
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

// Abre a tela Local de atendimento a partir da aba Serviços (fluxo do groomer).
async function openLocation(page) {
  await openServices(page)
  await page.getByText('Dados do serviço', { exact: true }).waitFor({ timeout: 20000 })
  await waitEnabled(page)
  await button(page, 'Continuar').click()
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

async function selectRadius(page, km) {
  if (await page.getByRole('button', { name: `${km} km, selecionado`, exact: true }).count()) return
  await button(page, `${km} km`).click()
}

async function fillLocation(page) {
  await page.getByRole('combobox', { name: 'Endereço-base' }).fill('Avenida Paulista, São Paulo')
  await page.getByRole('textbox', { name: 'CEP' }).fill('01310-100')
}

async function runMainFlow(browser) {
  const page = await openPage(browser, { viewport: 'mobile' })
  await loginProfessional(page)
  await openLocation(page)
  await page.getByRole('combobox', { name: 'Endereço-base' }).waitFor({ timeout: 20000 })

  // Passos: concluídos em teal, atual em rosa-texto (CMP-19, via OnboardingStepper).
  const stepper = page.getByLabel('Passo 3 de 3: Local')
  check('CMP-19 passo atual Local usa rosa-texto', await textColorOf(stepper, 'Local') === TEXT_PINK, await textColorOf(stepper, 'Local'))
  check('CMP-19 passos concluídos usam teal', await textColorOf(stepper, 'Cadastro') === TEAL && await textColorOf(stepper, 'Serviços') === TEAL)

  await fillLocation(page)
  await page.locator(MAP_FRAME).waitFor({ timeout: 20000 })
  const frame = page.frameLocator(MAP_FRAME)
  await frame.locator('.mg-pin path').first().waitFor({ timeout: 20000 })

  // Raio: chips selecionados em action.primary com texto branco; não selecionados em contorno rosa-texto.
  await selectRadius(page, 5)
  const selectedChip = page.getByRole('button', { name: '5 km, selecionado', exact: true })
  const selectedChipBox = await boxOf(selectedChip)
  check('R1 chip de raio selecionado usa action.primary', selectedChipBox.background === CTA_PINK, JSON.stringify(selectedChipBox))
  check('R1 texto do chip selecionado é branco', await textColorOf(selectedChip, '5 km') === WHITE)
  const unselectedChip = button(page, '3 km')
  const unselectedChipBox = await boxOf(unselectedChip)
  check('R1 chip de raio não selecionado usa contorno rosa-texto sobre branco', unselectedChipBox.border === TEXT_PINK && unselectedChipBox.background === WHITE, JSON.stringify(unselectedChipBox))

  // Mapa: pino rosa de ação, cobertura teal, miolo e fundo vindos de tokens (CMP-16, CMP-21).
  await frame.locator('.mg-radius').first().waitFor({ timeout: 20000 })
  const pinFill = await frame.locator('.mg-pin path').first().getAttribute('fill')
  check('CMP-16 pino usa action.primary', (pinFill ?? '').toLowerCase() === '#c64878', pinFill ?? 'sem fill')
  const haloFill = await frame.locator('.mg-pin circle').first().getAttribute('fill')
  check('CMP-21 miolo do pino usa surface.default', (haloFill ?? '').toLowerCase() === '#ffffff', haloFill ?? 'sem fill')
  const coverageStroke = await frame.locator('.mg-radius').first().getAttribute('stroke')
  check('CMP-16 cobertura do raio usa teal', (coverageStroke ?? '').toLowerCase() === '#167d83', coverageStroke ?? 'sem stroke')
  const ground = await frame.locator('.leaflet-container').first().evaluate(el => getComputedStyle(el).backgroundColor)
  check('CMP-21 fundo do mapa usa surface.tealSubtle', ground === TEAL_SUBTLE, ground)

  // Taxa: CTA Continuar em action.primary, texto branco, altura 40 e raio 16.
  await page.getByRole('button', { name: /^Inclusa/ }).click()
  const continueButton = button(page, 'Continuar')
  await waitEnabled(page)
  const continueBox = await boxOf(continueButton)
  check('AC-02 Continuar usa action.primary', continueBox.background === CTA_PINK, JSON.stringify(continueBox))
  check('AC-02 texto do Continuar é branco', await textColorOf(continueButton, 'Continuar') === WHITE)
  check('AC-07 botão Continuar mantém altura 40 e raio 16', continueBox.minHeight === '40px' && continueBox.radius === '16px', `${continueBox.minHeight} ${continueBox.radius}`)
  await shot(page, 'endereco-base')

  // Sucesso: aviso de salvo com semântica de feedback e texto.
  await continueButton.click()
  const saved = page.getByText('Local de atendimento salvo.', { exact: true })
  await saved.waitFor({ timeout: 25000 })
  check('R6 aviso de local salvo usa semântica de sucesso com texto', await saved.evaluate(el => getComputedStyle(el).color) === SUCCESS)
  await shot(page, 'endereco-base-salvo')
  await page.context().close()
}

async function runErrorFlow(browser) {
  const page = await openPage(browser, { viewport: 'mobile' })
  await gateRoute(page, SERVICE_LOCATION, { fail: true })
  await loginProfessional(page)
  await openServices(page)
  await page.getByText('Dados do serviço', { exact: true }).waitFor({ timeout: 20000 })
  await waitEnabled(page)
  await button(page, 'Continuar').click()
  await page.getByText('Não foi possível conectar. Verifique sua internet e tente novamente.').waitFor({ timeout: 15000 })
  check('AC-08 erro ao carregar o local mostra texto de recuperação', true)
  await shot(page, 'endereco-base-erro')

  // Carregando: nova tentativa com resposta atrasada mostra o estado de carregamento.
  await page.unroute(SERVICE_LOCATION)
  await gateRoute(page, SERVICE_LOCATION, { delayMs: 2500 })
  await button(page, 'Tentar novamente').click()
  await page.getByLabel('Carregando').waitFor({ timeout: 5000 })
  check('AC-08 carregamento do local mostra indicador', true)
  await shot(page, 'endereco-base-carregando')
  await page.unroute(SERVICE_LOCATION)
  await page.getByRole('combobox', { name: 'Endereço-base' }).waitFor({ timeout: 20000 })
  await page.context().close()
}

async function runMapFlows(browser) {
  // Carregando do mapa: o ponto existe, mas os tiles ainda não chegaram.
  const loading = await openPage(browser, { viewport: 'mobile' })
  await gateRoute(loading, MAP_TILES, { delayMs: 6000 })
  await loginProfessional(loading)
  await openLocation(loading)
  await fillLocation(loading)
  const mapWait = await loading.getByRole('progressbar', { name: 'Localizando no mapa', exact: true })
  await mapWait.waitFor({ timeout: 5000 }).catch(() => {})
  // O indicador "Localizando no mapa" fica abaixo da dobra (após CEP e complemento): rola até ele antes de capturar.
  if (await mapWait.count() > 0) await mapWait.first().scrollIntoViewIfNeeded()
  check('AC-08 mapa carregando mostra indicador com texto', await mapWait.count() > 0 && await mapWait.first().isVisible())
  await shot(loading, 'endereco-base-mapa-carregando')
  await loading.context().close()

  // Erro do mapa: o ponto permanece e o texto explica a falha; o CTA segue disponível.
  const failing = await openPage(browser, { viewport: 'mobile' })
  await gateRoute(failing, MAP_TILES, { fail: true })
  await loginProfessional(failing)
  await openLocation(failing)
  await fillLocation(failing)
  await selectRadius(failing, 5)
  await failing.getByRole('button', { name: /^Inclusa/ }).click()
  const unavailable = failing.getByLabel('Mapa indisponível')
  await unavailable.waitFor({ timeout: 20000 })
  check('AC-08 erro do mapa explica com texto e mantém o ponto', await failing.getByText('O mapa não carregou. O ponto continua no endereço escolhido.', { exact: true }).count() > 0)
  check('AC-08 erro do mapa não bloqueia Continuar', await button(failing, 'Continuar').isEnabled())
  await shot(failing, 'endereco-base-mapa-erro')
  await failing.context().close()
}

async function runEmptyFlow(browser) {
  const page = await openPage(browser, { viewport: 'mobile' })
  await page.route(SERVICE_LOCATION, route => {
    if (route.request().method() !== 'GET') return route.continue()
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          address: null,
          postal_code: null,
          complement: null,
          latitude: null,
          longitude: null,
          label: null,
          radius_km: null,
          travel_fee_mode: null,
          travel_fee_per_km: null,
        },
      }),
    })
  })
  await loginProfessional(page)
  await openLocation(page)
  const empty = page.getByLabel('Mapa sem ponto')
  await empty.waitFor({ timeout: 15000 })
  check('AC-08 vazio do mapa explica o próximo passo com texto', await page.getByText('Informe um endereço e um CEP localizáveis para ver o ponto e o círculo.', { exact: true }).count() > 0)
  const continueBox = await boxOf(button(page, 'Continuar'))
  const continueText = await textColorOf(button(page, 'Continuar'), 'Continuar')
  check('AC-08 Continuar desabilitado no vazio usa superfície e texto de desabilitado', continueBox.background === DISABLED_SURFACE && continueText === DISABLED_TEXT, JSON.stringify(continueBox))
  await shot(page, 'endereco-base-vazio')
  await page.context().close()
}

let browser
try {
  await capture()
  browser = await launchBrowser()
  await runMainFlow(browser)
  await runErrorFlow(browser)
  await runMapFlows(browser)
  await runEmptyFlow(browser)
} catch (error) {
  run.fail(error)
} finally {
  await restore().catch(error => run.fail(error))
  await pool.end().catch(() => {})
  await run.finish(browser)
}
