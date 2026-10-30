import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  checkContrast,
  evidenceFile,
  launchBrowser,
  loginProfessional,
  loginTutor,
  openPage,
  startRun,
} from './harness.mjs'

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
require(path.join(apiRoot, 'node_modules/dotenv')).config({ path: path.join(apiRoot, '.env'), quiet: true })
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))

const session = startRun({
  command: 'node e2e/service-radius.mjs',
  evidence: evidenceFile('012-service-radius', 'service-radius.log'),
})
const { check } = session
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const providerId = '10000000-0000-4000-8000-000000000003'
let snapshot

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

async function openServices(page) {
  const tab = page.getByRole('tab', { name: 'Serviços' })
  const button = page.getByRole('button', { name: 'Serviços', exact: true })
  await tab.or(button).first().waitFor({ timeout: 20000 })
  if (await tab.count()) await tab.click()
  else await button.click()
}

async function mapZoom(page, titlePart) {
  const map = page.locator(`[title*="${titlePart}"]`)
  const started = Date.now()
  while (Date.now() - started < 10000) {
    const zoom = Number(await map.getAttribute('data-zoom'))
    if (zoom > 0) return zoom
    await page.waitForTimeout(100)
  }
  return 0
}

async function disabled(locator) {
  return locator.evaluate(element => element.getAttribute('aria-disabled') === 'true' || element.hasAttribute('disabled'))
}

async function waitEnabled(page) {
  const button = page.getByRole('button', { name: 'Continuar' })
  const started = Date.now()
  while (Date.now() - started < 25000) {
    if (!(await disabled(button))) return button
    await page.waitForTimeout(200)
  }
  throw new Error('Continuar permaneceu desabilitado')
}

async function leaveServices(page) {
  await openServices(page)
  await page.getByText('Dados do serviço', { exact: true }).waitFor({ timeout: 20000 })
  await waitEnabled(page)
  await page.getByRole('button', { name: 'Continuar' }).click()
}

async function searchTutor(page, address) {
  await page.getByRole('textbox', { name: 'Endereço do atendimento' }).fill(address)
  await page.getByRole('button', { name: 'Buscar' }).click()
}

async function run() {
  await capture()
  const browser = await launchBrowser()
  try {
    const page = await openPage(browser, { viewport: 'mobile' })
    let mode = 'fail'
    await page.route('**/api/v1/providers/service-location**', async route => {
      const url = route.request().url()
      if (route.request().method() !== 'GET' || url.includes('/preview') || url.includes('/map-tiles')) return route.continue()
      if (mode === 'fail') return route.abort()
      if (mode === 'delay') await new Promise(resolve => setTimeout(resolve, 1200))
      return route.continue()
    })

    await loginProfessional(page)
    await leaveServices(page)
    await page.getByText('Não foi possível conectar à API. Verifique o servidor e tente novamente.').waitFor({ timeout: 15000 })
    check('erro', true)

    mode = 'delay'
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await page.getByLabel('Carregando').waitFor({ timeout: 5000 })
    check('carregando', true)
    mode = 'pass'
    await page.getByRole('combobox', { name: 'Endereço-base' }).waitFor({ timeout: 15000 })
    await checkContrast(page, page.getByText('Local de atendimento', { exact: true }), 'tema claro em 390', check)
    await page.setViewportSize({ width: 1440, height: 900 })
    await checkContrast(page, page.getByText('Local de atendimento', { exact: true }), 'tema claro em 1440', check)
    await page.setViewportSize({ width: 390, height: 844 })

    const address = page.getByRole('combobox', { name: 'Endereço-base' })
    const postalCode = page.getByRole('textbox', { name: 'CEP' })
    const complement = page.getByRole('textbox', { name: 'Complemento' })
    const continueButton = page.getByRole('button', { name: 'Continuar' })
    await waitEnabled(page)

    await address.fill('')
    check('AC-04', await disabled(continueButton) && await page.getByText('Local de atendimento', { exact: true }).isVisible(), 'sem endereço Continuar não avança')
    await address.fill('Avenida Paulista, São Paulo')
    await postalCode.fill('')
    check('AC-04', await disabled(continueButton), 'sem CEP Continuar não avança')
    await postalCode.fill('01310-100')
    for (const km of [3, 5, 8, 10]) {
      const selected = page.getByRole('button', { name: `${km} km, selecionado` })
      if (await selected.count()) {
        await selected.click()
        break
      }
    }
    check('AC-04', await disabled(continueButton), 'sem raio Continuar não avança')

    if (await page.getByRole('button', { name: /10 km, selecionado/ }).count() === 0) {
      await page.getByRole('button', { name: '10 km' }).click()
    }
    await page.getByTitle( /Mapa do atendimento\. Avenida Paulista, São Paulo\. raio de 10 km/).waitFor({ timeout: 20000 })
    const zoom10 = await mapZoom(page, 'raio de 10 km')
    await page.getByText('Powered by Geoapify · OpenStreetMap', { exact: true }).waitFor()
    await page.getByRole('button', { name: /10 km/ }).click()
    await page.getByRole('button', { name: '3 km' }).click()
    await page.getByTitle( /raio de 3 km/).waitFor({ timeout: 15000 })
    const zoom3 = await mapZoom(page, 'raio de 3 km')
    await page.getByRole('button', { name: /3 km/ }).click()
    await page.getByRole('button', { name: '5 km' }).click()
    await page.getByTitle( /raio de 5 km/).waitFor()
    const zoom5 = await mapZoom(page, 'raio de 5 km')
    await page.getByRole('button', { name: /5 km/ }).click()
    await page.getByRole('button', { name: '8 km' }).click()
    await page.getByTitle( /raio de 8 km/).waitFor()
    const zoom8 = await mapZoom(page, 'raio de 8 km')
    check('AC-02', zoom3 > zoom5 && zoom5 > zoom8 && zoom8 > zoom10, `zoom ${zoom3} > ${zoom5} > ${zoom8} > ${zoom10}`)

    await postalCode.fill('91210-320')
    const map = page.locator('iframe[title*="Rua Vital Brasil, Porto Alegre"]')
    await map.waitFor({ timeout: 20000 })
    await page.frameLocator('iframe[title*="Rua Vital Brasil, Porto Alegre"]').locator('.leaflet-interactive').nth(1).waitFor({ timeout: 20000 })
    await map.scrollIntoViewIfNeeded()
    const zoom = Number(await map.getAttribute('data-zoom'))
    const mapBox = await map.boundingBox()
    const continueBox = await continueButton.boundingBox()
    check(
      'AC-02',
      Boolean(mapBox && continueBox && mapBox.height >= 200 && mapBox.y + 80 < continueBox.y && zoom >= 10),
      `mapa com círculo e zoom ${zoom}`,
    )
    const filledAddress = await address.inputValue()
    check('AC-01', filledAddress === 'Rua Vital Brasil, Porto Alegre', filledAddress)
    await postalCode.fill('01310-100')
    await page.getByTitle( /Avenida Paulista, São Paulo/).waitFor({ timeout: 20000 })

    let delayAutocomplete = true
    await page.route('**/service-location/autocomplete**', async route => {
      if (delayAutocomplete) {
        delayAutocomplete = false
        await new Promise(resolve => setTimeout(resolve, 1200))
      }
      await route.continue()
    })
    await address.fill('Rua Vital')
    await page.getByRole('progressbar', { name: 'Buscando endereços' }).waitFor({ timeout: 5000 })
    check(
      'AC-01',
      await page.getByRole('textbox', { name: 'CEP' }).isVisible() && await page.getByLabel('Carregando').count() === 0,
      'a busca do endereço não bloqueia a tela',
    )
    const suggestion = page.getByRole('option', { name: /Rua Vital Brasil/ }).first()
    await suggestion.waitFor({ timeout: 15000 })
    await suggestion.click()
    await page.locator('iframe[title*="Rua Vital Brasil"]').waitFor({ timeout: 20000 })
    check('AC-01', true, 'autocomplete do endereço abre o mapa')
    await postalCode.fill('01310-100')
    await page.getByTitle(/Avenida Paulista, São Paulo/).waitFor({ timeout: 20000 })

    await address.fill('Rua sem mapa, 10')
    await page.getByLabel('Mapa sem ponto').waitFor({ timeout: 15000 })
    check('AC-02', await disabled(continueButton), 'endereço desconhecido não mostra ponto')
    await address.fill('Avenida Paulista, São Paulo')
    await page.getByTitle( /raio de 8 km/).waitFor({ timeout: 15000 })

    await page.getByRole('button', { name: 'Por km' }).click()
    check('AC-03', await disabled(continueButton) && await page.getByRole('textbox', { name: 'Valor por quilômetro' }).isVisible(), 'faixa por km pede o valor')
    await page.getByRole('textbox', { name: 'Valor por quilômetro' }).fill('4,50')
    await waitEnabled(page)
    await continueButton.click()
    await page.getByText('Local de atendimento salvo.', { exact: true }).waitFor({ timeout: 25000 })
    check('AC-03', true, 'faixa por km salva')

    await page.getByRole('button', { name: 'Inclusa' }).click()
    await waitEnabled(page)
    await continueButton.click()
    await page.getByText('Local de atendimento salvo.', { exact: true }).waitFor()
    check('AC-03', await page.getByRole('textbox', { name: 'Valor por quilômetro' }).count() === 0, 'taxa inclusa não pede valor')

    await page.getByRole('button', { name: 'Sob consulta' }).click()
    await waitEnabled(page)
    await continueButton.click()
    await page.getByText('Local de atendimento salvo.', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Voltar' }).click()
    await page.getByText('Dados do serviço', { exact: true }).first().waitFor()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByRole('button', { name: 'Sob consulta, selecionada' }).waitFor({ timeout: 15000 })
    check('AC-03', true, 'sob consulta permanece')

    await complement.fill('')
    await waitEnabled(page)
    await continueButton.click()
    await page.getByText('Local de atendimento salvo.', { exact: true }).waitFor()
    check('AC-01', (await complement.inputValue()) === '', 'complemento vazio ainda salva')
    await complement.fill('Apto 2')
    await continueButton.click()
    await page.getByText('Local de atendimento salvo.', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Voltar' }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByRole('textbox', { name: 'Complemento' }).waitFor()
    const keptComplement = await page.getByRole('textbox', { name: 'Complemento' }).inputValue()
    const keptAddress = await page.getByRole('combobox', { name: 'Endereço-base' }).inputValue()
    const keptCep = await page.getByRole('textbox', { name: 'CEP' }).inputValue()
    check('AC-01', keptAddress === 'Avenida Paulista, São Paulo' && keptCep === '01310-100' && keptComplement === 'Apto 2', `${keptAddress} | ${keptCep} | ${keptComplement}`)

    await page.getByRole('button', { name: /8 km/ }).click()
    await page.getByRole('button', { name: '10 km' }).click()
    await page.getByRole('button', { name: 'Inclusa' }).click()
    await waitEnabled(page)
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByText('Local de atendimento salvo.', { exact: true }).waitFor()

    const tutor = await openPage(browser, { viewport: 'mobile' })
    await loginTutor(tutor)
    await tutor.getByRole('button', { name: 'Buscar um serviço' }).click()
    await tutor.getByRole('radio', { name: 'Banho', exact: true }).click()
    await searchTutor(tutor, 'Avenida Paulista, São Paulo')
    await tutor.getByText('Groomer de Teste').waitFor({ timeout: 15000 })
    check('AC-05', true, 'a base entra no raio')
    await searchTutor(tutor, 'Copacabana, Rio de Janeiro')
    await tutor.getByText('Nenhum groomer atende este endereço.').waitFor({ timeout: 15000 })
    check('AC-05', await tutor.getByText('Groomer de Teste').count() === 0, 'Copacabana fica fora do raio')
    await tutor.context().close()

    const empty = await openPage(browser, { viewport: 'mobile' })
    await empty.route('**/api/v1/providers/service-location**', route => {
      if (route.request().method() !== 'GET' || route.request().url().includes('/preview')) return route.continue()
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
    await loginProfessional(empty)
    await leaveServices(empty)
    await empty.getByLabel('Mapa sem ponto').waitFor({ timeout: 15000 })
    check('vazio', await disabled(empty.getByRole('button', { name: 'Continuar' })))
    await empty.context().close()
  } finally {
    await browser.close()
  }
}

run()
  .catch(error => session.fail(error))
  .finally(async () => {
    await restore().catch(error => session.fail(error))
    await pool.end()
    await session.finish()
  })
