import { evidenceFile, gateRoute, launchBrowser, loginProfessional, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-36-previa-tutor.mjs',
  evidence: evidenceFile(plan, 'mix-36-previa-tutor.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))

const TEAL = 'rgb(22, 125, 131)' // brand.teal (R3, CMP-11)
const TEAL_SUBTLE = 'rgb(233, 243, 242)' // surface.tealSubtle (aviso da prévia)
const TEXT_PRIMARY = 'rgb(37, 61, 66)' // text.primary (R5)
const WHITE = 'rgb(255, 255, 255)'
const EDIT_CONTROLS = ['Editar foto', 'Editar descrição', 'Editar área', 'Editar serviços', 'Editar horários', 'Adicionar fotos']
const NOTICE = 'Você está vendo o perfil como o tutor vê na busca. Nada aqui pode ser editado.'

// Telas empilhadas permanecem no DOM (a prévia é a última): só conta o elemento visível do topo.
async function visibleOf(locator, timeout = 20000) {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    const count = await locator.count()
    for (let index = count - 1; index >= 0; index -= 1) {
      const item = locator.nth(index)
      if (await item.isVisible()) return item
    }
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  return null
}

// Quantos elementos visíveis casam com o localizador (ignora telas empilhadas por baixo).
async function visibleCount(locator) {
  const count = await locator.count()
  let total = 0
  for (let index = 0; index < count; index += 1) {
    if (await locator.nth(index).isVisible()) total += 1
  }
  return total
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

async function openPreview(page) {
  await page.getByRole('button', { name: 'Abrir perfil' }).click()
  await page.getByRole('button', { name: 'Perfil público', exact: true }).click()
  await page.getByText('Descrição profissional', { exact: true }).waitFor({ timeout: 20000 })
  await page.getByRole('button', { name: 'Visualizar como tutor', exact: true }).click()
}

let browser
try {
  browser = await launchBrowser()
  const gate = { fail: false, delayMs: 0 }
  const page = await openPage(browser, { viewport: 'mobile' })
  // Perfil publicado da prévia: /providers/{id}/profile (não o perfil próprio /me/public-profile).
  await gateRoute(page, '**/api/v1/providers/**/profile', gate)
  await loginProfessional(page)

  // --- Carregando (tela 36) ---
  await page.getByRole('button', { name: 'Abrir perfil' }).click()
  await page.getByRole('button', { name: 'Perfil público', exact: true }).click()
  await page.getByText('Descrição profissional', { exact: true }).waitFor({ timeout: 20000 })
  gate.delayMs = 2500
  await page.getByRole('button', { name: 'Visualizar como tutor', exact: true }).click()
  await page.getByLabel('Carregando perfil', { exact: true }).waitFor({ timeout: 10000 })
  check('AC-08 prévia carregando mostra indicador e texto', await page.getByText('Carregando perfil', { exact: true }).isVisible())
  await shot(page, 'previa-carregando')
  gate.delayMs = 0
  // O rodapé (A prévia não inicia...) já aparece durante o carregamento: espera o aviso, que só existe com o perfil.
  await page.getByText(NOTICE, { exact: true }).waitFor({ timeout: 20000 })

  // --- Aviso da prévia em tealSubtle com texto primary (R5) ---
  const notice = await visibleOf(page.getByText(NOTICE, { exact: true }))
  const noticeStyle = notice ? await notice.evaluate(el => ({ color: getComputedStyle(el).color, bg: getComputedStyle(el.parentElement).backgroundColor })) : null
  check('R5 aviso da prévia em tealSubtle com texto primary', noticeStyle?.bg === TEAL_SUBTLE && noticeStyle?.color === TEXT_PRIMARY, JSON.stringify(noticeStyle))

  // --- Identidade do profissional e avatar teal (CMP-11, R3) ---
  const header = await visibleOf(page.getByLabel('Profissional Groomer de Teste', { exact: true }))
  check('CMP-11 R3 avatar do profissional na prévia é teal sólido', Boolean(header) && await tealAvatarIn(header))

  // --- Cartões da composição do tutor: branco, borda 1 pt, raio 16 ---
  const rulesText = await visibleOf(page.getByText('Regras de atendimento', { exact: true }))
  const rules = rulesText ? await cardOf(rulesText) : null
  check('AC-07 cartão de regras da prévia em branco com borda 1 pt e raio 16', rules?.background === WHITE && rules?.radius === '16px' && rules?.borderWidth === '1px', JSON.stringify(rules))

  // --- Preço do serviço em teal sobre branco (R3, R5) ---
  const price = await visibleOf(page.getByText(/^A partir de R\$/))
  const priceStyle = price ? await price.evaluate(el => ({ color: getComputedStyle(el).color, parentBg: getComputedStyle(el.parentElement).backgroundColor })) : null
  check('R3 preço do serviço na prévia em teal sobre branco', priceStyle?.color === TEAL && priceStyle?.parentBg === WHITE, JSON.stringify(priceStyle))

  // --- Sem controles de edição e sem agendamento (tela 36) ---
  const editCounts = await Promise.all(EDIT_CONTROLS.map(name => visibleCount(page.getByRole('button', { name, exact: true }))))
  check('AC-04 prévia sem controles de edição', editCounts.every(count => count === 0), editCounts.join(','))
  const book = await visibleOf(page.getByRole('button', { name: 'Agendar serviço', exact: true }))
  check('AC-04 prévia não agenda: Agendar serviço desabilitado', Boolean(book) && await book.isDisabled())
  check('AC-04 prévia mostra as regras de atendimento publicadas', Boolean(await visibleOf(page.getByText('Regras de atendimento', { exact: true }))))
  await shot(page, 'previa-390')
  // A página rola dentro do MGScreen: fullPage não alcança as seções abaixo da primeira tela; cada uma é capturada.
  await saveScreenshot(page, evidenceFile(plan, 'ui-review/previa-390-completo.png'))
  await (await visibleOf(page.getByText('Serviços disponíveis', { exact: true }))).scrollIntoViewIfNeeded()
  await saveScreenshot(page, evidenceFile(plan, 'ui-review/previa-390-servicos.png'))
  // "Horários de atendimento" também existe na tela empilhada por baixo: rola só o elemento visível.
  // Alinha o título ao topo da área rolável para que o conteúdo da seção apareça abaixo dele (não só o título na base).
  const horarios = await visibleOf(page.getByText('Horários de atendimento', { exact: true }))
  await horarios.evaluate(el => el.scrollIntoView({ block: 'start' }))
  await shot(page, 'previa-horarios')

  // --- Erro (tela 36): perfil publicado falha, mantém texto e Tentar novamente ---
  const failing = await openPage(browser, { viewport: 'mobile' })
  await gateRoute(failing, '**/api/v1/providers/**/profile', { fail: true, delayMs: 0 })
  await loginProfessional(failing)
  await openPreview(failing)
  await failing.getByText('Algo deu errado', { exact: true }).waitFor({ timeout: 20000 })
  const retry = failing.getByRole('button', { name: 'Tentar novamente', exact: true })
  check('AC-08 erro da prévia mantém texto e ação Tentar novamente', await retry.isEnabled())
  await shot(failing, 'previa-erro')
  await failing.context().close()

  // --- Desktop (1440) ---
  const wide = await openPage(browser, { viewport: 'desktop' })
  await loginProfessional(wide)
  await openPreview(wide)
  await wide.getByText(NOTICE, { exact: true }).waitFor({ timeout: 20000 })
  check('AC-07 desktop 1440 mostra o aviso da prévia', Boolean(await visibleOf(wide.getByText(NOTICE, { exact: true }))))
  await saveScreenshot(wide, evidenceFile(plan, 'ui-review/previa-1440.png'))
  // scrollIntoViewIfNeeded não rola quando o título já está na janela e a lista fica abaixo da dobra: alinha ao topo.
  const servicos = await visibleOf(wide.getByText('Serviços disponíveis', { exact: true }))
  await servicos.evaluate(el => el.scrollIntoView({ block: 'start' }))
  await saveScreenshot(wide, evidenceFile(plan, 'ui-review/previa-1440-servicos.png'))
  await wide.context().close()
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
