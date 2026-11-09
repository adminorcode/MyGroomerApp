import { apiUrl, evidenceFile, fixtures, launchBrowser, loginProfessional, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-40-bloquear-horario.mjs',
  evidence: evidenceFile(plan, 'mix-40-bloquear-horario.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))
const button = (page, name) => page.getByRole('button', { name, exact: true })

// Data do bloqueio: dois dias à frente em São Paulo. A tela digita DD/MM/AAAA; a API recebe AAAA-MM-DD.
const blockDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + 2 * 86400000))
const toBr = iso => iso.split('-').reverse().join('/')

// A folha desliza ao abrir (Modal slide): espera a posição parar antes de capturar, senão a imagem mostra a animação.
async function settle(locator) {
  let previous = null
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const box = await locator.boundingBox()
    if (box && previous && Math.abs(box.y - previous.y) < 0.5) return
    previous = box
    await new Promise(resolve => setTimeout(resolve, 150))
  }
}

// Contagem real na API: bloqueios do groomer (GET /providers/agenda-blocks).
async function countAgendaBlocks() {
  const login = await fetch(`${apiUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(fixtures.groomer),
  })
  if (!login.ok) throw new Error(`Login do groomer falhou (${login.status})`)
  const { token } = await login.json()
  const response = await fetch(`${apiUrl}/api/v1/providers/agenda-blocks`, { headers: { authorization: `Bearer ${token}` } })
  if (!response.ok) throw new Error(`Lista de bloqueios falhou (${response.status})`)
  const body = await response.json()
  return body.data.length
}

const PINK_CTA = 'rgb(198, 72, 120)' // action.primary (R1)
const TEAL = 'rgb(22, 125, 131)' // brand.teal (CMP-05, Q1)
const WHITE = 'rgb(255, 255, 255)'
const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}

const computed = locator => locator.evaluate(el => {
  const cs = getComputedStyle(el)
  return {
    color: cs.color,
    background: cs.backgroundColor,
    fontSize: cs.fontSize,
    radius: cs.borderRadius,
    busy: el.getAttribute('aria-busy'),
    disabled: el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('disabled'),
  }
})

// Fundo da faixa: primeiro ancestral com cor de fundo (o cabeçalho teal da folha).
const backgroundAbove = locator => locator.evaluate(el => {
  let node = el
  while (node) {
    const bg = getComputedStyle(node).backgroundColor
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg
    node = node.parentElement
  }
  return 'none'
})

let browser
try {
  browser = await launchBrowser()
  const page = await openPage(browser)
  await loginProfessional(page)
  const blocksBefore = await countAgendaBlocks()
  await button(page, 'Bloquear horário').click()
  const confirm = button(page, 'Confirmar bloqueio')
  await confirm.waitFor()

  // Cabeçalho teal com texto inverso (CMP-05, Q1)
  const title = page.getByRole('heading', { name: 'Bloquear horário', exact: true })
  await title.waitFor()
  const band = await backgroundAbove(title)
  check('CMP-05 cabeçalho da folha em teal', band === TEAL, band)
  const titleStyle = await computed(title)
  check('AC-04 título inverso sobre teal atende 4,5:1', titleStyle.color === WHITE && ratio(titleStyle.color, band) >= 4.5, `${titleStyle.color} sobre ${band}`)
  const close = await computed(button(page, 'Fechar').getByText('Fechar', { exact: true }))
  check('AC-04 Fechar usa texto inverso no cabeçalho teal', close.color === WHITE, close.color)
  await settle(title)
  await shot(page, 'mix-40-cabecalho')

  // Data em DD/MM/AAAA: exibida, digitada com máscara e validada antes de enviar (decisão A)
  const dateField = page.getByRole('textbox', { name: 'Data', exact: true })
  check('AC-13 data exibida em DD/MM/AAAA', /^\d{2}\/\d{2}\/\d{4}$/.test(await dateField.inputValue()), await dateField.inputValue())
  check('AC-13 ajuda da data indica DD/MM/AAAA', await page.getByText('DD/MM/AAAA', { exact: true }).isVisible())
  await dateField.fill('31/02/2030')
  check('AC-08 data inexistente (31/02) bloqueia confirmar', (await computed(confirm)).disabled)
  await dateField.fill('')
  await dateField.pressSequentially(toBr(blockDate).replace(/\D/g, ''))
  check('AC-13 data digitada recebe máscara DD/MM/AAAA', await dateField.inputValue() === toBr(blockDate), await dateField.inputValue())

  // Estado inválido: fim não posterior ao início (AC-08 com texto)
  await page.getByRole('textbox', { name: 'Fim', exact: true }).fill('08:00')
  await page.getByText('O fim precisa ser depois do início.', { exact: true }).waitFor()
  check('AC-08 erro de intervalo aparece com texto', await page.getByText('O fim precisa ser depois do início.', { exact: true }).isVisible())
  const blocked = await computed(confirm)
  check('AC-08 confirmar bloqueado enquanto o intervalo é inválido', blocked.disabled, JSON.stringify(blocked))
  await settle(title)
  await shot(page, 'mix-40-invalido')

  // Estado válido: período sem campo de motivo (AC-13, plano 022 item 10)
  await page.getByRole('textbox', { name: 'Fim', exact: true }).fill('10:00')
  check('AC-02 confirmar bloqueio válido habilita', await confirm.isEnabled())
  const valid = await computed(confirm)
  const validText = await computed(confirm.getByText('Confirmar bloqueio', { exact: true }))
  check('AC-02 CTA Confirmar bloqueio em action.primary com texto branco', valid.background === PINK_CTA && validText.color === WHITE, JSON.stringify(valid))
  check('AC-13 sem campo de motivo', await page.getByRole('textbox', { name: 'Descrição', exact: true }).count() === 0 && await page.getByRole('textbox', { name: /motivo/i }).count() === 0)
  await shot(page, 'mix-40-valido')

  // Carregando: envio atrasado e interrompido antes da gravação (nenhum bloqueio é criado)
  let sentBlock = null
  await page.route('**/api/v1/providers/agenda-blocks', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    sentBlock = route.request().postDataJSON()
    await new Promise(resolve => setTimeout(resolve, 1500))
    return route.abort()
  })
  await confirm.click()
  await page.waitForTimeout(400)
  const busy = await computed(confirm)
  check('AC-08 confirmar sinaliza carregamento com aria-busy', busy.busy === 'true' && busy.disabled, JSON.stringify(busy))
  check('AC-13 envio à API continua em ISO AAAA-MM-DD', sentBlock?.starts_at?.startsWith(`${blockDate}T`) === true, JSON.stringify(sentBlock))
  await shot(page, 'mix-40-carregando')
  await page.waitForFunction(() => document.querySelector('[aria-busy="true"]') === null, null, { timeout: 15000 }).catch(() => {})
  check('AC-08 sheet permanece aberta após falha de envio', await confirm.isVisible())

  // Fechar devolve a tela de agenda sem alterações
  await button(page, 'Fechar').click()
  await button(page, 'Bloquear horário').waitFor()
  await confirm.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  const blocksAfter = await countAgendaBlocks()
  check('AC-13 fechar não cria bloqueio', blocksAfter === blocksBefore && await button(page, 'Confirmar bloqueio').filter({ visible: true }).count() === 0, `antes ${blocksBefore}, depois ${blocksAfter}`)
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
