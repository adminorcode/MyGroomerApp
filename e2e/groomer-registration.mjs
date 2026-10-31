import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import { appUrl, evidenceFile, gateRoute, launchBrowser, openPage, openRegistrationWelcome, startRun } from './harness.mjs'

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
require(path.join(apiRoot, 'node_modules/dotenv')).config({ path: path.join(apiRoot, '.env'), quiet: true })
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const session = startRun({ command: 'node e2e/groomer-registration.mjs', evidence: evidenceFile('010-groomer-registration', 'groomer-registration.log') })
const { check } = session
const shots = path.dirname(evidenceFile('010-groomer-registration', 'ui-review/placeholder'))
mkdirSync(shots, { recursive: true })
const suffix = crypto.randomUUID()
const email = `g02-${suffix}@mygroomer.test`
const typeName = `Cuidador G02 ${suffix.slice(0, 8)}`
const inactiveName = `Inativo G02 ${suffix.slice(0, 8)}`
const password = 'LocalTest#2026'
const types = [crypto.randomUUID(), crypto.randomUUID()]
let browser
let providerId
let groomerType
let currentPage

const field = (page, name) => page.getByRole('textbox', { name, exact: true })
async function shot(page, name) { await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true }) }
async function request(route, method = 'GET', body, token) {
  const response = await fetch(`http://127.0.0.1:3000/api/v1${route}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(30000),
  })
  return { status: response.status, body: await response.json() }
}
async function openForm(page) {
  await openRegistrationWelcome(page)
  await page.getByRole('button', { name: 'Sou profissional' }).click()
  await field(page, 'Nome completo').waitFor({ timeout: 20000 })
}
async function fillValid(page) {
  await field(page, 'Nome completo').fill('Mariana Souza Oliveira')
  await field(page, 'CPF / CNPJ').fill('529.982.247-25')
  await field(page, 'Telefone').fill('(11) 98765-4321')
  await field(page, 'E-mail').fill(email)
  await field(page, 'Experiência').fill('Trabalho com banho, tosa e cuidados em domicílio há cinco anos.')
  await field(page, 'Certificações').fill('Curso de banho e tosa e primeiros socorros para pets.')
  await field(page, 'Senha').fill(password)
}
async function chooseFiles(page, files) {
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Selecionar arquivos', exact: true }).click()
  await (await chooser).setFiles(files)
}
async function openServices(page) {
  const control = page.getByRole('tab', { name: 'Serviços', exact: true }).or(page.getByRole('button', { name: 'Serviços', exact: true }))
  await control.first().click()
  await page.getByText('Dados do serviço', { exact: true }).waitFor({ timeout: 20000 })
}
async function verifyContrast(locator) {
  return locator.evaluate(el => {
    function rgb(c) { return c.match(/[\d.]+/g)?.slice(0, 3).map(Number) }
    function lum(c) { return c.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0) }
    let node = el
    let background
    while (node) {
      const color = getComputedStyle(node).backgroundColor
      if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') { background = rgb(color); break }
      node = node.parentElement
    }
    const foreground = rgb(getComputedStyle(el).color)
    if (!foreground || !background) throw new Error('Par de contraste não resolvido')
    const [a, b] = [lum(foreground), lum(background)].sort((x, y) => y - x)
    return (a + .05) / (b + .05)
  })
}

async function run() {
  const db = new URL(process.env.DATABASE_URL)
  if (process.env.LOCAL_TEST_MODE !== 'true' || !['localhost', '127.0.0.1', '[::1]'].includes(db.hostname) || db.pathname !== '/mygroomer_dev') throw new Error('Recusando banco fora do ambiente local')
  for (const url of ['http://localhost:3000/health', appUrl]) if (!(await fetch(url)).ok) throw new Error(`Servidor indisponível: ${url}`)
  await pool.query('INSERT INTO professional_types(id,name,is_active) VALUES ($1,$2,true),($3,$4,false)', [types[0], typeName, types[1], inactiveName])
  const catalog = await request('/professional-types/public')
  if (catalog.status !== 200) throw new Error(JSON.stringify(catalog))
  groomerType = catalog.body.data.find(type => type.name === 'Groomer')
  if (!groomerType) throw new Error('Tipo Groomer ativo ausente')
  browser = await launchBrowser()
  const page = await openPage(browser)
  currentPage = page
  await gateRoute(page, '**/professional-types/public', { delayMs: 3000 })
  await openForm(page)
  await page.getByText(/Carregando tipos/).waitFor({ timeout: 10000 })
  check('AC-07 carregamento parcial mantém nome editável', await field(page, 'Nome completo').isEditable())
  await page.getByLabel('Carregando tipos de atuação', { exact: true }).scrollIntoViewIfNeeded()
  await shot(page, '01-loading-mobile')
  await page.getByRole('checkbox', { name: 'Groomer', exact: true }).waitFor({ timeout: 15000 })
  check('AC-07 Continue bloqueado sem tipo', await page.getByRole('button', { name: 'Continuar', exact: true }).isDisabled())
  check('AC-06 tipo inativo ausente', await page.getByRole('checkbox', { name: inactiveName, exact: true }).count() === 0)
  await page.getByRole('button', { name: 'Voltar', exact: true }).scrollIntoViewIfNeeded()
  await shot(page, '02-form-top-mobile')
  await page.getByRole('checkbox', { name: 'Groomer', exact: true }).click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  check('AC-01 formulário incompleto não avança', await field(page, 'CPF / CNPJ').count() === 1 && await page.getByText('Informe um CPF ou CNPJ válido.', { exact: true }).isVisible())
  await fillValid(page)
  await field(page, 'CPF / CNPJ').fill('11111111111')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  check('AC-01 CPF inválido visível', await page.getByText('Informe um CPF ou CNPJ válido.', { exact: true }).isVisible())
  await field(page, 'CPF / CNPJ').fill('529.982.247-25')
  await field(page, 'Telefone').fill('123')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  check('AC-01 telefone inválido visível', await page.getByText('Informe um telefone brasileiro válido com DDD.', { exact: true }).isVisible())
  await field(page, 'Telefone').fill('(11) 98765-4321')
  for (const name of ['Experiência', 'Certificações']) {
    await field(page, name).fill('a'.repeat(501))
    check(`AC-02 ${name} limita 500`, (await field(page, name).inputValue()).length === 500)
  }
  check('AC-02 dois contadores 500', await page.getByText(/^500\/500/).count() === 2)
  await shot(page, '03-counters-mobile')
  await fillValid(page)
  await page.getByRole('checkbox', { name: typeName, exact: true }).click()
  await page.getByRole('checkbox', { name: typeName, exact: true, checked: true }).waitFor()
  check('AC-06 seleção múltipla acessível', await page.getByRole('checkbox', { name: 'Groomer', exact: true }).isChecked() && await page.getByRole('checkbox', { name: typeName, exact: true }).isChecked())
  await chooseFiles(page, [{ name: 'arquivo.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('invalid') }])
  await page.getByText('arquivo.exe: selecione um arquivo JPG, PNG ou PDF.', { exact: true }).waitFor()
  check('AC-03 tipo inválido recusado', await page.getByRole('button', { name: /Remover arquivo.exe/ }).count() === 0)
  await chooseFiles(page, [{ name: 'grande.png', mimeType: 'image/png', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) }])
  await page.getByText('grande.png: o tamanho máximo é 10 MB por arquivo.', { exact: true }).waitFor()
  check('AC-03 arquivo maior que 10MiB recusado', await page.getByRole('button', { name: /Remover grande.png/ }).count() === 0)
  const files = [
    { name: 'certificado.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF') },
    { name: 'evidencia.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lK0AAAAASUVORK5CYII=', 'base64') },
    { name: 'curso.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xd9]) },
  ]
  const fullSizePng = Buffer.alloc(10 * 1024 * 1024)
  files[1].buffer.copy(fullSizePng)
  files[1].buffer = fullSizePng
  await chooseFiles(page, files)
  await page.getByRole('button', { name: /Remover curso.jpg/ }).waitFor({ timeout: 10000 })
  check('AC-03 três formatos aceitos', await page.getByRole('button', { name: /Remover (certificado.pdf|evidencia.png|curso.jpg)/ }).count() === 3)
  await shot(page, '04-attachments-mobile')
  await page.getByRole('button', { name: 'Salvar e sair', exact: true }).click()
  await page.getByRole('button', { name: 'Sou profissional' }).waitFor()
  check('AC-04 rascunho público sai do assistente', await page.getByRole('button', { name: 'Sou tutor' }).isVisible())
  await page.unroute('**/professional-types/public')
  await page.route('**/professional-types/public', route => route.abort())
  await openRegistrationWelcome(page)
  await page.getByRole('button', { name: 'Sou profissional' }).click()
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Salvar e sair', exact: true }).click()
  await page.getByRole('button', { name: 'Sou profissional' }).waitFor()
  await page.unroute('**/professional-types/public')
  await openRegistrationWelcome(page)
  await page.getByRole('button', { name: 'Sou profissional' }).click()
  await page.getByRole('button', { name: /Remover certificado.pdf/ }).waitFor()
  check('AC-04 rascunho público restaura dados tipos anexos sem senha', (await field(page, 'Nome completo').inputValue()) === 'Mariana Souza Oliveira' && await page.getByRole('checkbox', { name: typeName, exact: true }).isChecked() && await field(page, 'Senha').inputValue() === '' && await page.getByRole('button', { name: /Remover evidencia.png/ }).count() === 1)
  check('AC-04 catálogo indisponível não apaga tipos do rascunho', await page.getByRole('checkbox', { name: 'Groomer', exact: true }).isChecked() && await page.getByRole('checkbox', { name: typeName, exact: true }).isChecked())
  await field(page, 'Senha').fill(password)
  await page.route('**/auth/register', route => route.abort())
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByText(/Não foi possível conectar/).waitFor({ timeout: 15000 })
  check('AC-04 falha de cadastro preserva dados', await field(page, 'E-mail').inputValue() === email && await page.getByRole('checkbox', { name: typeName, exact: true }).isChecked())
  await shot(page, '05-register-error-mobile')
  await page.unroute('**/auth/register')
  await gateRoute(page, '**/auth/register', { delayMs: 1000 })
  await page.route('**/auth/login', route => route.abort())
  const busy = page.getByRole('button', { name: 'Continuar', exact: true, disabled: true }).waitFor().then(() => true)
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  check('AC-04 envio bloqueia duplicação', await busy)
  await page.getByText(/Sua conta já foi criada para/).waitFor({ timeout: 20000 })
  await page.getByText(/Não foi possível conectar/).waitFor({ timeout: 15000 })
  check('AC-04 falha pós-cadastro informa recuperação e fixa email', !(await field(page, 'E-mail').isEditable()))
  await page.getByRole('button', { name: 'Salvar e sair', exact: true }).click()
  await page.getByRole('button', { name: 'Sou profissional' }).waitFor()
  await openRegistrationWelcome(page)
  await page.getByRole('button', { name: 'Sou profissional' }).click()
  await page.getByText(/Sua conta já foi criada para/).waitFor()
  check('AC-04 rascunho retoma conta criada sem senha', !(await field(page, 'E-mail').isEditable()) && await field(page, 'Senha').inputValue() === '')
  await field(page, 'Senha').fill(password)
  await field(page, 'Nome completo').fill('Mariana Souza Recuperada')
  await field(page, 'Experiência').fill('Dados editados após falha no login automático.')
  await page.unroute('**/auth/login')
  let duplicatePosts = 0
  await page.unroute('**/auth/register')
  await page.route('**/auth/register', route => { duplicatePosts++; return route.continue() })
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar serviço', exact: true }).waitFor({ timeout: 30000 })
  check('AC-04 Continuar cria conta e abre serviços', await page.getByRole('button', { name: 'Adicionar serviço' }).isVisible())
  const recovered = await pool.query('SELECT u.name,r.experience FROM users u JOIN providers p ON p.user_id=u.id JOIN provider_registrations r ON r.provider_id=p.id WHERE u.email=$1', [email])
  check('AC-04 recuperação salva edições sem duplicar cadastro', duplicatePosts === 0 && recovered.rows[0]?.name === 'Mariana Souza Recuperada' && recovered.rows[0]?.experience === 'Dados editados após falha no login automático.')
  const account = await pool.query('SELECT p.id,p.is_verified FROM providers p JOIN users u ON u.id=p.user_id WHERE u.email=$1', [email])
  providerId = account.rows[0]?.id
  check('AC-05 conta permanece não verificada', account.rows.length === 1 && account.rows[0].is_verified === false)
  const links = await pool.query('SELECT professional_type_id FROM provider_professional_types WHERE provider_id=$1', [providerId])
  check('AC-06 dois tipos persistidos', links.rows.length === 2 && links.rows.some(row => row.professional_type_id === types[0]) && links.rows.some(row => row.professional_type_id === groomerType.id))
  const stored = await pool.query('SELECT name,size,octet_length(content) AS bytes FROM provider_registration_attachments WHERE provider_id=$1', [providerId])
  check('AC-03 três conteúdos persistidos privados', stored.rows.length === 3 && stored.rows.every(row => row.size === row.bytes))
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await field(page, 'Experiência').waitFor()
  check('AC-01 máscara de CPF aplicada aos dados autenticados', await field(page, 'CPF / CNPJ').inputValue() === '529.982.247-25')
  check('AC-04 G02 autenticada recupera arquivos', await page.getByRole('button', { name: /Remover certificado.pdf/ }).count() === 1 && !(await field(page, 'E-mail').isEditable()))
  check('AC-05 aviso de análise humana', await page.getByText('Validação feita por pessoas reais', { exact: true }).isVisible())
  await page.getByRole('button', { name: 'Voltar', exact: true }).scrollIntoViewIfNeeded()
  await shot(page, '12-authenticated-top')
  await page.getByText('Validação feita por pessoas reais', { exact: true }).scrollIntoViewIfNeeded()
  await shot(page, '13-authenticated-evidence-notice')
  await field(page, 'Experiência').fill('Experiência atualizada no rascunho autenticado.')
  await page.route('**/providers/registration', route => route.request().method() === 'PUT' ? route.abort() : route.continue())
  await page.getByRole('button', { name: 'Salvar e sair', exact: true }).click()
  await page.getByText(/Não foi possível conectar/).waitFor({ timeout: 15000 })
  check('AC-04 falha ao salvar preserva experiência', await field(page, 'Experiência').inputValue() === 'Experiência atualizada no rascunho autenticado.')
  await page.unroute('**/providers/registration')
  await page.getByRole('button', { name: 'Salvar e sair', exact: true }).click()
  await page.getByText('Agendamentos', { exact: true }).waitFor({ timeout: 15000 })
  check('AC-04 salvar autenticado sai para Painel', await page.getByText('Agendamentos', { exact: true }).isVisible())
  await page.reload()
  await openServices(page)
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await field(page, 'Experiência').waitFor()
  check('AC-04 rascunho autenticado sobrevive reload', await field(page, 'Experiência').inputValue() === 'Experiência atualizada no rascunho autenticado.' && await page.getByRole('checkbox', { name: typeName, exact: true }).isChecked())
  await page.getByRole('button', { name: /Remover curso.jpg/ }).click()
  check('AC-03 remover anexo individual', await page.getByRole('button', { name: /Remover curso.jpg/ }).count() === 0)
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar serviço', exact: true }).waitFor()
  const removed = await pool.query('SELECT count(*)::int AS count FROM provider_registration_attachments WHERE provider_id=$1', [providerId])
  check('AC-03 remoção persistida no Continue', removed.rows[0].count === 2)

  for (const mode of ['empty', 'error']) {
    const state = await openPage(browser)
    await state.route('**/professional-types/public', route => mode === 'empty' ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }) : route.abort())
    await openForm(state)
    if (mode === 'empty') {
      await state.getByText(/Nenhum tipo/).waitFor()
      await state.getByText(/Nenhum tipo/).scrollIntoViewIfNeeded()
      check('AC-07 catálogo vazio separado', await state.getByRole('checkbox').count() === 0 && await state.getByRole('button', { name: 'Continuar', exact: true }).isDisabled())
    } else {
      await state.getByRole('button', { name: 'Tentar novamente', exact: true }).waitFor({ timeout: 20000 })
      await state.getByRole('button', { name: 'Tentar novamente', exact: true }).scrollIntoViewIfNeeded()
      check('AC-07 erro recuperável mantém campos', await field(state, 'Nome completo').isEditable() && await state.getByRole('button', { name: 'Continuar', exact: true }).isDisabled())
    }
    await shot(state, `06-catalog-${mode}-mobile`)
    await state.unroute('**/professional-types/public')
    if (mode === 'error') {
      await state.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
      await state.getByRole('checkbox', { name: 'Groomer', exact: true }).waitFor()
      check('AC-07 retry recupera catálogo real', await state.getByRole('checkbox', { name: typeName, exact: true }).count() === 1)
    }
    await state.context().close()
  }
  const desktop = await openPage(browser, { viewport: 'desktop' })
  await openForm(desktop)
  await desktop.getByRole('checkbox', { name: 'Groomer', exact: true }).waitFor()
  await shot(desktop, '07-desktop-top')
  const box = await field(desktop, 'Nome completo').boundingBox()
  check('UI formulário desktop limita largura', box.width < 760 && box.x > 200)
  const ratio = await verifyContrast(desktop.getByText('Nome completo *', { exact: true }))
  check('UI contraste de label AA', ratio >= 4.5, `ratio=${ratio.toFixed(2)}`)
  await desktop.setViewportSize({ width: 320, height: 760 })
  await shot(desktop, '08-narrow-top')
  await field(desktop, 'Certificações').scrollIntoViewIfNeeded()
  await shot(desktop, '09-narrow-fields')
  await desktop.getByText('Validação feita por pessoas reais', { exact: true }).scrollIntoViewIfNeeded()
  await shot(desktop, '10-narrow-footer')
  const footerBox = await desktop.getByRole('button', { name: 'Continuar', exact: true }).boundingBox()
  check('UI CTA em320 acessível sem overflow', footerBox.x >= 0 && footerBox.x + footerBox.width <= 321 && footerBox.height >= 48)
  await desktop.evaluate(() => {
    for (const element of document.querySelectorAll('div,span,input,textarea')) {
      if (element.children.length === 0 || ['INPUT', 'TEXTAREA'].includes(element.tagName)) {
        const style = getComputedStyle(element)
        if (parseFloat(style.fontSize) > 0) { element.style.fontSize = `${parseFloat(style.fontSize) * 2}px`; element.style.lineHeight = 'normal' }
      }
    }
  })
  await desktop.getByRole('button', { name: 'Salvar e sair', exact: true }).scrollIntoViewIfNeeded()
  await shot(desktop, '11-narrow-text200')
  const textBox = await desktop.getByRole('button', { name: 'Salvar e sair', exact: true }).boundingBox()
  check('UI fonte200 CTA mantém conteúdo', textBox.x >= 0 && textBox.x + textBox.width <= 321 && textBox.height >= 48)
  for (const label of ['Salvar e sair', 'Continuar']) {
    const buttonBounds = await desktop.getByRole('button', { name: label, exact: true }).boundingBox()
    const labelBounds = await desktop.getByRole('button', { name: label, exact: true }).getByText(label, { exact: true }).boundingBox()
    check(`UI fonte200 ${label} sem texto sobreposto`, labelBounds.x >= buttonBounds.x && labelBounds.x + labelBounds.width <= buttonBounds.x + buttonBounds.width + 1)
  }
  const touch = await desktop.getByRole('button', { name: 'Voltar', exact: true }).boundingBox()
  check('UI voltar tem alvo48', touch.width >= 48 && touch.height >= 48)
}

try { await run() } catch (error) {
  if (currentPage && !currentPage.isClosed()) await shot(currentPage, 'failure').catch(() => {})
  session.fail(error)
} finally {
  if (browser) await browser.close()
  try {
    await pool.query('DELETE FROM users WHERE email=$1', [email])
    await pool.query('DELETE FROM professional_types WHERE id = ANY($1::uuid[])', [types])
  } catch (error) { session.fail(error) }
  await pool.end()
  await session.finish(browser)
}
