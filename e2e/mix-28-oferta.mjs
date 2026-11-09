import { evidenceFile, launchBrowser, loginProfessional, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-28-oferta.mjs',
  evidence: evidenceFile(plan, 'mix-28-oferta.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))
const button = (page, name) => page.getByRole('button', { name, exact: true })
const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (R1)
const TEAL = 'rgb(22, 125, 131)' // brand.teal (R3, valores)
const TEAL_SUBTLE = 'rgb(233, 243, 242)' // surface.tealSubtle (bloco de resumo)
const TEXT_PRIMARY = 'rgb(37, 61, 66)' // text.primary (R5 sobre tealSubtle)
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
    family: getComputedStyle(el).fontFamily,
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

  const page = await openPage(browser)
  await loginProfessional(page)
  await openServices(page)
  await button(page, 'Editar Banho').click()

  // --- Editor de oferta (tela 28): serviço existente ---
  const summaryTitle = await visible(page.getByText('Resumo do serviço', { exact: true }))
  check('AC-08 resumo do serviço aparece no editor', summaryTitle !== null)
  if (summaryTitle) {
    await summaryTitle.scrollIntoViewIfNeeded()
    // Bloco de resumo: MGCard teal (filho do contêiner do título).
    const summary = summaryTitle.locator('xpath=../..')
    const summaryBox = await summary.evaluate(el => {
      const cs = getComputedStyle(el)
      return { background: cs.backgroundColor, radius: cs.borderRadius, borderWidth: cs.borderTopWidth }
    })
    check('Tela 28 bloco de resumo em tealSubtle', summaryBox.background === TEAL_SUBTLE, JSON.stringify(summaryBox))
    check('AC-07 bloco de resumo em destaque de raio 20', summaryBox.radius === '20px', summaryBox.radius)
    const titleStyle = await styleOf(summaryTitle)
    check('R5 título do resumo em text.primary sobre tealSubtle', titleStyle.color === TEXT_PRIMARY, titleStyle.color)
  }

  // Valores de preço: 24 pt Bold em teal, sobre bloco branco (CMP-01, R3, R5).
  const amounts = page.getByText(/^R\$\s?\d/)
  const amountCount = await amounts.count()
  let amount = null
  for (let index = 0; index < amountCount; index += 1) {
    const item = amounts.nth(index)
    if (!(await item.isVisible())) continue
    const style = await styleOf(item)
    if (style.fontSize === '24px') {
      amount = { item, style }
      break
    }
  }
  check('Tela 28 valor do porte em 24 pt', amount !== null)
  if (amount) {
    check('R3 valor do porte em teal', amount.style.color === TEAL, amount.style.color)
    // O RN-Web não expõe fontWeight 700 para Inter: o peso Bold é a família Inter-Bold.
    check('Tela 28 valor do porte em peso Bold (Inter-Bold)', /Inter-Bold/.test(amount.style.family), amount.style.family)
    const tileBackground = await amount.item.evaluate(el => getComputedStyle(el.parentElement).backgroundColor)
    check('R5 valor teal sobre superfície branca com 4,5:1 ou mais', tileBackground === WHITE && ratio(amount.style.color, tileBackground) >= 4.5, `${amount.style.color} sobre ${tileBackground}`)
  }

  const size = await visible(page.getByText('Pequeno', { exact: true }))
  check('R5 rótulo do porte em text.primary sobre superfície branca', size !== null && (await styleOf(size)).color === TEXT_PRIMARY)

  // Tipo escolhido: chip selecionado em rosa sólido com texto branco (R1, CMP-06).
  const selectedType = await visible(page.locator('[role="button"][aria-selected="true"]'))
  check('R1 tipo selecionado em rosa sólido', selectedType !== null)
  if (selectedType) {
    const typeBox = await boxOf(selectedType)
    const typeText = await styleOf(selectedType.getByText(/.+/).first())
    check('R1 chip selecionado usa action.primary com texto branco', typeBox.background === CTA_PINK && typeText.color === WHITE, JSON.stringify(typeBox))
  }

  const concluir = button(page, 'Concluir')
  const concluirBox = await boxOf(concluir)
  const concluirText = await styleOf(concluir.getByText('Concluir', { exact: true }))
  check('AC-02 Concluir é CTA action.primary com texto branco', concluirBox.background === CTA_PINK && concluirText.color === WHITE, JSON.stringify(concluirBox))
  await shot(page, 'oferta-existente')

  // --- Novo serviço (tela 28): resumo sem valores informados mostra texto, não só cor ---
  await concluir.click()
  await button(page, 'Adicionar serviço').click()
  // Há outro texto "Novo serviço" oculto no DOM (telas empilhadas): espera o que está visível.
  await page.getByText('Novo serviço', { exact: true }).filter({ visible: true }).first().waitFor({ timeout: 15000 })
  const missingPrice = await visible(page.getByText('Preço não informado', { exact: true }))
  check('AC-08 porte sem preço informa em texto no resumo', missingPrice !== null)
  const missingDuration = await visible(page.getByText('Duração não informada', { exact: true }))
  check('AC-08 porte sem duração informa em texto no resumo', missingDuration !== null)
  if (missingPrice) {
    const missingStyle = await styleOf(missingPrice)
    check('R5 aviso de preço ausente em text.primary', missingStyle.color === TEXT_PRIMARY, missingStyle.color)
  }
  const nameField = page.getByRole('textbox', { name: 'Nome do serviço', exact: true })
  check('AC-13 campo Nome do serviço segue no editor de serviço novo', (await nameField.count()) > 0)
  const newConcluir = button(page, 'Concluir').filter({ visible: true }).first()
  const newBox = await boxOf(newConcluir)
  check('AC-02 Concluir no serviço novo segue action.primary', newBox.background === CTA_PINK, JSON.stringify(newBox))
  await shot(page, 'oferta-novo')
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
