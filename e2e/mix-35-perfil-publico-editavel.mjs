import { evidenceFile, gateRoute, launchBrowser, loginProfessional, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-35-perfil-publico-editavel.mjs',
  evidence: evidenceFile(plan, 'mix-35-perfil-publico-editavel.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))

const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (R1, AC-02)
const TEXT_PINK = 'rgb(198, 38, 105)' // action.primaryOutline (R5)
const TEAL = 'rgb(22, 125, 131)' // brand.teal (R3, CMP-11)
const TEAL_SUBTLE = 'rgb(233, 243, 242)' // surface.tealSubtle (CMP-11)
const TEXT_PRIMARY = 'rgb(37, 61, 66)' // text.primary (R5)
const WHITE = 'rgb(255, 255, 255)'
const TRANSPARENT = 'rgba(0, 0, 0, 0)'

// Telas empilhadas permanecem no DOM: só conta o elemento visível.
async function visibleOf(locator) {
  const count = await locator.count()
  for (let index = 0; index < count; index += 1) {
    const item = locator.nth(index)
    if (await item.isVisible()) return item
  }
  return null
}

async function styleOf(locator, label) {
  return locator.getByText(label, { exact: true }).evaluate(el => ({
    color: getComputedStyle(el).color,
    fontSize: getComputedStyle(el).fontSize,
    fontWeight: getComputedStyle(el).fontWeight,
  }))
}

async function boxOf(control) {
  return control.evaluate(el => {
    const cs = getComputedStyle(el)
    return { background: cs.backgroundColor, border: cs.borderTopColor, borderWidth: cs.borderTopWidth, radius: cs.borderTopLeftRadius, minHeight: cs.minHeight }
  })
}

// Cartão do MGCard: primeiro ancestral com borda de 1 pt a partir do texto informado.
async function cardOf(locator) {
  return locator.evaluate(el => {
    let node = el
    while (node) {
      const cs = getComputedStyle(node)
      if (cs.borderTopWidth === '1px') return { background: cs.backgroundColor, radius: cs.borderTopLeftRadius, borderWidth: cs.borderTopWidth }
      node = node.parentElement
    }
    return null
  })
}

async function tealAvatarIn(header) {
  return header.locator('div').evaluateAll(els => els.some(el => getComputedStyle(el).backgroundColor === 'rgb(22, 125, 131)'))
}

let browser
try {
  browser = await launchBrowser()
  const gate = { fail: false, delayMs: 0 }
  const page = await openPage(browser, { viewport: 'mobile' })
  await gateRoute(page, '**/api/v1/providers/me/public-profile', gate)
  await loginProfessional(page)
  await page.getByRole('button', { name: 'Abrir perfil' }).click()

  // --- Erro (tela 35) ---
  gate.fail = true
  await page.getByRole('button', { name: 'Perfil público', exact: true }).click()
  await page.getByText('Não foi possível conectar. Verifique sua internet e tente novamente.').waitFor({ timeout: 20000 })
  const retry = page.getByRole('button', { name: 'Tentar novamente', exact: true })
  check('AC-08 erro do perfil mantém título, texto e ação Tentar novamente', await page.getByText('Algo deu errado', { exact: true }).isVisible() && await retry.isEnabled())
  await shot(page, 'perfil-erro')

  // --- Carregando (tela 35) ---
  gate.fail = false
  gate.delayMs = 2500
  await retry.click()
  await page.getByLabel('Carregando perfil', { exact: true }).waitFor({ timeout: 10000 })
  check('AC-08 carregando mostra indicador e texto', await page.getByText('Carregando perfil', { exact: true }).isVisible())
  await shot(page, 'perfil-carregando')
  gate.delayMs = 0
  await page.getByText('Descrição profissional', { exact: true }).waitFor({ timeout: 20000 })

  // --- Cabeçalho de identidade teal (tela 35, CMP-11, R3) ---
  const header = page.getByLabel('Profissional Groomer de Teste', { exact: true })
  await header.waitFor()
  const inTealBlock = await header.evaluate(el => {
    let node = el
    for (let depth = 0; depth < 4 && node; depth += 1) {
      if (getComputedStyle(node).backgroundColor === 'rgb(233, 243, 242)') return true
      node = node.parentElement
    }
    return false
  })
  check('CMP-11 cabeçalho de identidade em tealSubtle', inTealBlock)
  check('CMP-11 R3 avatar do profissional é teal sólido', await tealAvatarIn(header))
  const name = await visibleOf(page.getByText('Groomer de Teste', { exact: true }))
  check('R5 nome do profissional usa text.primary sobre tealSubtle', name !== null && (await name.evaluate(el => getComputedStyle(el).color)) === TEXT_PRIMARY)

  // --- Ações: Editar em contorno rosa, Visualizar como tutor em rosa (R1) ---
  const editProfile = page.getByRole('button', { name: 'Editar foto', exact: true })
  const editBox = await boxOf(editProfile)
  check('R1 Editar foto é contorno rosa sem preenchimento', editBox.background === TRANSPARENT && editBox.border === TEXT_PINK, JSON.stringify(editBox))
  const preview = page.getByRole('button', { name: 'Visualizar como tutor', exact: true })
  const previewBox = await boxOf(preview)
  const previewText = await styleOf(preview, 'Visualizar como tutor')
  check('R1 Visualizar como tutor é action.primary com texto branco', previewBox.background === CTA_PINK && previewText.color === WHITE, `${previewBox.background} ${previewText.color}`)
  await shot(page, 'perfil-cabecalho')

  // --- Cartões de seção: branco, borda 1 pt, raio 16 (escala de forma) ---
  for (const title of ['Descrição profissional', 'Área de atendimento', 'Serviços e preços', 'Horários de atendimento']) {
    const card = await cardOf(page.getByText(title, { exact: true }))
    check(`AC-07 cartão "${title}" em branco com borda 1 pt e raio 16`, card?.background === WHITE && card?.radius === '16px' && card?.borderWidth === '1px', JSON.stringify(card))
  }
  const editDescription = await boxOf(page.getByRole('button', { name: 'Editar descrição', exact: true }))
  check('AC-07 botão Editar da seção com altura 40 e raio 16', editDescription.minHeight === '40px' && editDescription.radius === '16px', `${editDescription.minHeight} ${editDescription.radius}`)

  // --- Preço do serviço em teal sobre branco (R3, R5) ---
  const price = await visibleOf(page.getByText(/^A partir de R\$/))
  const priceStyle = price ? await price.evaluate(el => ({ color: getComputedStyle(el).color, parentBg: getComputedStyle(el.parentElement).backgroundColor })) : null
  check('R3 preço do serviço em teal sobre branco', priceStyle?.color === TEAL && priceStyle?.parentBg === WHITE, JSON.stringify(priceStyle))

  // --- Painel de foto: cartão branco (abre e fecha pelo mesmo botão) ---
  await editProfile.click()
  const photoHint = page.getByText('A foto redonda aparece no cabeçalho do perfil público. JPG ou PNG, até 10 MB.', { exact: true })
  await photoHint.waitFor()
  const photoCard = await cardOf(photoHint)
  check('AC-07 painel de foto em cartão branco de 16 pt', photoCard?.background === WHITE && photoCard?.radius === '16px', JSON.stringify(photoCard))
  const chooseBox = await boxOf(page.getByRole('button', { name: 'Escolher foto', exact: true }))
  check('R1 Escolher foto é contorno rosa (ação secundária)', chooseBox.background === TRANSPARENT && chooseBox.border === TEXT_PINK, JSON.stringify(chooseBox))
  await shot(page, 'perfil-painel-foto')
  await editProfile.click()
  await photoHint.waitFor({ state: 'detached', timeout: 5000 })
  check('AC-13 painel de foto fecha sem salvar', await photoHint.count() === 0)

  // --- Descrição: abre o editor e cancela, sem salvar ---
  await page.getByRole('button', { name: 'Editar descrição', exact: true }).click()
  const field = page.getByRole('textbox', { name: 'Sua descrição', exact: true })
  await field.waitFor()
  const save = await boxOf(page.getByRole('button', { name: 'Salvar', exact: true }))
  check('R1 Salvar da descrição é action.primary', save.background === CTA_PINK, JSON.stringify(save))
  await shot(page, 'perfil-editar-descricao')
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await field.waitFor({ state: 'detached', timeout: 5000 })
  check('AC-13 descrição cancelada volta ao texto sem salvar', await page.getByText('Descrição profissional', { exact: true }).isVisible())

  // --- Visualizar como tutor abre a prévia (tela 36) ---
  await preview.click()
  await page.getByText('A prévia não inicia um agendamento.', { exact: true }).waitFor({ timeout: 20000 })
  check('R1 Visualizar como tutor abre a prévia do tutor', await page.getByText('A prévia não inicia um agendamento.', { exact: true }).isVisible())
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.getByText('Descrição profissional', { exact: true }).waitFor({ timeout: 20000 })
  // A página rola dentro do MGScreen: fullPage não alcança as seções abaixo da primeira tela, então cada uma é capturada.
  await saveScreenshot(page, evidenceFile(plan, 'ui-review/perfil-390-completo.png'))
  for (const [title, file] of [['Área de atendimento', 'perfil-390-area'], ['Serviços e preços', 'perfil-390-servicos'], ['Horários de atendimento', 'perfil-390-horarios'], ['Fotos / Galeria', 'perfil-390-galeria']]) {
    await page.getByText(title, { exact: true }).scrollIntoViewIfNeeded()
    await saveScreenshot(page, evidenceFile(plan, `ui-review/${file}.png`))
  }

  // --- Desktop (1440) ---
  const wide = await openPage(browser, { viewport: 'desktop' })
  await loginProfessional(wide)
  await wide.getByRole('button', { name: 'Abrir perfil' }).click()
  await wide.getByRole('button', { name: 'Perfil público', exact: true }).click()
  await wide.getByText('Descrição profissional', { exact: true }).waitFor({ timeout: 20000 })
  check('AC-07 desktop 1440 mantém ações do cabeçalho visíveis', await wide.getByRole('button', { name: 'Visualizar como tutor', exact: true }).isVisible() && await wide.getByRole('button', { name: 'Editar foto', exact: true }).isVisible())
  await saveScreenshot(wide, evidenceFile(plan, 'ui-review/perfil-1440.png'))
  await wide.getByText('Serviços e preços', { exact: true }).scrollIntoViewIfNeeded()
  await saveScreenshot(wide, evidenceFile(plan, 'ui-review/perfil-1440-servicos.png'))
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
