import { APP_NAME, evidenceFile, gateRoute, launchBrowser, loginTutor, openCoverageFilters, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-08-inicio.mjs',
  evidence: evidenceFile(plan, 'mix-08-inicio.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))

const TEAL = 'rgb(22, 125, 131)' // brand.teal
const CANVAS = 'rgb(249, 248, 246)' // surface.canvas
const WHITE = 'rgb(255, 255, 255)' // surface.default
const PINK_SUBTLE = 'rgb(252, 229, 237)' // surface.pinkSubtle
const PINK_TEXT = 'rgb(198, 38, 105)' // action.primaryText (rosa-texto, R5)
const TEXT_PRIMARY = 'rgb(37, 61, 66)' // text.primary
const ERROR = 'rgb(179, 38, 30)' // feedback.error

const named = (page, role, name) => page.getByRole(role, { name, exact: true })

// Telas empilhadas permanecem no DOM: só vale o elemento visível.
async function visible(locator) {
  const count = await locator.count()
  for (let index = 0; index < count; index += 1) {
    const item = locator.nth(index)
    if (await item.isVisible()) return item
  }
  return null
}

async function inspect(locator, read) {
  const item = await visible(locator)
  return item ? item.evaluate(read) : null
}

async function countVisible(locator) {
  const count = await locator.count()
  let total = 0
  for (let index = 0; index < count; index += 1) {
    if (await locator.nth(index).isVisible()) total += 1
  }
  return total
}

async function isEnabledVisible(locator) {
  const item = await visible(locator)
  return item ? item.isEnabled() : false
}

function readStyle(el) {
  const TEAL_BAND = 'rgb(22, 125, 131)'
  const cs = getComputedStyle(el)
  let effective = 'rgb(255, 255, 255)'
  for (let node = el; node; node = node.parentElement) {
    const bg = getComputedStyle(node).backgroundColor
    if (bg !== 'rgba(0, 0, 0, 0)') {
      effective = bg
      break
    }
  }
  let tealAncestor = false
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (getComputedStyle(node).backgroundColor === TEAL_BAND) {
      tealAncestor = true
      break
    }
  }
  return {
    color: cs.color,
    background: cs.backgroundColor,
    effective,
    tealAncestor,
    fontSize: cs.fontSize,
    lineHeight: cs.lineHeight,
    fontWeight: cs.fontWeight,
    textTransform: cs.textTransform,
    radius: cs.borderRadius,
    borderWidth: cs.borderTopWidth,
  }
}

function readDisc(el) {
  const PINK = 'rgb(252, 229, 237)'
  const node = [...el.querySelectorAll('div')].find(div => getComputedStyle(div).backgroundColor === PINK)
  if (!node) return null
  const cs = getComputedStyle(node)
  return { background: cs.backgroundColor, width: cs.width, height: cs.height, radius: cs.borderRadius }
}

const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

let browser
try {
  browser = await launchBrowser()

  // --- Início com categorias carregadas (estado feliz) ---
  const page = await openPage(browser)
  await loginTutor(page)
  await named(page, 'button', 'Banho e Tosa').first().waitFor({ timeout: 15000 })

  const search = await inspect(named(page, 'button', 'Buscar um serviço'), readStyle)
  check('Q1 faixa teal de cabeçalho com busca branca no Início', Boolean(search) && search.tealAncestor && search.effective === WHITE, JSON.stringify(search))
  check('H-01 marca aparece uma vez no topo, sem saudação Olá', await countVisible(page.getByText(APP_NAME, { exact: true })) === 1 && await countVisible(page.getByText(/^Olá/)) === 0)

  const hero = named(page, 'button', 'Explorar profissionais')
  const heroStyle = await inspect(hero, readStyle)
  check('CMP-04 hero rosa de 20 pt sobre pinkSubtle', Boolean(heroStyle) && heroStyle.background === PINK_SUBTLE && heroStyle.radius === '20px', JSON.stringify(heroStyle))
  check('CMP-04 ilustração em bloco dentro do hero', (await visible(hero.getByTestId('artwork-poodle'))) !== null)

  // Eyebrow do hero aprovado pelo usuário (texto 'Atendimento em domicílio'): caixa-alta, rosa-texto sobre pinkSubtle.
  const eyebrow = await inspect(page.getByText('Atendimento em domicílio', { exact: true }), readStyle)
  check('CMP-01 eyebrow em rosa-texto, 12 pt, caixa-alta', Boolean(eyebrow) && eyebrow.color === PINK_TEXT && eyebrow.fontSize === '12px' && eyebrow.textTransform === 'uppercase', JSON.stringify(eyebrow))
  check('R5 eyebrow sobre pinkSubtle mantém 4,5:1 ou mais', Boolean(eyebrow) && ratio(eyebrow.color, eyebrow.effective) >= 4.5, eyebrow ? `${ratio(eyebrow.color, eyebrow.effective).toFixed(2)}:1` : 'ausente')

  const title = await inspect(page.getByText('Um cuidado especial para seu pet', { exact: true }), readStyle)
  check('CMP-01 título do hero em 22/28 com text.primary', Boolean(title) && title.fontSize === '22px' && title.lineHeight === '28px' && title.color === TEXT_PRIMARY, JSON.stringify(title))

  const heroLabel = await inspect(hero.getByText('Explorar profissionais', { exact: true }), readStyle)
  check('AC-04 rótulo Explorar profissionais sobre pinkSubtle mantém 4,5:1 ou mais', Boolean(heroLabel) && ratio(heroLabel.color, heroLabel.effective) >= 4.5, heroLabel ? `${ratio(heroLabel.color, heroLabel.effective).toFixed(2)}:1` : 'ausente')

  const section = await inspect(named(page, 'heading', 'Categorias'), readStyle)
  check('CMP-09 rótulo Categorias em caixa-alta teal sobre canvas', Boolean(section) && section.textTransform === 'uppercase' && section.color === TEAL && section.effective === CANVAS, JSON.stringify(section))

  const tile = named(page, 'button', 'Banho e Tosa').first()
  const disc = await visible(tile).then(item => item ? item.evaluate(readDisc) : null)
  check('R2 disco da categoria em rosa (pinkSubtle)', Boolean(disc) && disc.background === PINK_SUBTLE, JSON.stringify(disc))
  const tileStyle = await inspect(named(page, 'button', 'Banho e Tosa'), readStyle)
  check('AC-07 cartão de categoria com raio 16 e borda 1 pt', Boolean(tileStyle) && tileStyle.radius === '16px' && tileStyle.borderWidth === '1px', JSON.stringify(tileStyle))
  await shot(page, 'inicio-390')

  // --- Carregando categorias (estado de espera) ---
  const loading = await openPage(browser)
  await gateRoute(loading, '**/api/v1/categories', { delayMs: 2500 })
  await loginTutor(loading)
  await loading.getByLabel('Carregando categorias').first().waitFor({ timeout: 10000 })
  check('AC-08 carregamento de categorias com indicador rotulado', (await visible(loading.getByLabel('Carregando categorias'))) !== null)
  check('AC-08 busca segue disponível enquanto carrega', await isEnabledVisible(named(loading, 'button', 'Buscar um serviço')))
  await shot(loading, 'inicio-carregando')

  // --- Erro ao carregar categorias (estado de erro com texto e ação) ---
  const failing = await openPage(browser)
  await gateRoute(failing, '**/api/v1/categories', { fail: true })
  await loginTutor(failing)
  const message = failing.getByText('Não foi possível carregar as categorias.', { exact: true })
  await message.first().waitFor({ timeout: 15000 })
  check('AC-08 erro de categorias com texto explicativo', (await visible(message)) !== null)
  const errorTitle = await inspect(failing.getByText('Algo deu errado', { exact: true }), readStyle)
  check('AC-08 título do erro em feedback.error com texto', Boolean(errorTitle) && errorTitle.color === ERROR, JSON.stringify(errorTitle))
  check('AC-08 ação Tentar novamente disponível no erro', await isEnabledVisible(named(failing, 'button', 'Tentar novamente')))
  check('AC-08 busca segue disponível no erro', await isEnabledVisible(named(failing, 'button', 'Buscar um serviço')))
  await shot(failing, 'inicio-erro')

  // --- Sem categorias (estado vazio com texto) ---
  const empty = await openPage(browser)
  await empty.route('**/api/v1/categories', async route => {
    const response = await route.fetch()
    const json = await response.json()
    json.data = []
    await route.fulfill({ response, json })
  })
  await loginTutor(empty)
  await empty.getByText('Nenhuma categoria', { exact: true }).first().waitFor({ timeout: 15000 })
  check('AC-08 estado vazio com título e descrição', (await visible(empty.getByText('Os serviços disponíveis aparecerão aqui.', { exact: true }))) !== null)
  await shot(empty, 'inicio-vazio')

  // --- Navegação preservada (plano 028): categoria abre a busca já filtrada; hero abre a busca ---
  await named(page, 'button', 'Banho e Tosa').first().click()
  await page.getByRole('button', { name: 'Filtros, 1 aplicado', exact: true }).waitFor({ timeout: 15000 })
  await openCoverageFilters(page)
  await page.getByRole('radio', { name: 'Banho e Tosa, selecionado', exact: true }).first().waitFor({ timeout: 15000 })
  check('AC-13 categoria abre a busca já filtrada pela modalidade', (await visible(page.getByRole('radio', { name: 'Banho e Tosa, selecionado', exact: true }))) !== null)

  const heroPage = await openPage(browser)
  await loginTutor(heroPage)
  await named(heroPage, 'button', 'Explorar profissionais').first().click()
  await heroPage.getByRole('button', { name: 'Filtros', exact: true }).waitFor({ timeout: 15000 })
  await openCoverageFilters(heroPage)
  await heroPage.getByRole('radio', { name: 'Banho', exact: true }).first().waitFor({ timeout: 15000 })
  check('AC-13 hero abre a busca de profissionais', (await visible(heroPage.getByRole('radio', { name: 'Banho', exact: true }))) !== null)
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
