import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { evidenceFile, gateRoute, launchBrowser, loginTutor, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const LIST = '**/api/v1/customer-addresses**'
const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (R1, AC-02)
const WHITE = 'rgb(255, 255, 255)'

const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-15-enderecos.mjs',
  evidence: evidenceFile(plan, 'mix-15-enderecos.log'),
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

async function openAddresses(page) {
  const profile = await visibleLast(page.getByRole('button', { name: 'Abrir perfil', exact: true }))
  await profile.click()
  const addresses = await visibleLast(page.getByRole('button', { name: 'Endereços', exact: true }))
  await addresses.click()
}

async function buttonStyle(button, text) {
  const box = await button.evaluate(el => {
    const cs = getComputedStyle(el)
    return { background: cs.backgroundColor, minHeight: cs.minHeight, radius: cs.borderRadius }
  })
  const color = await button.getByText(text, { exact: true }).first().evaluate(el => getComputedStyle(el).color)
  return { ...box, color }
}

// Lucide herda a cor pelo traço; a primeira cor de traço real é a do ícone.
function iconStroke(svg) {
  return svg.evaluate(el => {
    const nodes = [el, ...el.querySelectorAll('*')]
    for (const node of nodes) {
      const stroke = getComputedStyle(node).stroke
      if (stroke && stroke !== 'none') return stroke
    }
    return 'none'
  })
}

async function createAddress(page, { label, query }) {
  const chip = await visibleLast(page.getByRole('button', { name: label, exact: true }))
  await chip.click()
  const field = await visibleLast(page.getByRole('combobox', { name: 'Endereço', exact: true }))
  const pending = page.waitForResponse(response => response.url().includes('/service-location/autocomplete'))
  await field.fill(query)
  await pending
  const option = await visibleLast(page.getByRole('option'))
  await option.click()
  const save = await visibleLast(page.getByRole('button', { name: 'Salvar endereço', exact: true }))
  await save.click()
  await visibleLast(page.getByRole('button', { name: new RegExp(`^${label}\\.`) }), { timeout: 20000 })
}

let browser
try {
  assertLocalE2eDatabase()
  await clearAddresses()
  browser = await launchBrowser()
  const page = await openPage(browser, { viewport: 'mobile' })
  await loginTutor(page)

  // Uma única rota para a lista: o estado (erro, atraso, normal) muda pelo gate, sem registrar rotas conflitantes.
  const gate = { fail: true, delayMs: 0 }
  await gateRoute(page, LIST, gate)

  // Erro ao carregar a lista (tela 15).
  await openAddresses(page)
  await page.getByText('Não foi possível carregar os endereços.').waitFor({ timeout: 30000 })
  const retry = await visibleLast(page.getByRole('button', { name: 'Tentar novamente', exact: true }))
  check('AC-08 erro de carregamento mostra texto e ação Tentar novamente', (await retry.innerText()).trim().length > 0)
  await shot(page, 'endereco-erro')

  // Carregando (tela 15): indicador com texto enquanto a lista volta.
  gate.fail = false
  gate.delayMs = 2000
  await retry.click()
  const loading = await visibleLast(page.getByRole('progressbar', { name: 'Carregando endereços', exact: true }), { timeout: 10000 })
  check('AC-08 carregando mostra indicador acessível com texto', (await loading.count()) > 0 && await page.getByText('Carregando endereços', { exact: true }).count() > 0)
  await shot(page, 'endereco-carregando')

  // Vazio (tela 15): CTA primário rosa com texto branco.
  gate.delayMs = 0
  await page.getByText('Nenhum endereço salvo').waitFor({ timeout: 20000 })
  const emptyCta = await visibleLast(page.getByRole('button', { name: 'Cadastrar endereço', exact: true }))
  const emptyStyle = await buttonStyle(emptyCta, 'Cadastrar endereço')
  check('AC-02 Cadastrar endereço usa action.primary com texto branco', emptyStyle.background === CTA_PINK && emptyStyle.color === WHITE, JSON.stringify(emptyStyle))
  check('AC-07 botão Cadastrar endereço mantém altura 40 e raio 16', emptyStyle.minHeight === '40px' && emptyStyle.radius === '16px', JSON.stringify(emptyStyle))
  await shot(page, 'endereco-vazio')

  // Primeiro endereço (padrão) pelo formulário da tela 16.
  await emptyCta.click()
  await createAddress(page, { label: 'Casa', query: 'Avenida Paulista, São Paulo' })

  const casaCard = await visibleLast(page.getByRole('button', { name: /^Casa\..*Padrão$/ }))
  const casaSurface = await casaCard.locator('xpath=./div').first().evaluate(el => {
    const cs = getComputedStyle(el)
    return { background: cs.backgroundColor, border: cs.borderTopWidth, radius: cs.borderRadius }
  })
  check('AC-07 cartão de endereço usa raio 16, borda 1 e fundo branco', casaSurface.radius === '16px' && casaSurface.border === '1px' && casaSurface.background === WHITE, JSON.stringify(casaSurface))
  const casaIcon = await iconStroke(casaCard.locator('svg').first())
  check('R2 ícone do endereço de casa usa rosa de ação', casaIcon === CTA_PINK, casaIcon)

  // Segundo endereço (trabalho): ícone de prédio, também em rosa.
  const listCta = await visibleLast(page.getByRole('button', { name: 'Cadastrar endereço', exact: true }))
  const listStyle = await buttonStyle(listCta, 'Cadastrar endereço')
  check('AC-02 Cadastrar endereço na lista usa action.primary', listStyle.background === CTA_PINK && listStyle.color === WHITE, JSON.stringify(listStyle))
  await listCta.click()
  await createAddress(page, { label: 'Trabalho', query: 'Rua Augusta, São Paulo' })
  const workCard = await visibleLast(page.getByRole('button', { name: /^Trabalho\./ }))
  const workIcon = await iconStroke(workCard.locator('svg').first())
  check('R2 ícone do endereço de trabalho usa rosa de ação', workIcon === CTA_PINK, workIcon)
  await shot(page, 'endereco-lista')

  await page.setViewportSize({ width: 1440, height: 900 })
  await shot(page, 'endereco-lista-desktop')
  await page.setViewportSize({ width: 390, height: 844 })

  // Toque no cartão abre a edição do mesmo endereço (sem mudança de rota).
  await workCard.click()
  await visibleLast(page.getByText('Editar endereço', { exact: true }))
  check('AC-13 toque no cartão abre a edição do endereço', true)
} catch (error) {
  fail(error)
} finally {
  await clearAddresses().catch(() => {})
  await pool.end().catch(() => {})
  await finish(browser)
}
