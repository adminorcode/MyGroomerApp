import { mkdirSync } from 'node:fs'
import path from 'node:path'
import {
  checkContrast,
  evidenceFile,
  fillServiceAddress,
  gateRoute,
  launchBrowser,
  loginTutor,
  openPage,
  startRun,
} from './harness.mjs'

const api = 'http://127.0.0.1:3000/api/v1'

async function apiLogin(email) {
  const response = await fetch(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'admin' }),
  })
  const body = await response.json()
  if (!response.ok) throw new Error(`login ${email}`)
  return body.token
}

async function apiJson(route, token, method = 'GET', payload) {
  const response = await fetch(api + route, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  })
  const body = await response.json()
  if (!response.ok) throw new Error(`${method} ${route} ${response.status} ${JSON.stringify(body)}`)
  return body
}

function locationPayload(location) {
  return {
    address: location.address,
    postal_code: location.postal_code,
    complement: location.complement,
    latitude: location.latitude,
    longitude: location.longitude,
    radius_km: location.radius_km,
    travel_fee_mode: location.travel_fee_mode,
    travel_fee_per_km: location.travel_fee_per_km,
  }
}

const session = startRun({
  command: 'node e2e/tutor-search.mjs',
  evidence: evidenceFile('006-tutor-search', 'tutor-search.log'),
})
const { check } = session

async function openSearch(page) {
  await page.getByRole('button', { name: 'Buscar um serviço' }).click()
  await page.getByText('Informe o endereço e escolha um serviço ou uma modalidade.').waitFor()
}

async function searchAddress(page, address, serviceName) {
  await fillServiceAddress(page, address)
  if (serviceName) {
    const selected = page.getByRole('radio', { name: `${serviceName}, selecionado` })
    if (await selected.count() === 0) {
      const service = page.getByRole('radio', { name: serviceName, exact: true })
      await service.scrollIntoViewIfNeeded()
      await service.click()
    }
  }
  await page.getByRole('button', { name: 'Buscar' }).click()
}

async function cardLabel(page) {
  const card = page.getByRole('button', { name: /Groomer de Teste/ })
  await card.waitFor({ timeout: 15000 })
  return card.evaluate((element) => element.getAttribute('aria-label') || element.textContent || '')
}

async function run(browser) {
  const gate = { fail: false, delayMs: 0 }
  const page = await openPage(browser, { viewport: 'mobile' })
  await gateRoute(page, '**/api/v1/providers/coverage**', gate)

  await loginTutor(page)
  await openSearch(page)
  check('AC-01 busca da home abre a listagem', await page.getByRole('button', { name: 'Buscar' }).count() > 0)

  const shotDir = evidenceFile('006-tutor-search', 'ui-review')
  mkdirSync(shotDir, { recursive: true })
  const shot = (target, name) => target.screenshot({ path: path.join(shotDir, `${name}.png`), fullPage: true })
  await shot(page, '01-mobile-vazio')

  await page.getByRole('button', { name: 'Buscar' }).click()
  await page.getByText('Endereço do atendimento obrigatório', { exact: true }).waitFor()
  await page.getByText('Selecione um serviço ou uma modalidade', { exact: true }).waitFor()
  check('AC-02 endereço e filtro são exigidos', true)
  await shot(page, '07-mobile-erro')
  check('AC-06 mapa vazio pede uma sugestão', await page.getByLabel('Mapa sem ponto').count() > 0)

  let delayAutocomplete = true
  await page.route('**/service-location/autocomplete**', async route => {
    if (delayAutocomplete) {
      delayAutocomplete = false
      await new Promise(resolve => setTimeout(resolve, 800))
    }
    await route.continue()
  })
  const addressField = page.getByRole('combobox', { name: 'Endereço do atendimento' })
  await addressField.fill('Avenida Paulista, São Paulo')
  await page.getByRole('progressbar', { name: 'Buscando endereços' }).waitFor({ timeout: 5000 })
  check(
    'AC-06 sugestão não bloqueia a busca',
    await page.getByRole('button', { name: 'Buscar' }).isVisible() && await page.getByLabel('Carregando').count() === 0,
  )
  const option = page.getByRole('option', { name: /Paulista/ }).first()
  await option.waitFor({ timeout: 15000 })
  await shot(page, '02-mobile-sugestoes')
  await option.click()
  await page.getByRole('listbox').waitFor({ state: 'hidden' })
  const map = page.locator('iframe[title*="Paulista"]')
  await map.waitFor({ timeout: 20000 })
  await page.frameLocator('iframe[title*="Paulista"]').locator('img.leaflet-tile-loaded').first().waitFor({ timeout: 20000 })
  await map.scrollIntoViewIfNeeded()
  await shot(page, '03-mobile-mapa')
  check('AC-06 sugestão escolhida mostra o mapa', await page.getByLabel('Mapa sem ponto').count() === 0)

  await page.getByRole('radio', { name: 'Banho', exact: true }).click()
  const coverageSent = page.waitForRequest(request => (
    request.url().includes('/providers/coverage') && request.url().includes('latitude=')
  ))
  await page.getByRole('button', { name: 'Buscar' }).click()
  const coverageRequest = await coverageSent
  await page.getByRole('button', { name: /Groomer de Teste/ }).waitFor({ timeout: 15000 })
  check('AC-06 busca usa o ponto da sugestão', coverageRequest.url().includes('longitude='), coverageRequest.url())

  gate.fail = true
  await searchAddress(page, 'Avenida Paulista, São Paulo', 'Banho')
  await page.getByText('Não foi possível conectar à API. Verifique o servidor e tente novamente.').waitFor({ timeout: 15000 })
  check('AC-05 erro da busca', true)
  gate.fail = false
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await page.getByRole('button', { name: /Groomer de Teste/ }).waitFor({ timeout: 15000 })

  gate.delayMs = 1200
  await page.getByRole('radio', { name: 'Tosa', exact: true }).click()
  await page.getByText('Buscando groomers').waitFor({ timeout: 5000 })
  check('AC-05 carregando', true)
  gate.delayMs = 0
  const tosaCard = await cardLabel(page)
  check('AC-02 filtro de serviço muda o preço', tosaCard.includes('Tosa') && tosaCard.includes('100,00') && tosaCard.includes('5,0'), tosaCard)

  await fillServiceAddress(page, 'Jabaquara, São Paulo')
  if (await page.getByRole('radio', { name: 'Banho, selecionado' }).count() === 0) {
    await page.getByRole('radio', { name: 'Banho', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Buscar' }).click()
  await page.getByText('Nenhum groomer atende este endereço.').waitFor({ timeout: 15000 })
  check('AC-03 e AC-05 groomer fora do raio fica de fora', true)

  await fillServiceAddress(page, 'Rua sem mapa, 10')
  await page.getByRole('button', { name: 'Buscar' }).click()
  await page.getByText('Não foi possível localizar este endereço.').waitFor({ timeout: 15000 })
  check('AC-05 endereço desconhecido é erro', true)

  await searchAddress(page, 'Avenida Paulista, São Paulo', 'Banho')
  const banhoCard = await cardLabel(page)
  check('AC-04 card mostra avaliação e preço', banhoCard.includes('5,0') && banhoCard.includes('80,00') && banhoCard.includes('Banho'), banhoCard)
  await page.getByRole('button', { name: /Groomer de Teste/ }).click()
  await page.getByLabel('Profissional Groomer de Teste').waitFor({ timeout: 15000 })
  check(
    'AC-04 card abre o perfil',
    await page.getByText('Atendimento em domicílio. O tutor precisa estar presente durante o serviço.', { exact: true }).count() > 0,
  )

  await page.getByRole('button', { name: 'Voltar' }).click()
  await page.getByRole('button', { name: 'Voltar' }).click()
  await page.getByRole('button', { name: 'Banho e Tosa' }).click()
  await page.getByRole('button', { name: 'Banho', exact: true }).click()
  await page.getByText('Informe o endereço do atendimento para ver quem atende.').waitFor()
  await page.getByRole('radio', { name: 'Banho, selecionado' }).waitFor()
  check('AC-03 categoria também passa pela cobertura', await page.getByRole('button', { name: /Groomer de Teste/ }).count() === 0)

  const wide = await openPage(browser, { viewport: 'desktop' })
  await loginTutor(wide)
  await openSearch(wide)
  await shot(wide, '04-desktop-vazio')
  await checkContrast(wide, wide.getByText('Quem atende', { exact: true }).first(), 'AC-01 desktop claro', check)
  await wide.getByRole('combobox', { name: 'Endereço do atendimento' }).fill('Avenida Paulista, São Paulo')
  await wide.getByRole('option', { name: /Paulista/ }).first().click()
  const wideMap = wide.locator('iframe[title*="Paulista"]')
  await wideMap.waitFor({ timeout: 20000 })
  await wide.frameLocator('iframe[title*="Paulista"]').locator('img.leaflet-tile-loaded').first().waitFor({ timeout: 20000 })
  await wideMap.scrollIntoViewIfNeeded()
  await shot(wide, '05-desktop-mapa')
  await wide.getByRole('button', { name: 'Buscar' }).scrollIntoViewIfNeeded()
  await shot(wide, '06-desktop-busca')
  check('AC-06 mapa no desktop', await wide.getByLabel('Mapa sem ponto').count() === 0)

  const dark = await openPage(browser, { viewport: 'mobile', colorScheme: 'dark' })
  await loginTutor(dark)
  await openSearch(dark)
  await checkContrast(dark, dark.getByText('Quem atende', { exact: true }).first(), 'AC-01 celular escuro', check)
}

let browser
let restoreLocation
try {
  const groomer = await apiLogin('groomer@email.com')
  const current = await apiJson('/providers/service-location', groomer)
  restoreLocation = () => apiJson('/providers/service-location', groomer, 'PUT', locationPayload(current.data))
  await apiJson('/providers/service-location', groomer, 'PUT', {
    address: 'Avenida Paulista, São Paulo',
    postal_code: '01310100',
    complement: null,
    radius_km: 8,
    travel_fee_mode: 'included',
    travel_fee_per_km: null,
  })
  browser = await launchBrowser()
  await run(browser)
} catch (error) {
  session.fail(error)
} finally {
  if (restoreLocation) await restoreLocation().catch(error => session.fail(error))
  await session.finish(browser)
}
