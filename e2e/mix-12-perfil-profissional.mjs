import { evidenceFile, fillServiceAddress, gateRoute, launchBrowser, loginTutor, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-12-perfil-profissional.mjs',
  evidence: evidenceFile(plan, 'mix-12-perfil-profissional.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))
// Título da seção de serviços visível (a tela empilhada por baixo não conta).
const servicesTitle = page => page.getByText('Serviços disponíveis', { exact: true }).filter({ visible: true }).first()

const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (R1)
const TEXT_PINK = 'rgb(198, 38, 105)' // action.primaryOutline (R5)
const TEAL = 'rgb(22, 125, 131)' // brand.teal (R3, CMP-11)
const TEXT_PRIMARY = 'rgb(37, 61, 66)' // text.primary
const WHITE = 'rgb(255, 255, 255)'
const DISABLED_SURFACE = 'rgb(228, 232, 232)' // state.disabledSurface

const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}

// Telas empilhadas permanecem no DOM: só conta o elemento visível.
async function visibleOf(locator) {
  const count = await locator.count()
  for (let index = 0; index < count; index += 1) {
    const item = locator.nth(index)
    if (await item.isVisible()) return item
  }
  return null
}

async function styleOf(locator) {
  return locator.evaluate(el => {
    const cs = getComputedStyle(el)
    return {
      background: cs.backgroundColor,
      color: cs.color,
      border: cs.borderTopColor,
      radius: cs.borderTopLeftRadius,
      minHeight: cs.minHeight,
    }
  })
}

async function openProfile(page) {
  await page.getByRole('button', { name: 'Buscar um serviço' }).click()
  await fillServiceAddress(page, 'Avenida Paulista, São Paulo')
  await page.getByRole('button', { name: /Groomer de Teste/ }).click()
}

let browser
try {
  browser = await launchBrowser()
  const gate = { fail: false, delayMs: 0 }
  const page = await openPage(browser, { viewport: 'mobile' })
  await gateRoute(page, '**/api/v1/providers/**/profile', gate)
  await loginTutor(page)

  // --- Erro (tela 12) ---
  gate.fail = true
  await openProfile(page)
  const retry = page.getByRole('button', { name: 'Tentar novamente', exact: true })
  await page.getByText('Não foi possível carregar este perfil.').waitFor({ timeout: 15000 })
  check('AC-08 erro do perfil mantém texto e ação Tentar novamente', await retry.isEnabled())
  await shot(page, 'perfil-tutor-erro')

  // --- Carregando (tela 12) ---
  gate.fail = false
  gate.delayMs = 1500
  await retry.click()
  await page.getByText('Carregando perfil', { exact: true }).waitFor({ timeout: 15000 })
  check('AC-08 carregando mostra indicador e texto', await page.getByLabel('Carregando perfil', { exact: true }).isVisible())
  await shot(page, 'perfil-tutor-carregando')
  gate.delayMs = 0

  // --- Perfil sem serviço escolhido ---
  await page.getByText('Regras de atendimento', { exact: true }).waitFor({ timeout: 15000 })
  const book = page.getByRole('button', { name: 'Agendar serviço', exact: true })
  const header = page.getByLabel('Profissional Groomer de Teste', { exact: true })
  await header.waitFor()

  const tealAvatar = await header.locator('div').evaluateAll((els, teal) => els.some(el => getComputedStyle(el).backgroundColor === teal), TEAL)
  check('CMP-11 R3 avatar do profissional é teal sólido', tealAvatar)
  check('CMP-11 contraste do texto branco sobre teal é 4,5:1 ou mais', ratio(WHITE, TEAL) >= 4.5, `${ratio(WHITE, TEAL).toFixed(2)}:1`)
  const initial = await visibleOf(header.getByText(/^[A-Z]$/))
  check(
    'CMP-11 inicial do avatar teal usa texto branco',
    initial === null || (await styleOf(initial)).color === WHITE,
    initial === null ? 'sem inicial visível (foto ou ausente)' : 'inicial fora do branco',
  )

  const rules = await page.getByText('Regras de atendimento', { exact: true }).evaluate(el => {
    let node = el
    while (node) {
      const cs = getComputedStyle(node)
      if (cs.borderTopWidth === '1px') return { background: cs.backgroundColor, radius: cs.borderTopLeftRadius }
      node = node.parentElement
    }
    return null
  })
  check('AC-07 card de regras em branco com borda 1 pt e raio 16', rules?.background === WHITE && rules?.radius === '16px', JSON.stringify(rules))

  const idle = await styleOf(book)
  check(
    'AC-08 Agendar serviço desabilitado sem seleção usa superfície desabilitada e texto de orientação',
    await book.isDisabled() && idle.background === DISABLED_SURFACE && await page.getByText('Selecione um serviço para continuar.', { exact: true }).isVisible(),
    idle.background,
  )
  await shot(page, 'perfil-sem-servico')

  // Seção Serviços sem seleção: a lista e "Selecione um serviço para continuar." ficam abaixo da dobra.
  await servicesTitle(page).evaluate(el => el.scrollIntoView({ block: 'start' }))
  await shot(page, 'perfil-servicos-secao-sem-selecao')

  // --- Serviço selecionado libera o CTA rosa (R1) ---
  await page.getByRole('radio', { name: /^Banho, A partir de/ }).click()
  const selected = page.getByRole('radio', { name: /Banho, selecionado, A partir de/ })
  await selected.waitFor()
  const selectedStyle = await styleOf(selected)
  check('AC-02 serviço selecionado usa contorno action.primary', selectedStyle.border === CTA_PINK, selectedStyle.border)
  check('R1 serviço selecionado usa action.primary com nome em branco (CMP-06)', selectedStyle.background === CTA_PINK && (await styleOf(selected.getByText('Banho', { exact: true }))).color === WHITE, selectedStyle.background)

  const enabled = await styleOf(book)
  const enabledLabel = await styleOf(book.getByText('Agendar serviço', { exact: true }))
  check('AC-02 Agendar serviço é action.primary com texto branco', await book.isEnabled() && enabled.background === CTA_PINK && enabledLabel.color === WHITE, `${enabled.background} ${enabledLabel.color}`)
  check('AC-04 texto branco sobre o CTA mantém contraste 4,5:1 ou mais', ratio(WHITE, CTA_PINK) >= 4.5, `${ratio(WHITE, CTA_PINK).toFixed(2)}:1`)
  check('AC-07 botão Agendar serviço com raio 16 e altura 40', enabled.radius === '16px' && enabled.minHeight === '40px', `${enabled.radius} ${enabled.minHeight}`)
  await shot(page, 'perfil-servico-selecionado')
  await servicesTitle(page).evaluate(el => el.scrollIntoView({ block: 'start' }))
  await shot(page, 'perfil-servicos-secao')
  await saveScreenshot(page, evidenceFile(plan, 'ui-review/perfil-tutor-390-completo.png'), { fullPage: true })

  // --- Desktop (1440) ---
  const wide = await openPage(browser, { viewport: 'desktop' })
  await loginTutor(wide)
  await openProfile(wide)
  await wide.getByRole('button', { name: 'Agendar serviço', exact: true }).waitFor()
  check('AC-08 desktop também começa com CTA desabilitado', await wide.getByRole('button', { name: 'Agendar serviço', exact: true }).isDisabled())
  await shot(wide, 'perfil-tutor-1440')
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
