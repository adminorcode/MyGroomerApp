import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { evidenceFile, gateRoute, launchBrowser, loginTutor, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const LIST = '**/api/v1/customer-addresses**'
const AUTOCOMPLETE = '**/providers/service-location/autocomplete**'
const MAP_TILES = '**/providers/service-location/map-tiles**'
const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (R1, AC-02)
const TEXT_PINK = 'rgb(198, 38, 105)' // action.primaryOutline (R1, contorno)
const WHITE = 'rgb(255, 255, 255)'
const PIN_PINK = '#c64878' // action.primary usado no pino do mapa (CMP-16)

const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-16-endereco-form.mjs',
  evidence: evidenceFile(plan, 'mix-16-endereco-form.log'),
})
const { check, fail, finish } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
require(path.join(apiRoot, 'node_modules/dotenv')).config({ path: path.join(apiRoot, '.env'), quiet: true })
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

function assertLocalE2eDatabase() {
  const database = new URL(process.env.DATABASE_URL || 'http://invalido')
  if (!['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) || database.pathname !== '/mygroomer_e2e') {
    throw new Error('Recusando banco fora de mygroomer_e2e')
  }
}

async function clearAddresses() {
  await pool.query(
    `DELETE FROM customer_addresses
     WHERE customer_id = (SELECT id FROM users WHERE email = 'tutor@email.com')`,
  )
}

// Telas empilhadas permanecem no DOM: a tela de topo é a última visível.
async function visibleLast(locator, { timeout = 15000 } = {}) {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    const count = await locator.count()
    for (let index = count - 1; index >= 0; index -= 1) {
      if (await locator.nth(index).isVisible()) return locator.nth(index)
    }
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error('Elemento visível não encontrado no tempo esperado')
}

async function openNewAddressForm(page) {
  const profile = await visibleLast(page.getByRole('button', { name: 'Abrir perfil', exact: true }))
  await profile.click()
  const addresses = await visibleLast(page.getByRole('button', { name: 'Endereços', exact: true }))
  await addresses.click()
  const create = await visibleLast(page.getByRole('button', { name: 'Cadastrar endereço', exact: true }))
  await create.click()
  await visibleLast(page.getByRole('combobox', { name: 'Endereço', exact: true }))
}

async function pickAddress(page, query) {
  const field = await visibleLast(page.getByRole('combobox', { name: 'Endereço', exact: true }))
  const pending = page.waitForResponse(response => response.url().includes('/service-location/autocomplete'))
  await field.fill(query)
  await pending
  const option = await visibleLast(page.getByRole('option'))
  await option.click()
}

async function buttonStyle(button, text) {
  const box = await button.evaluate(el => {
    const cs = getComputedStyle(el)
    return { background: cs.backgroundColor, minHeight: cs.minHeight, radius: cs.borderRadius, border: cs.borderTopColor, borderWidth: cs.borderTopWidth }
  })
  const color = await button.getByText(text, { exact: true }).first().evaluate(el => getComputedStyle(el).color)
  return { ...box, color }
}

const sameHex = (fill, hex) => (fill ?? '').toLowerCase() === hex.toLowerCase()

async function runMainFlow(browser) {
  const page = await openPage(browser, { viewport: 'mobile' })
  await loginTutor(page)
  await openNewAddressForm(page)

  // Vazio: sem ponto, o cartão reserva a área do mapa e explica o próximo passo.
  const emptyMap = await visibleLast(page.getByLabel('Mapa sem ponto'))
  check('AC-08 estado vazio do mapa explica como marcar o ponto', (await emptyMap.count()) > 0 && await page.getByText('Escolha um endereço sugerido para ver o ponto no mapa.', { exact: true }).count() > 0)
  const unselected = await visibleLast(page.getByRole('button', { name: 'Casa', exact: true }))
  const unselectedStyle = await unselected.evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, border: getComputedStyle(el).borderTopColor }))
  check('R1 rótulo não selecionado usa contorno rosa-texto sobre branco', unselectedStyle.border === TEXT_PINK && unselectedStyle.bg === WHITE, JSON.stringify(unselectedStyle))
  await shot(page, 'form-vazio')

  // Validação: salvar sem rótulo aponta o erro em texto.
  const saveButton = await visibleLast(page.getByRole('button', { name: 'Salvar endereço', exact: true }))
  await saveButton.click()
  const labelError = await visibleLast(page.getByText('Escolha casa, trabalho ou outros.', { exact: true }))
  check('AC-08 validação do rótulo aparece como texto de alerta', (await labelError.count()) > 0)
  await shot(page, 'form-validacao')

  // Seleção do rótulo: ação sempre rosa com texto branco.
  await unselected.click()
  const selected = await visibleLast(page.getByRole('button', { name: 'Casa, selecionado', exact: true }))
  const selectedStyle = await buttonStyle(selected, 'Casa')
  check('AC-02 rótulo selecionado usa action.primary com texto branco', selectedStyle.background === CTA_PINK && selectedStyle.color === WHITE, JSON.stringify(selectedStyle))

  // Carregando: sugestões aguardam a busca e mostram indicador com texto.
  await gateRoute(page, AUTOCOMPLETE, { delayMs: 2500 })
  const field = await visibleLast(page.getByRole('combobox', { name: 'Endereço', exact: true }))
  const pending = page.waitForResponse(response => response.url().includes('/service-location/autocomplete'))
  await field.fill('Avenida Paulista, São Paulo')
  const searching = await visibleLast(page.getByRole('progressbar', { name: 'Buscando endereços', exact: true }), { timeout: 5000 })
  check('AC-08 carregando sugestões mostra indicador com texto', (await searching.count()) > 0 && await page.getByText('Buscando endereços', { exact: true }).count() > 0)
  await shot(page, 'form-buscando')
  await pending
  await page.unroute(AUTOCOMPLETE)
  const option = await visibleLast(page.getByRole('option'))
  await option.click()

  // Mapa com ponto: pino em rosa e sem área de cobertura inventada.
  const frame = page.frameLocator('iframe[title*="Mapa do endereço"]')
  const pin = frame.locator('.mg-pin path').first()
  await pin.waitFor({ timeout: 20000 })
  const pinFill = await pin.getAttribute('fill')
  check('CMP-16 pino do endereço usa rosa de ação', sameHex(pinFill, PIN_PINK), pinFill ?? 'sem fill')
  const coverage = await frame.locator('.mg-radius').count()
  check('CMP-16 sem raio conhecido não desenha área de cobertura', coverage === 0, `${coverage} áreas`)
  await page.locator('iframe[title*="Mapa do endereço"]').scrollIntoViewIfNeeded()
  await shot(page, 'form-mapa')

  // Cartão do mapa: 16 pt, borda 1 e fundo branco; campo com raio 12 e altura 40.
  const card = await field.evaluate(el => {
    let node = el
    while (node && node !== document.body) {
      const cs = getComputedStyle(node)
      if (cs.borderTopWidth === '1px' && cs.borderRadius === '16px') {
        return { background: cs.backgroundColor, border: cs.borderTopWidth, radius: cs.borderRadius }
      }
      node = node.parentElement
    }
    return null
  })
  check('AC-07 cartão do mapa usa raio 16, borda 1 e fundo branco', card?.background === WHITE && card?.border === '1px', JSON.stringify(card))
  const fieldBox = await field.evaluate(el => ({ radius: getComputedStyle(el).borderRadius, minHeight: getComputedStyle(el).minHeight }))
  check('AC-07 campo de endereço usa raio 12 e altura 40', fieldBox.radius === '12px' && fieldBox.minHeight === '40px', JSON.stringify(fieldBox))
  const labelIcon = await visibleLast(page.getByText('Endereço', { exact: true }))
  const labelStroke = await labelIcon.evaluate(el => {
    const svg = el.parentElement?.querySelector('svg')
    return svg ? [svg, ...svg.querySelectorAll('*')].map(node => getComputedStyle(node).stroke).find(stroke => stroke && stroke !== 'none') ?? 'none' : 'sem ícone'
  })
  check('R2 ícone de rótulo do endereço usa rosa de ação (DS §12)', labelStroke === CTA_PINK, labelStroke)

  // CTA salvar: rosa com texto branco; enquanto salva, fica ocupado e bloqueado.
  const save = await visibleLast(page.getByRole('button', { name: 'Salvar endereço', exact: true }))
  const saveStyle = await buttonStyle(save, 'Salvar endereço')
  check('AC-02 Salvar endereço usa action.primary com texto branco', saveStyle.background === CTA_PINK && saveStyle.color === WHITE, JSON.stringify(saveStyle))
  check('AC-07 botão Salvar endereço mantém altura 40 e raio 16', saveStyle.minHeight === '40px' && saveStyle.radius === '16px', JSON.stringify(saveStyle))
  await gateRoute(page, LIST, { delayMs: 1500 })
  await save.click()
  let busy = null
  for (let attempt = 0; attempt < 10 && busy !== 'true'; attempt += 1) {
    busy = await save.getAttribute('aria-busy')
    if (busy !== 'true') await page.waitForTimeout(100)
  }
  check('AC-08 salvar sinaliza carregamento com aria-busy', busy === 'true', String(busy))
  await visibleLast(page.getByRole('button', { name: /^Casa\./ }), { timeout: 20000 })
  await page.unroute(LIST)
  check('AC-13 salvar envia o endereço e volta à lista', true)

  // Segundo endereço com "Marcar como padrão" ligado: seleção em rosa.
  const listCreate = await visibleLast(page.getByRole('button', { name: 'Cadastrar endereço', exact: true }))
  await listCreate.click()
  await visibleLast(page.getByRole('combobox', { name: 'Endereço', exact: true }))
  const workChip = await visibleLast(page.getByRole('button', { name: 'Trabalho', exact: true }))
  await workChip.click()
  await pickAddress(page, 'Rua Augusta, São Paulo')
  const checkbox = await visibleLast(page.getByRole('checkbox', { name: 'Marcar como padrão', exact: true }))
  await checkbox.click()
  await visibleLast(page.getByRole('checkbox', { name: 'Marcar como padrão', exact: true, checked: true }))
  const track = await checkbox.evaluate(el => {
    const node = [...el.querySelectorAll('div')].find(div => getComputedStyle(div).width === '48px')
    return node ? getComputedStyle(node).backgroundColor : 'sem trilho'
  })
  check('R1 "Marcar como padrão" ligado usa action.primary', track === CTA_PINK, track)
  await shot(page, 'form-padrao-ligado')
  const workSave = await visibleLast(page.getByRole('button', { name: 'Salvar endereço', exact: true }))
  await workSave.click()
  await visibleLast(page.getByRole('button', { name: /^Trabalho\./ }), { timeout: 20000 })

  // Edição: contorno rosa para a ação secundária "Excluir endereço".
  const casa = await visibleLast(page.getByRole('button', { name: /^Casa\./ }))
  await casa.click()
  await visibleLast(page.getByText('Editar endereço', { exact: true }))
  const remove = await visibleLast(page.getByRole('button', { name: 'Excluir endereço', exact: true }))
  const removeStyle = await buttonStyle(remove, 'Excluir endereço')
  check('R1 Excluir endereço usa contorno rosa-texto sem preenchimento', removeStyle.border === TEXT_PINK && removeStyle.background === 'rgba(0, 0, 0, 0)', JSON.stringify(removeStyle))
  await shot(page, 'form-edicao')
  await page.close()
}

async function runMapErrorFlow(browser) {
  const page = await openPage(browser, { viewport: 'mobile' })
  await gateRoute(page, MAP_TILES, { fail: true })
  await loginTutor(page)
  await openNewAddressForm(page)
  const chip = await visibleLast(page.getByRole('button', { name: 'Casa', exact: true }))
  await chip.click()
  await pickAddress(page, 'Avenida Paulista, São Paulo')
  const unavailable = await visibleLast(page.getByLabel('Mapa indisponível'), { timeout: 20000 })
  check('AC-08 erro do mapa mantém o endereço e explica com texto', (await unavailable.count()) > 0 && await page.getByText('O mapa não carregou. O ponto continua no endereço escolhido.', { exact: true }).count() > 0)
  const save = await visibleLast(page.getByRole('button', { name: 'Salvar endereço', exact: true }))
  check('AC-08 erro do mapa não bloqueia o CTA de salvar', await save.isEnabled())
  await unavailable.scrollIntoViewIfNeeded()
  await shot(page, 'form-mapa-erro')
  await page.close()
}

async function runSaveErrorFlow(browser) {
  const page = await openPage(browser, { viewport: 'mobile' })
  await gateRoute(page, MAP_TILES, { delayMs: 6000 })
  await loginTutor(page)
  await openNewAddressForm(page)
  const chip = await visibleLast(page.getByRole('button', { name: 'Casa', exact: true }))
  await chip.click()
  await pickAddress(page, 'Avenida Paulista, São Paulo')
  const mapLoading = await visibleLast(page.getByRole('progressbar', { name: 'Localizando no mapa', exact: true }), { timeout: 5000 })
  check('AC-08 mapa em carregamento mostra indicador com texto', (await mapLoading.count()) > 0)
  await shot(page, 'form-mapa-carregando')
  await page.frameLocator('iframe[title*="Mapa do endereço"]').locator('.mg-pin path').first().waitFor({ timeout: 20000 })
  await gateRoute(page, LIST, { fail: true })
  const save = await visibleLast(page.getByRole('button', { name: 'Salvar endereço', exact: true }))
  await save.click()
  const alert = await visibleLast(page.getByRole('alert'), { timeout: 15000 })
  check('AC-08 erro ao salvar aparece como alerta com texto', (await alert.innerText()).trim().length > 0)
  check('AC-08 após erro ao salvar o CTA volta a ficar disponível', await save.isEnabled())
  await shot(page, 'form-erro-salvar')
  await page.close()
}

let browser
try {
  assertLocalE2eDatabase()
  await clearAddresses()
  browser = await launchBrowser()
  await runMainFlow(browser)
  await runMapErrorFlow(browser)
  await runSaveErrorFlow(browser)
} catch (error) {
  fail(error)
} finally {
  await clearAddresses().catch(() => {})
  await pool.end().catch(() => {})
  await finish(browser)
}
