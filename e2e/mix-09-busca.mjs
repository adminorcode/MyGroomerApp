import { readFileSync } from 'node:fs'
import { apiUrl, evidenceFile, fillServiceAddress, gateRoute, launchBrowser, loginTutor, openCoverageFilters, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const api = `${apiUrl}/api/v1`
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-09-busca.mjs',
  evidence: evidenceFile(plan, 'mix-09-busca.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))

const TEAL = 'rgb(22, 125, 131)' // brand.teal (R3)
const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (R1, AC-02)
const TEXT_PINK = 'rgb(198, 38, 105)' // action.primaryOutline (CMP-06)
const WHITE = 'rgb(255, 255, 255)' // onAction.primary / text.inverse
const CANVAS = 'rgb(249, 248, 246)' // surface.canvas
const ERROR = 'rgb(179, 38, 30)' // feedback.error

const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}

async function styleOf(locator) {
  return locator.evaluate(el => {
    const cs = getComputedStyle(el)
    return {
      color: cs.color,
      background: cs.backgroundColor,
      border: cs.borderTopColor,
      borderWidth: cs.borderTopWidth,
      radius: cs.borderRadius,
      minHeight: cs.minHeight,
    }
  })
}

async function textColor(locator, text) {
  return locator.getByText(text, { exact: true }).first().evaluate(el => getComputedStyle(el).color)
}

// Primeiro ancestral com fundo não transparente: a faixa teal do cabeçalho.
async function enclosingBackground(locator) {
  return locator.evaluate(el => {
    for (let node = el; node; node = node.parentElement) {
      const background = getComputedStyle(node).backgroundColor
      if (background !== 'rgba(0, 0, 0, 0)') return background
    }
    return ''
  })
}

// Cenário de dados: o groomer de teste atende o endereço da Avenida Paulista (mesmo fixture do tutor-search).
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

async function flow(browser) {
  const gate = { fail: false, delayMs: 0 }
  const page = await openPage(browser, { viewport: 'mobile' })
  await gateRoute(page, '**/api/v1/providers/coverage**', gate)
  await loginTutor(page)
  await page.getByRole('button', { name: 'Buscar um serviço' }).click()
  await page.getByRole('button', { name: 'Filtros', exact: true }).waitFor()

  // --- Cabeçalho e filtros recolhidos (tela 09) ---
  const heading = page.getByText('Quem atende', { exact: true }).first()
  const headingColor = await heading.evaluate(el => getComputedStyle(el).color)
  const TEXT = 'rgb(37, 61, 66)'
  check('Q1 cabeçalho de busca é claro, sem faixa teal', await enclosingBackground(heading) !== TEAL, await enclosingBackground(heading))
  check('Q1 título Quem atende usa texto principal', headingColor === TEXT, headingColor)
  check('Q1 botão Voltar tem rótulo acessível na faixa', await page.getByRole('button', { name: 'Voltar', exact: true }).count() === 1)
  check('AC-08 filtros começam fechados', await page.getByRole('radio', { name: 'Modalidade' }).count() === 0 && await page.getByText('Modalidade', { exact: true }).count() === 0)
  check('AC-02 a lista não depende do botão Buscar', await page.getByRole('button', { name: 'Buscar', exact: true }).count() === 0)
  const filterButton = page.getByRole('button', { name: 'Filtros', exact: true })
  const filterStyle = await styleOf(filterButton)
  check('AC-07 pílula Filtros tem alvo de 48 pt e borda de 1 pt', filterStyle.minHeight === '48px' && filterStyle.borderWidth === '1px', `${filterStyle.minHeight} ${filterStyle.borderWidth}`)
  await shot(page, 'mix-09-vazio')

  // --- Endereço salvo: a lista carrega sozinha, sem campo de endereço e sem mapa ---
  await fillServiceAddress(page, 'Avenida Paulista, São Paulo')
  await page.getByRole('button', { name: /Groomer de Teste/ }).first().waitFor({ timeout: 20000 })
  check('AC-08 com endereço a lista aparece sem filtro obrigatório', await page.getByRole('button', { name: /Groomer de Teste/ }).count() > 0)
  check('AC-07 não há campo de endereço para digitar', await page.getByRole('combobox', { name: 'Endereço do atendimento' }).count() === 0)
  check('AC-B com endereço escolhido não há mapa do atendimento', await page.getByTitle(/Mapa do atendimento/).count() === 0)
  await shot(page, 'mix-09-erro-validacao')
  await page.getByRole('button', { name: 'Trocar endereço', exact: true }).click()
  check('AC-E Trocar mostra os endereços salvos', await page.getByRole('button', { name: /Padrão, selecionado/ }).count() === 1)
  await page.getByRole('button', { name: 'Fechar troca de endereço', exact: true }).click()
  await shot(page, 'mix-09-endereco-trocar')

  // --- Painel desce ao tocar em Filtros; chip selecionado em rosa, o outro com contorno ---
  await openCoverageFilters(page)
  const groupLabelColor = await textColor(page, 'Modalidade')
  check('R5 rótulo de grupo em teal sobre canvas com contraste 4,5:1 ou mais', groupLabelColor === TEAL && ratio(groupLabelColor, CANVAS) >= 4.5, `${groupLabelColor} ${ratio(groupLabelColor, CANVAS).toFixed(2)}:1`)
  await page.getByRole('radio', { name: 'Banho', exact: true }).click()
  const selected = page.getByRole('radio', { name: 'Banho, selecionado', exact: true })
  await selected.waitFor()
  const selectedStyle = await styleOf(selected)
  const selectedText = await textColor(selected, 'Banho')
  check('R1 serviço selecionado usa action.primary com texto branco', selectedStyle.background === CTA_PINK && selectedText === WHITE, `${selectedStyle.background} ${selectedText}`)
  const unselected = page.getByRole('radio', { name: 'Tosa', exact: true })
  const unselectedStyle = await styleOf(unselected)
  check('CMP-06 serviço não selecionado tem contorno action.primaryOutline sobre branco', unselectedStyle.border === TEXT_PINK && unselectedStyle.background === WHITE, `${unselectedStyle.border} ${unselectedStyle.background}`)
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click()

  // --- Resultados: avatar, preço e cartão ---
  const profile = page.getByRole('button', { name: /Groomer de Teste/ })
  await profile.waitFor({ timeout: 15000 })
  const cardStyle = await profile.evaluate(el => {
    let node = el.parentElement
    while (node) {
      const style = getComputedStyle(node)
      if (style.borderTopWidth === '1px') {
        return { radius: style.borderRadius, borderWidth: style.borderTopWidth, background: style.backgroundColor, teal: [...node.querySelectorAll('*')].some(child => getComputedStyle(child).backgroundColor === 'rgb(22, 125, 131)') }
      }
      node = node.parentElement
    }
    return null
  })
  check('AC-07 cartão do profissional com raio 16 e borda 1 pt', cardStyle?.radius === '16px' && cardStyle?.borderWidth === '1px' && cardStyle?.background === WHITE, JSON.stringify(cardStyle))
  check('CMP-11 avatar do profissional em teal sólido (R3)', cardStyle?.teal === true)
  const priceColor = await page.getByText(/^R\$/).first().evaluate(el => getComputedStyle(el).color)
  check('REF preço do profissional em teal sobre branco', priceColor === TEAL && ratio(priceColor, WHITE) >= 4.5, priceColor)
  await shot(page, 'mix-09-resultados')

  // --- Carregando: indicador com texto ---
  gate.delayMs = 1500
  await openCoverageFilters(page)
  await page.getByRole('radio', { name: 'Tosa', exact: true }).click()
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await page.getByText('Buscando groomers', { exact: true }).waitFor({ timeout: 5000 })
  check('AC-08 carregando mostra indicador com texto', await page.getByText('Buscando groomers', { exact: true }).isVisible())
  await page.getByText('Buscando groomers', { exact: true }).scrollIntoViewIfNeeded()
  await shot(page, 'mix-09-carregando')
  gate.delayMs = 0
  await page.getByText('Buscando groomers', { exact: true }).waitFor({ state: 'hidden', timeout: 15000 })
  await page.getByRole('button', { name: /Groomer de Teste/ }).waitFor({ timeout: 15000 })

  // --- Erro de rede: mensagem em texto e ação de nova tentativa ---
  gate.fail = true
  await fillServiceAddress(page, 'Avenida Paulista, 1000, São Paulo')
  await page.getByText('Não foi possível conectar. Verifique sua internet e tente novamente.').waitFor({ timeout: 15000 })
  check('AC-08 erro de busca tem mensagem em texto e ação Tentar novamente', await page.getByRole('button', { name: 'Tentar novamente', exact: true }).isVisible())
  await shot(page, 'mix-09-erro')
  gate.fail = false
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await page.getByRole('button', { name: /Groomer de Teste/ }).waitFor({ timeout: 15000 })
  check('AC-08 tentar novamente recupera os resultados', await page.getByRole('button', { name: /Groomer de Teste/ }).count() === 1)

  // --- Sem HEX literal e sem componentes legados na tela ---
  const source = readFileSync(new URL('../screens/customer/TutorSearchScreen.tsx', import.meta.url), 'utf8')
  check('AC-10 tela de busca sem HEX literal', !/#[0-9a-fA-F]{3,8}\b/.test(source))
  check('AC-14 tela de busca sem BoameBtn, Input, BookingCard ou StatusBadge', !/BoameBtn|\bInput\b|BookingCard|StatusBadge/.test(source))
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
  await flow(browser)
} catch (error) {
  run.fail(error)
} finally {
  if (typeof restoreLocation === 'function') await restoreLocation().catch(error => run.fail(error))
  await run.finish(browser)
}
