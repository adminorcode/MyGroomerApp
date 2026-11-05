import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  evidenceFile,
  gateRoute,
  launchBrowser,
  loginProfessional,
  openLogin,
  openPage,
  startRun,
} from './harness.mjs'

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
require(path.join(apiRoot, 'node_modules/dotenv')).config({ path: path.join(apiRoot, '.env'), quiet: true })
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))
const { hash } = require(path.join(apiRoot, 'node_modules/bcrypt'))

const run = startRun({
  command: 'node e2e/request-profile.mjs',
  evidence: evidenceFile('026-pet-tutor-profile', 'request-profile.log'),
})
const { check, fail, finish } = run
const base = 'http://127.0.0.1:3000/api/v1'
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const ids = {
  tutor: randomUUID(),
  tutorQuiet: randomUUID(),
  professional: randomUUID(),
  other: randomUUID(),
  provider: randomUUID(),
  otherProvider: randomUUID(),
  offer: randomUUID(),
  otherOffer: randomUUID(),
  pet: randomUUID(),
  barePet: randomUUID(),
  sparePet: randomUUID(),
  pending: randomUUID(),
  spare: randomUUID(),
  bare: randomUUID(),
  noPet: randomUUID(),
  ownRecent: randomUUID(),
  ownOlder: randomUUID(),
  foreign: randomUUID(),
  otherPending: randomUUID(),
}
const emails = {
  tutor: `ficha-tutor-${ids.tutor}@mygroomer.test`,
  tutorQuiet: `ficha-quiet-${ids.tutorQuiet}@mygroomer.test`,
  professional: `ficha-pro-${ids.professional}@mygroomer.test`,
  other: `ficha-other-${ids.other}@mygroomer.test`,
}
const secret = `nota-secreta-${ids.pending}`
const bookingIds = Object.values(ids).filter(id => [
  ids.pending, ids.spare, ids.bare, ids.noPet, ids.ownRecent, ids.ownOlder, ids.foreign, ids.otherPending,
].includes(id))

const api = async (route, method = 'GET', body, token) => {
  const response = await fetch(base + route, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : {} }
}

const insertBooking = (id, values) => pool.query(
  `INSERT INTO bookings(
      id, customer_id, pet_id, provider_service_id, scheduled_at, completed_at,
      customer_location, booking_status, duration_minutes, service_price
   ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,60,$9)`,
  [id, values.customerId, values.petId ?? null, values.offerId, values.at, values.completedAt ?? null, values.location, values.status, values.price ?? null],
)

async function loginAccount(page, email, ready) {
  await openLogin(page)
  await page.getByRole('textbox', { name: 'E-mail' }).fill(email)
  await page.getByRole('textbox', { name: 'Senha' }).fill('admin')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByText(ready).waitFor({ timeout: 20000 })
}

async function openRequests(page) {
  const nav = page.getByRole('tab', { name: 'Solicitações', exact: true }).or(page.getByRole('button', { name: 'Solicitações', exact: true }))
  await nav.first().click()
  await page.getByText('Solicitações recebidas', { exact: true }).waitFor({ timeout: 15000 })
}

function openFicha(page, pet) {
  return page.getByRole('button', { name: new RegExp(`^Abrir ficha de ${pet},`) }).first()
}

async function setup() {
  if (process.env.LOCAL_TEST_MODE !== 'true') throw new Error('LOCAL_TEST_MODE ausente')
  const url = new URL(process.env.DATABASE_URL)
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.pathname !== '/mygroomer_dev') {
    throw new Error('Recusando banco fora do ambiente local')
  }
  const service = await pool.query('SELECT id FROM services ORDER BY name LIMIT 1')
  if (!service.rows[0]) throw new Error('Catálogo de serviços ausente')
  const serviceId = service.rows[0].id
  const passwordHash = await hash('admin', 10)
  await pool.query(
    `INSERT INTO users(id, name, email, password, role, email_verified_at, phone_number) VALUES
     ($1,'Ana Souza',$2,$3,'customer',NOW(),'11987654321'),
     ($4,'Tutor Sem Fone',$5,$3,'customer',NOW(),'   '),
     ($6,'Groomer da Casa',$7,$3,'provider',NOW(),NULL),
     ($8,'Groomer Vizinho',$9,$3,'provider',NOW(),NULL)`,
    [ids.tutor, emails.tutor, passwordHash, ids.tutorQuiet, emails.tutorQuiet, ids.professional, emails.professional, ids.other, emails.other],
  )
  await pool.query(
    `INSERT INTO providers(id, user_id, travel_gap_minutes, manual_fit) VALUES ($1,$2,30,false), ($3,$4,30,false)`,
    [ids.provider, ids.professional, ids.otherProvider, ids.other],
  )
  await pool.query(
    `INSERT INTO provider_services(
        id, provider_id, service_id, price, is_active, custom_name,
        price_small, price_medium, price_large, duration_small_minutes, duration_medium_minutes, duration_large_minutes
     ) VALUES
     ($1,$2,$3,120,true,'Banho da casa',120,140,160,30,60,90),
     ($4,$5,$3,90,true,'Banho do vizinho',90,110,130,30,60,90)`,
    [ids.offer, ids.provider, serviceId, ids.otherOffer, ids.otherProvider],
  )
  await pool.query(
    `INSERT INTO pets(id, owner_id, name, species, breed, size, age_years, notes) VALUES
     ($1,$2,'Luna','dog','SRD','small',3,'Gosta de carinho'),
     ($3,$2,'Thor','dog','Poodle','medium',1,NULL),
     ($4,$2,'Nina','cat','SRD','small',2,NULL)`,
    [ids.pet, ids.tutor, ids.barePet, ids.sparePet],
  )
  const location = 'Rua das Flores, 123'
  await insertBooking(ids.ownRecent, { customerId: ids.tutor, petId: ids.pet, offerId: ids.offer, status: 'completed', at: '2026-03-10T15:00:00.000Z', completedAt: '2026-03-10T15:00:00.000Z', location, price: 80 })
  await insertBooking(ids.foreign, { customerId: ids.tutor, petId: ids.pet, offerId: ids.otherOffer, status: 'completed', at: '2026-02-10T15:00:00.000Z', completedAt: '2026-02-10T15:00:00.000Z', location, price: 70 })
  await insertBooking(ids.ownOlder, { customerId: ids.tutor, petId: ids.pet, offerId: ids.offer, status: 'completed', at: '2026-01-10T15:00:00.000Z', completedAt: '2026-01-10T15:00:00.000Z', location, price: null })
  await insertBooking(ids.pending, { customerId: ids.tutor, petId: ids.pet, offerId: ids.offer, status: 'pending_confirmation', at: '2026-06-10T15:00:00.000Z', location, price: 120 })
  await insertBooking(ids.spare, { customerId: ids.tutor, petId: ids.sparePet, offerId: ids.offer, status: 'pending_confirmation', at: '2026-06-11T15:00:00.000Z', location, price: 90 })
  await insertBooking(ids.bare, { customerId: ids.tutor, petId: ids.barePet, offerId: ids.offer, status: 'pending_confirmation', at: '2026-06-12T15:00:00.000Z', location, price: 90 })
  await insertBooking(ids.noPet, { customerId: ids.tutorQuiet, petId: null, offerId: ids.offer, status: 'pending_confirmation', at: '2026-06-13T15:00:00.000Z', location: 'Rua sem pet, 1', price: 90 })
  await insertBooking(ids.otherPending, { customerId: ids.tutor, petId: ids.pet, offerId: ids.otherOffer, status: 'pending_confirmation', at: '2026-06-14T15:00:00.000Z', location, price: 90 })
}

async function cleanup() {
  await pool.query('DELETE FROM pet_anamnesis_notes WHERE booking_id = ANY($1::uuid[])', [bookingIds]).catch(() => {})
  await pool.query('DELETE FROM bookings WHERE customer_id = ANY($1::uuid[])', [[ids.tutor, ids.tutorQuiet]]).catch(() => {})
  await pool.query('DELETE FROM pets WHERE owner_id = $1', [ids.tutor]).catch(() => {})
  await pool.query('DELETE FROM provider_services WHERE provider_id = ANY($1::uuid[])', [[ids.provider, ids.otherProvider]]).catch(() => {})
  await pool.query('DELETE FROM providers WHERE id = ANY($1::uuid[])', [[ids.provider, ids.otherProvider]]).catch(() => {})
  await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [[ids.tutor, ids.tutorQuiet, ids.professional, ids.other]]).catch(() => {})
  await pool.end().catch(() => {})
}

function luminance(channel) {
  const value = channel / 255
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

async function contrastOf(locator) {
  return locator.evaluate(element => {
    const read = node => {
      const style = getComputedStyle(node)
      const match = style.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      const background = style.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
      return { match, background, opaque: background ? Number(background[4] ?? 1) > 0.9 : false, style }
    }
    let node = element
    const foreground = read(element).match
    let background = null
    while (node && !background) {
      const sample = read(node)
      if (sample.opaque) background = sample.background
      node = node.parentElement
    }
    return { foreground, background }
  }).then(({ foreground, background }) => {
    if (!foreground || !background) return 0
    const L = rgb => 0.2126 * luminance(rgb[0]) + 0.7152 * luminance(rgb[1]) + 0.0722 * luminance(rgb[2])
    const fg = L(foreground.slice(1).map(Number))
    const bg = L(background.slice(1).map(Number))
    return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)
  })
}

async function execute() {
  await setup()
  const browser = await launchBrowser()
  const tutor = await api('/auth/login', 'POST', { email: emails.tutor, password: 'admin' })
  const groomer = await api('/auth/login', 'POST', { email: emails.professional, password: 'admin' })
  const other = await api('/auth/login', 'POST', { email: emails.other, password: 'admin' })
  if (tutor.status !== 200 || groomer.status !== 200 || other.status !== 200) {
    throw new Error(`Login de fixture falhou ${tutor.status}/${groomer.status}/${other.status}`)
  }

  const tutorPage = await openPage(browser)
  await loginAccount(tutorPage, emails.tutor, /^Olá/)
  await tutorPage.getByRole('button', { name: 'Abrir perfil' }).click()
  await tutorPage.getByRole('button', { name: 'Meus pets' }).click()
  await tutorPage.getByRole('button', { name: 'Editar Luna' }).click()
  await tutorPage.getByRole('textbox', { name: 'Alergias' }).fill('Pólen')
  await tutorPage.getByRole('textbox', { name: 'Medicamentos em uso' }).fill('Apoquel')
  await tutorPage.getByRole('textbox', { name: 'Condições de saúde' }).fill('Otite')
  await tutorPage.getByRole('textbox', { name: 'Comportamento' }).fill('Ansioso')
  await tutorPage.getByRole('textbox', { name: 'Cuidados especiais' }).fill('Secador baixo')
  await tutorPage.getByRole('button', { name: 'Em dia', exact: true }).click()
  await tutorPage.getByRole('button', { name: 'Salvar', exact: true }).click()
  await tutorPage.getByText('Cadastre os pets para reutilizar nos agendamentos', { exact: true }).waitFor({ timeout: 15000 })
  const edited = await api(`/pets/${ids.pet}`, 'GET', undefined, tutor.body.token)
  check('AC-04 edição grava a anamnese', edited.status === 200 && edited.body.data.allergies === 'Pólen' && edited.body.data.vaccination_up_to_date === true && edited.body.data.medications === 'Apoquel')

  await tutorPage.getByRole('button', { name: 'Cadastrar pet', exact: true }).click()
  await tutorPage.getByRole('textbox', { name: 'Nome', exact: true }).fill('Mel')
  await tutorPage.getByRole('radio', { name: 'Cão', exact: true }).click()
  await tutorPage.getByRole('textbox', { name: 'Raça' }).fill('SRD')
  await tutorPage.getByRole('radio', { name: 'Pequeno', exact: true }).click()
  await tutorPage.getByRole('textbox', { name: 'Idade (anos)' }).fill('2')
  await tutorPage.getByRole('textbox', { name: 'Alergias' }).fill('Frango')
  await tutorPage.getByRole('button', { name: 'Salvar e continuar', exact: true }).click()
  await tutorPage.getByText('Cadastre os pets para reutilizar nos agendamentos', { exact: true }).waitFor({ timeout: 15000 })
  const listed = await api('/pets', 'GET', undefined, tutor.body.token)
  const createdPet = listed.body.data.find(pet => pet.name === 'Mel')
  check('AC-04 cadastro grava a anamnese e o tutor não recebe nota', Boolean(createdPet) && createdPet.allergies === 'Frango' && !JSON.stringify(listed.body).includes(secret))
  await tutorPage.close()

  const page = await openPage(browser)
  await loginAccount(page, emails.professional, 'Agenda do groomer')
  await openRequests(page)
  await page.getByRole('tab', { name: 'Aceitas', exact: true }).click()
  await page.getByRole('tab', { name: 'Pendentes', exact: true }).click()
  await openFicha(page, 'Luna').click()
  await page.getByRole('heading', { name: 'Ficha do atendimento' }).waitFor({ timeout: 15000 })
  const tutorText = await page.getByRole('group', { name: 'Dados do tutor' }).innerText()
  check('AC-02 tutor, telefone, endereço e atendimentos anteriores',
    await page.getByText('Tutor: Ana Souza', { exact: true }).last().isVisible()
    && tutorText.includes('(11) 98765-4321')
    && tutorText.includes('Rua das Flores, 123')
    && tutorText.includes('2 atendimentos anteriores com você'),
    tutorText.replaceAll('\n', ' | '))
  const petText = await page.getByRole('group', { name: 'Dados do pet' }).innerText()
  check('AC-03 ficha do pet',
    petText.includes('Cão') && petText.includes('SRD') && petText.includes('Pequeno') && petText.includes('3 anos') && petText.includes('Gosta de carinho'),
    petText.replaceAll('\n', ' | '))
  const anamnesis = page.getByRole('group', { name: 'Anamnese' })
  check('AC-04 a ficha mostra a anamnese preenchida',
    await anamnesis.getByText('Pólen', { exact: true }).isVisible()
    && await anamnesis.getByText('Apoquel', { exact: true }).isVisible()
    && await anamnesis.getByText('Em dia', { exact: true }).isVisible())
  const history = page.getByRole('group', { name: 'Histórico' })
  const historyText = await history.innerText()
  const recent = historyText.indexOf('R$')
  const foreignAt = historyText.indexOf('Banho do vizinho')
  const older = historyText.indexOf('R$', recent + 1)
  check('AC-06 histórico ordenado, com valor só no atendimento deste groomer',
    historyText.includes('Banho da casa')
    && foreignAt > recent
    && older > foreignAt
    && !historyText.includes('70')
    && await history.getByText('Você', { exact: true }).first().isVisible()
    && await history.getByText('Groomer Vizinho', { exact: true }).isVisible())

  const note = page.getByRole('textbox', { name: 'Nota' })
  check('FE-04 nota vazia desabilita Salvar nota e mostra o erro',
    await page.getByText('Informe a nota.', { exact: true }).isVisible()
    && await page.getByRole('button', { name: 'Salvar nota' }).isDisabled())
  await note.fill('a'.repeat(1001))
  check('FE-04 nota acima de 1000 desabilita o botão e mostra o erro',
    await page.getByText('A nota deve ter no máximo 1000 caracteres.', { exact: true }).isVisible()
    && await page.getByRole('button', { name: 'Salvar nota' }).isDisabled())

  let releaseSave
  const saveGate = new Promise(resolve => { releaseSave = resolve })
  await page.route(`**/api/v1/providers/requests/${ids.pending}/anamnesis-note`, async route => {
    if (route.request().method() !== 'PUT') return route.continue()
    await saveGate
    await route.continue()
  })
  await note.fill(secret)
  const saveButton = page.getByRole('button', { name: 'Salvar nota' })
  const sent = page.waitForRequest(request => request.method() === 'PUT' && request.url().includes(`/requests/${ids.pending}/anamnesis-note`))
  await saveButton.click()
  await sent
  let busy = false
  let busyDetail = ''
  for (let attempt = 0; attempt < 25 && !busy; attempt += 1) {
    const disabled = await saveButton.isDisabled()
    const aria = await saveButton.getAttribute('aria-busy')
    busy = disabled && aria === 'true'
    busyDetail = `disabled ${disabled} aria-busy ${aria}`
    if (!busy) await page.waitForTimeout(100)
  }
  check('FE-04 nota em envio deixa Salvar nota ocupado e desabilitado', busy, busyDetail)
  releaseSave()
  await page.getByText('Nota salva.', { exact: true }).waitFor({ timeout: 15000 })
  const noteListed = text => page.evaluate(value => [...document.querySelectorAll('div')].some(element => element.children.length === 0 && element.textContent === value), text)
  let appeared = false
  for (let attempt = 0; attempt < 30 && !appeared; attempt += 1) {
    appeared = await noteListed(secret)
    if (!appeared) await page.waitForTimeout(200)
  }
  const notesText = await page.getByRole('group', { name: 'Suas notas' }).innerText()
  const noteAt = notesText.lastIndexOf(secret)
  check('AC-05 a nota aparece com data',
    appeared && /de 20\d{2}/.test(notesText.slice(Math.max(0, noteAt - 80), noteAt)),
    notesText.replaceAll('\n', ' | ').slice(0, 500))
  await page.unroute(`**/api/v1/providers/requests/${ids.pending}/anamnesis-note`)

  await page.route(`**/api/v1/providers/requests/${ids.pending}/anamnesis-note`, route => route.abort())
  await note.fill(`${secret}-falha`)
  await saveButton.click()
  const saveFailed = await page.getByRole('alert').filter({ hasText: 'Não foi possível' }).waitFor({ timeout: 10000 }).then(() => true, () => false)
  check('FE-04 falha ao salvar mantém o texto e mostra o erro',
    saveFailed && await note.inputValue() === `${secret}-falha`,
    await note.inputValue())
  await page.unroute(`**/api/v1/providers/requests/${ids.pending}/anamnesis-note`)
  await note.fill(`${secret}-editada`)
  await saveButton.click()
  await page.getByText('Nota salva.', { exact: true }).waitFor({ timeout: 15000 })
  check('AC-05 salvar de novo substitui a nota', await noteListed(`${secret}-editada`) && !await noteListed(secret) && await note.inputValue() === `${secret}-editada`)

  const youContrast = await contrastOf(history.getByText('Você', { exact: true }).first())
  check('FE-05 papéis da ficha',
    await page.getByRole('heading', { name: 'Ficha do atendimento' }).isVisible()
    && await page.getByRole('group', { name: 'Suas notas' }).isVisible())

  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.getByText('Solicitações recebidas', { exact: true }).waitFor()
  check('AC-01 voltar mantém a aba Pendentes', await page.getByRole('tab', { name: 'Pendentes', exact: true }).getAttribute('aria-selected') === 'true')
  await page.getByRole('button', { name: /^Aceitar solicitação de Luna,/ }).click()
  await page.getByText('Solicitações recebidas', { exact: true }).waitFor()
  check('AC-01 aceitar não abre a ficha', await page.getByRole('heading', { name: 'Ficha do atendimento' }).count() === 0)
  await page.getByRole('button', { name: /^Recusar solicitação de Nina,/ }).click()
  check('AC-01 recusar não abre a ficha', await page.getByRole('heading', { name: 'Ficha do atendimento' }).count() === 0 && await page.getByText('Solicitações recebidas', { exact: true }).isVisible())

  await openFicha(page, 'Thor').click()
  const thorAnamnesis = page.getByRole('group', { name: 'Anamnese' })
  await thorAnamnesis.waitFor()
  const anamnesisText = await thorAnamnesis.innerText()
  check('FE-03 anamnese vazia, sem notas e sem histórico',
    await thorAnamnesis.getByText('Não informado', { exact: true }).count() >= 6
    && await page.getByText('Você ainda não registrou notas deste pet.', { exact: true }).isVisible()
    && await page.getByText('Primeiro atendimento deste pet.', { exact: true }).isVisible(),
    anamnesisText.replaceAll('\n', ' | ').slice(0, 400))
  const missingContrast = await contrastOf(thorAnamnesis.getByText('Não informado', { exact: true }).first())
  check('FE-05 contraste do selo Você e de Não informado', youContrast >= 4.5 && missingContrast >= 4.5, `você ${youContrast.toFixed(2)} / vazio ${missingContrast.toFixed(2)}`)
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await openFicha(page, 'Pet não informado').click()
  await page.getByRole('group', { name: 'Dados do pet' }).getByText('Pet não informado', { exact: true }).waitFor()
  check('AC-02 sem telefone mostra Não informado e AC-03 sem pet',
    await page.getByRole('group', { name: 'Dados do tutor' }).getByText('Não informado', { exact: true }).isVisible()
    && await page.getByRole('group', { name: 'Dados do pet' }).getByText('Pet não informado', { exact: true }).isVisible()
    && await page.getByText('Este agendamento não tem pet para receber a nota.', { exact: true }).isVisible()
    && await page.getByRole('button', { name: 'Salvar nota' }).isDisabled())

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await openFicha(page, 'Thor').click()
  await page.getByRole('textbox', { name: 'Nota' }).focus()
  const save = page.getByRole('button', { name: 'Salvar nota' })
  await save.evaluate(element => element.scrollIntoView({ block: 'center' }))
  const saveBox = await save.boundingBox()
  check('FE-06 em 390 px Salvar nota fica na área visível', Boolean(saveBox) && saveBox.y >= 0 && saveBox.y + saveBox.height <= 844)
  const overflow390 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  await page.setViewportSize({ width: 320, height: 640 })
  const overflow320 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  await page.setViewportSize({ width: 1440, height: 900 })
  const column = await page.getByRole('group', { name: 'Dados do pet' }).boundingBox()
  check('FE-06 sem rolagem horizontal e coluna de 720 no desktop', overflow390 <= 1 && overflow320 <= 1 && column && column.width <= 720, `390 ${overflow390} / 320 ${overflow320} / coluna ${column?.width}`)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => {
    const nav = document.querySelector('[role="tablist"]')
    for (const el of document.querySelectorAll('div,span')) {
      if (el.children.length || nav?.contains(el)) continue
      const size = parseFloat(getComputedStyle(el).fontSize)
      if (size > 0) el.style.fontSize = `${size * 2}px`
    }
  })
  const overflowBig = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  const petBox = await page.getByRole('group', { name: 'Dados do pet' }).boundingBox()
  check('FE-07 texto a 200% não cria rolagem horizontal nem corta a seção', overflowBig <= 1 && petBox && petBox.width <= 390, `overflow ${overflowBig}`)
  await page.close()

  const states = await openPage(browser)
  await loginAccount(states, emails.professional, 'Agenda do groomer')
  const gate = { fail: false, delayMs: 2500 }
  await gateRoute(states, `**/api/v1/providers/requests/${ids.bare}/profile`, gate)
  await openRequests(states)
  await openFicha(states, 'Thor').click()
  check('FE-01 carregando', await states.getByRole('progressbar', { name: 'Carregando ficha' }).isVisible().catch(() => false))
  await states.getByRole('heading', { name: 'Ficha do atendimento' }).waitFor()
  await states.getByRole('button', { name: 'Voltar', exact: true }).click()
  await states.getByRole('heading', { name: 'Ficha do atendimento' }).waitFor({ state: 'hidden' })
  const errorGate = { fail: true, delayMs: 0 }
  await gateRoute(states, `**/api/v1/providers/requests/${ids.noPet}/profile`, errorGate)
  await openFicha(states, 'Pet não informado').click()
  check('FE-02 erro', await states.getByText('Não foi possível carregar a ficha.').waitFor({ timeout: 15000 }).then(() => true, () => false))
  errorGate.fail = false
  await states.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  check('FE-02 tentar novamente recupera a ficha', await states.getByRole('group', { name: 'Dados do pet' }).waitFor({ timeout: 15000 }).then(() => true, () => false))
  await states.close()

  const neighbor = await openPage(browser)
  await loginAccount(neighbor, emails.other, 'Agenda do groomer')
  await openRequests(neighbor)
  await openFicha(neighbor, 'Luna').click()
  await neighbor.getByRole('heading', { name: 'Ficha do atendimento' }).waitFor()
  check('AC-05 outro groomer não vê a nota', await neighbor.getByText(secret, { exact: false }).count() === 0)
  await neighbor.evaluate(bookingId => {
    window.history.pushState({}, '', `/ficha/${bookingId}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, ids.pending)
  check('AC-07 a rota de outro groomer mostra o erro da ficha', await neighbor.getByText('Não foi possível carregar a ficha.').waitFor({ timeout: 15000 }).then(() => true, () => false))
  const forbidden = await api(`/providers/requests/${ids.pending}/profile`, 'GET', undefined, other.body.token)
  check('AC-07 a API responde 403', forbidden.status === 403)
  await neighbor.close()

  await finish(browser)
}

execute()
  .catch(error => { fail(error) })
  .finally(async () => {
    await cleanup()
    await finish()
  })
