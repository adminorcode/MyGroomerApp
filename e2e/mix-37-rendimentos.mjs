import { evidenceFile, gateRoute, launchBrowser, loginProfessional, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-37-rendimentos.mjs',
  evidence: evidenceFile(plan, 'mix-37-rendimentos.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))

const EARNINGS = '**/api/v1/providers/earnings'
const TEAL = 'rgb(22, 125, 131)' // brand.teal: valores de rendimento (R3)
const ALERT_TEXT = 'rgb(165, 59, 32)' // feedback.warning: Pendente como alerta (R6)
const ALERT_SURFACE = 'rgb(255, 241, 231)' // feedback.warningSurface
const TEXT_PRIMARY = 'rgb(37, 61, 66)' // text.primary
const WHITE = 'rgb(255, 255, 255)'

// Telas empilhadas permanecem no DOM: só interessa o que está visível.
const visible = locator => locator.filter({ visible: true })
const tab = page => page.getByRole('tab', { name: 'Rendimentos', exact: true })
  .or(page.getByRole('button', { name: 'Rendimentos', exact: true }))
  .first()

async function styleOf(locator) {
  return locator.evaluate(el => {
    const cs = getComputedStyle(el)
    return {
      color: cs.color,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      family: cs.fontFamily,
      background: cs.backgroundColor,
      radius: cs.borderRadius,
      border: cs.borderTopWidth,
    }
  })
}

let browser
try {
  browser = await launchBrowser()

  // --- Carregado (tela 37) ---
  const page = await openPage(browser)
  await loginProfessional(page)
  await tab(page).click()
  const totalLabel = visible(page.getByText('Total recebido', { exact: true }))
  await totalLabel.waitFor({ timeout: 20000 })

  // Destaque 20 pt: o card do total é o pai do rótulo.
  const summary = totalLabel.locator('xpath=..')
  const summaryStyle = await styleOf(summary)
  check('AC-07 destaque do total em card 20 pt com borda 1 pt', summaryStyle.radius === '20px' && summaryStyle.border === '1px' && summaryStyle.background === WHITE, JSON.stringify(summaryStyle))

  // R3 + CMP-01: valor total em 24 pt Bold teal, sobre branco (R5).
  const totalValue = totalLabel.locator('xpath=following-sibling::*[1]')
  const totalStyle = await styleOf(totalValue)
  // Bold do RN-Web é a família Inter-Bold (fontWeight computado permanece 400).
  check('AC-03 R3 total recebido em 24 pt Bold teal', totalStyle.fontSize === '24px' && /Inter-Bold/.test(totalStyle.family) && totalStyle.color === TEAL, JSON.stringify(totalStyle))
  check('AC-04 texto teal do total fica sobre branco (R5)', summaryStyle.background === WHITE && totalStyle.color === TEAL)

  // R6: Pendente é alerta com texto; o valor pendente não vira destaque de saldo.
  const pendingBadge = visible(page.getByText('Pendente', { exact: true })).first()
  const badgeStyle = await styleOf(pendingBadge)
  const badgeSurface = await pendingBadge.locator('xpath=..').evaluate(el => getComputedStyle(el).backgroundColor)
  check('AC-09 R6 Pendente usa semântica de alerta com texto', badgeStyle.color === ALERT_TEXT && badgeSurface === ALERT_SURFACE, `${badgeStyle.color} sobre ${badgeSurface}`)
  // Valor pendente = MGText (title, 16 pt) logo após o rótulo "Valor pendente" (caption), não o contêiner.
  const pendingValueStyle = await styleOf(visible(page.getByText('Valor pendente', { exact: true })).locator('xpath=following-sibling::*[1]'))
  check('AC-09 R6 valor pendente sem destaque de saldo (16 pt, texto primário)', pendingValueStyle.fontSize === '16px' && pendingValueStyle.color === TEXT_PRIMARY, JSON.stringify(pendingValueStyle))
  check('AC-13 nenhum rótulo de saldo disponível para saque', await visible(page.getByText('Disponível', { exact: true })).count() === 0)

  // Histórico: card 16 pt com borda 1 pt e valor do repasse em teal.
  const txSubtitle = visible(page.getByText(/ · /)).first()
  check('AC-03 histórico de repasses lista itens do seed', await txSubtitle.count() === 1)
  const txCard = txSubtitle.locator('xpath=../../..')
  const txCardStyle = await styleOf(txCard)
  check('AC-07 cartão do repasse com raio 16 e borda 1 pt', txCardStyle.radius === '16px' && txCardStyle.border === '1px' && txCardStyle.background === WHITE, JSON.stringify(txCardStyle))
  const txAmountStyle = await styleOf(txCard.getByText(/R\$/).first())
  check('AC-03 R3 valor do repasse em teal', txAmountStyle.color === TEAL, JSON.stringify(txAmountStyle))
  await shot(page, 'rendimentos')

  // --- Carregando (tela 37): indicador com rótulo acessível ---
  const loading = await openPage(browser)
  const slow = { fail: false, delayMs: 2500 }
  await gateRoute(loading, EARNINGS, slow)
  await loginProfessional(loading)
  await tab(loading).click()
  const spinner = visible(loading.getByLabel('Carregando rendimentos', { exact: true }))
  await spinner.waitFor({ timeout: 10000 })
  check('AC-08 carregamento mostra indicador com rótulo', await spinner.count() === 1)
  await shot(loading, 'rendimentos-carregando')
  await visible(loading.getByText('Total recebido', { exact: true })).waitFor({ timeout: 20000 })

  // --- Erro e recuperação (tela 37) ---
  const failing = await openPage(browser)
  const gate = { fail: true, delayMs: 0 }
  await gateRoute(failing, EARNINGS, gate)
  await loginProfessional(failing)
  await tab(failing).click()
  const errorText = visible(failing.getByText('Não foi possível carregar os rendimentos.', { exact: true }))
  await errorText.waitFor({ timeout: 40000 })
  check('AC-08 erro mostra mensagem com texto', await errorText.count() === 1)
  const retry = visible(failing.getByRole('button', { name: 'Tentar novamente', exact: true }))
  check('AC-08 erro oferece tentar novamente', await retry.count() === 1)
  await shot(failing, 'rendimentos-erro')
  gate.fail = false
  await retry.click()
  await visible(failing.getByText('Total recebido', { exact: true })).waitFor({ timeout: 20000 })
  check('AC-08 tentar novamente recupera o resumo', await visible(failing.getByText('Total recebido', { exact: true })).count() === 1)

  // --- Vazio (tela 37): API real com histórico vazio ---
  // gateRoute só atrasa ou aborta; aqui a resposta real recebe lista vazia para exercitar o estado vazio.
  const empty = await openPage(browser)
  await empty.route(EARNINGS, async route => {
    const response = await route.fetch()
    const body = await response.json()
    body.data.transactions = []
    await route.fulfill({ response, json: body })
  })
  await loginProfessional(empty)
  await tab(empty).click()
  const emptyTitle = visible(empty.getByText('Nenhum repasse', { exact: true }))
  await emptyTitle.waitFor({ timeout: 20000 })
  check('AC-08 vazio explica que ainda não há repasses', await emptyTitle.count() === 1
    && await visible(empty.getByText('Nenhum repasse ainda. Atendimentos concluídos aparecem aqui.', { exact: true })).count() === 1)
  const emptyTotal = await styleOf(visible(empty.getByText('Total recebido', { exact: true })).locator('xpath=following-sibling::*[1]'))
  check('AC-03 vazio mantém o total em teal', emptyTotal.color === TEAL && emptyTotal.fontSize === '24px', JSON.stringify(emptyTotal))
  await shot(empty, 'rendimentos-vazio')
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
