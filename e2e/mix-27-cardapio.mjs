import { evidenceFile, gateRoute, launchBrowser, loginProfessional, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-27-cardapio.mjs',
  evidence: evidenceFile(plan, 'mix-27-cardapio.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))
const button = (page, name) => page.getByRole('button', { name, exact: true })
const MENU_ROUTE = '**/api/v1/providers/menu**'
const MENU_ERROR = 'Não foi possível conectar. Verifique sua internet e tente novamente.'
const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (R1)
const TEXT_PINK = 'rgb(198, 38, 105)' // action.primaryOutline / rosa-texto (R1, R5)
const TEAL = 'rgb(22, 125, 131)' // brand.teal (R3)
const TEAL_SUBTLE = 'rgb(233, 243, 242)' // surface.tealSubtle (CMP-11)
const TEXT_PRIMARY = 'rgb(37, 61, 66)' // text.primary (R5 sobre tealSubtle)
const SUCCESS = 'rgb(23, 107, 84)' // feedback.success (R6)
const SUCCESS_SURFACE = 'rgb(229, 245, 239)' // feedback.successSurface (R6)
const ERROR = 'rgb(179, 38, 30)' // feedback.error
const DISABLED_SURFACE = 'rgb(228, 232, 232)' // state.disabledSurface
const BORDER = 'rgb(217, 224, 225)' // border.default
const WHITE = 'rgb(255, 255, 255)'

const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}

// Telas empilhadas permanecem no DOM: só o primeiro elemento visível conta.
async function visible(locator) {
  const count = await locator.count()
  for (let index = 0; index < count; index += 1) {
    const item = locator.nth(index)
    if (await item.isVisible()) return item
  }
  return null
}

async function styleOf(locator) {
  return locator.evaluate(el => ({
    color: getComputedStyle(el).color,
    fontSize: getComputedStyle(el).fontSize,
    fontWeight: getComputedStyle(el).fontWeight,
  }))
}

async function boxOf(control) {
  return control.evaluate(el => {
    const cs = getComputedStyle(el)
    return { background: cs.backgroundColor, border: cs.borderTopColor, borderWidth: cs.borderTopWidth, radius: cs.borderRadius, minHeight: cs.minHeight }
  })
}

async function openServices(page) {
  const tab = page.getByRole('tab', { name: 'Serviços' })
  const tabButton = page.getByRole('button', { name: 'Serviços', exact: true })
  await tab.or(tabButton).first().waitFor({ timeout: 20000 })
  if (await tab.count()) await tab.click()
  else await tabButton.click()
}

let browser
try {
  browser = await launchBrowser()

  // --- Erro do cardápio (tela 27): falha de rede mantém texto e nova tentativa ---
  const failing = await openPage(browser)
  await gateRoute(failing, MENU_ROUTE, { fail: true })
  await loginProfessional(failing)
  await openServices(failing)
  await failing.getByText(MENU_ERROR).waitFor({ timeout: 15000 }).catch(() => {})
  check('AC-08 erro do cardápio mostra texto de falha', (await failing.getByText(MENU_ERROR).count()) > 0)
  check('AC-08 erro do cardápio mantém ação Tentar novamente', await button(failing, 'Tentar novamente').isVisible())
  await shot(failing, 'cardapio-erro')

  // --- Carregando (tela 27): o estado de carregamento tem rótulo acessível ---
  const slow = await openPage(browser)
  await gateRoute(slow, MENU_ROUTE, { delayMs: 2500 })
  await loginProfessional(slow)
  await openServices(slow)
  const loading = slow.getByLabel('Carregando').first()
  await loading.waitFor({ timeout: 5000 }).catch(() => {})
  check('AC-08 cardápio sinaliza carregamento com rótulo', (await slow.getByLabel('Carregando').count()) > 0)
  await shot(slow, 'cardapio-carregando')

  // --- Cardápio carregado (tela 27) ---
  const page = await openPage(browser)
  await loginProfessional(page)
  await openServices(page)
  await page.getByText('Dados do serviço', { exact: true }).first().waitFor({ timeout: 20000 })
  const heading = await visible(page.getByRole('heading', { name: 'Dados do serviço', exact: true }))
  check('AC-08 cabeçalho do cardápio é título de tela', heading !== null)

  // Cartão do serviço "Banho": o nome também aparece em cards da agenda, então o cartão é o bloco que contém o botão Editar Banho.
  const card = button(page, 'Editar Banho').locator('xpath=ancestor::div[.//div[normalize-space(.)="Banho"]][1]')
  const serviceName = card.getByText('Banho', { exact: true }).first()
  check('CMP-11 nome do serviço visível no cartão', (await serviceName.count()) === 1 && await serviceName.isVisible())
  if (await serviceName.count()) {
    // Cabeçalho do cartão (destaque tealSubtle): filho direto do bloco do título, com o avatar como primeiro filho.
    const header = serviceName.locator('xpath=../..')
    const headerBox = await header.evaluate(el => ({ background: getComputedStyle(el).backgroundColor, radius: getComputedStyle(el).borderRadius }))
    check('CMP-11 destaque do profissional em tealSubtle', headerBox.background === TEAL_SUBTLE, JSON.stringify(headerBox))
    const avatarBg = await header.locator('xpath=./*[1]').evaluate(el => getComputedStyle(el).backgroundColor)
    check('CMP-11 avatar do profissional em teal sólido', avatarBg === TEAL, avatarBg)
    const nameStyle = await styleOf(serviceName)
    check('R5 nome do serviço em text.primary sobre tealSubtle', nameStyle.color === TEXT_PRIMARY, nameStyle.color)

    const cardBox = await card.evaluate(el => {
      const cs = getComputedStyle(el)
      return { background: cs.backgroundColor, border: cs.borderTopColor, borderWidth: cs.borderTopWidth, radius: cs.borderRadius }
    })
    check('AC-07 cartão de serviço em raio 16 com borda 1 pt', cardBox.radius === '16px' && cardBox.borderWidth === '1px' && cardBox.border === BORDER, JSON.stringify(cardBox))
    check('AC-07 cartão de serviço em superfície branca', cardBox.background === WHITE, cardBox.background)
  }

  const active = card.getByText('Ativo', { exact: true }).first()
  check('R6 status Ativo com texto', (await active.count()) > 0)
  if (await active.count()) {
    const badge = await active.evaluate(el => ({ color: getComputedStyle(el).color, background: getComputedStyle(el.parentElement).backgroundColor }))
    check('R6 status Ativo usa semântica de sucesso, não a cor da marca', badge.color === SUCCESS && badge.background === SUCCESS_SURFACE, JSON.stringify(badge))
  }

  const price = card.getByText(/^Pequeno R\$/).first()
  check('R3 preço por porte presente', (await price.count()) > 0)
  if (await price.count()) {
    const priceStyle = await styleOf(price)
    const cardBackground = await price.evaluate(el => getComputedStyle(el.parentElement.parentElement).backgroundColor)
    check('R3 preço por porte em teal', priceStyle.color === TEAL, priceStyle.color)
    check('R5 preço teal sobre superfície branca com 4,5:1 ou mais', cardBackground === WHITE && ratio(priceStyle.color, cardBackground) >= 4.5, `${priceStyle.color} sobre ${cardBackground}`)
  }

  const add = button(page, 'Adicionar serviço')
  const addBox = await boxOf(add)
  const addText = await styleOf(add.getByText('Adicionar serviço', { exact: true }))
  check('R1 Adicionar serviço é ação secundária em contorno rosa', addBox.background === 'rgba(0, 0, 0, 0)' && addBox.border === TEXT_PINK && addText.color === TEXT_PINK, JSON.stringify(addBox))

  const edit = button(page, 'Editar Banho')
  const editBox = await boxOf(edit)
  check('R1 Editar serviço é CTA action.primary', editBox.background === CTA_PINK, JSON.stringify(editBox))

  const toggle = button(page, 'Desativar Banho')
  const toggleBox = await boxOf(toggle)
  check('R1 Desativar é ação secundária em contorno rosa', toggleBox.background === 'rgba(0, 0, 0, 0)' && toggleBox.border === TEXT_PINK, JSON.stringify(toggleBox))

  const continuar = button(page, 'Continuar')
  const ctaBox = await boxOf(continuar)
  const ctaText = await styleOf(continuar.getByText('Continuar', { exact: true }))
  check('AC-02 Continuar é CTA action.primary com texto branco', ctaBox.background === CTA_PINK && ctaText.color === WHITE, JSON.stringify(ctaBox))
  check('AC-07 botões em altura 40', ctaBox.minHeight === '40px', ctaBox.minHeight)
  const enabledContinue = await visible(continuar)
  check('AC-08 Continuar habilitado com serviço cadastrado', enabledContinue !== null && await enabledContinue.isEnabled())
  await shot(page, 'cardapio-servicos')

  // --- Desabilitado (tela 27): porte incompleto bloqueia Continuar com texto ---
  const incomplete = await openPage(browser)
  await incomplete.route(MENU_ROUTE, async route => {
    if (route.request().method() !== 'GET') return route.continue()
    const response = await route.fetch()
    const json = await response.json()
    // A API envia null para porte sem preço (não string vazia): o cenário usa o mesmo formato.
    json.data.offers = json.data.offers.map(offer => (offer.name === 'Banho' ? { ...offer, prices: { ...offer.prices, large: null } } : offer))
    return route.fulfill({ response, body: JSON.stringify(json), contentType: 'application/json' })
  })
  await loginProfessional(incomplete)
  await openServices(incomplete)
  const issue = incomplete.getByText('Complete a descrição, o preço e a duração de cada porte antes de continuar.')
  await issue.waitFor({ timeout: 15000 }).catch(() => {})
  check('AC-08 porte incompleto mostra motivo em texto', (await issue.count()) > 0)
  if ((await issue.count()) > 0) {
    const issueStyle = await styleOf(issue.first())
    check('R6 motivo de bloqueio em semântica de erro', issueStyle.color === ERROR, issueStyle.color)
  }
  const blocked = button(incomplete, 'Continuar')
  check('AC-08 Continuar desabilitado com porte incompleto', await blocked.isDisabled())
  const blockedBox = await boxOf(blocked)
  check('AC-08 Continuar desabilitado sem preenchimento de marca', blockedBox.background === DISABLED_SURFACE, JSON.stringify(blockedBox))
  await shot(incomplete, 'cardapio-incompleto')

  // --- Vazio (tela 27): sem serviços, o texto e a ação de adicionar seguem visíveis ---
  const empty = await openPage(browser)
  await empty.route(MENU_ROUTE, route => {
    if (route.request().method() !== 'GET') return route.continue()
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { offers: [], suggestions: [], types: [], categories: [] } }),
    })
  })
  await loginProfessional(empty)
  await openServices(empty)
  await empty.getByText('Nenhum serviço', { exact: true }).waitFor({ timeout: 15000 }).catch(() => {})
  check('AC-08 cardápio vazio mostra título e descrição', (await empty.getByText('Nenhum serviço', { exact: true }).count()) > 0)
  check('AC-08 cardápio vazio mantém Adicionar serviço', await button(empty, 'Adicionar serviço').isVisible())
  const emptyContinue = await visible(button(empty, 'Continuar'))
  check('AC-08 Continuar desabilitado com cardápio vazio', emptyContinue !== null && await emptyContinue.isDisabled())
  await shot(empty, 'cardapio-vazio')
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
