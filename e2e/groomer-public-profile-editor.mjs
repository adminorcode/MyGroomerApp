import { saveScreenshot } from './harness.mjs'
import { createRequire } from 'node:module'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  checkContrast,
  evidenceFile,
  fillServiceAddress,
  gateRoute,
  launchBrowser,
  loginProfessional,
  loginTutor,
  openPage,
  startRun,
} from './harness.mjs'

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
require(path.join(apiRoot, 'node_modules/dotenv')).config({ path: path.join(apiRoot, '.env'), quiet: true })
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))

const api = 'http://127.0.0.1:3000/api/v1'
const providerId = '10000000-0000-4000-8000-000000000003'
const rules = 'Atendimento em domicílio. O tutor precisa estar presente durante o serviço.'
const newRules = 'Atendimento em domicílio com hora marcada. Levo secador e produtos próprios.'

const session = startRun({
  command: 'node e2e/groomer-public-profile-editor.mjs',
  evidence: evidenceFile('014-groomer-public-profile', 'groomer-public-profile-editor.log'),
})
const { check } = session
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const shots = evidenceFile('014-groomer-public-profile', 'ui-review')
mkdirSync(shots, { recursive: true })

const workDir = mkdtempSync(path.join(tmpdir(), 'mg-014-'))
const pngPath = path.join(workDir, 'gallery.png')
writeFileSync(pngPath, Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4AIX8EAgALgAD/aNpbtEAAAAASUVORK5CYII=',
  'base64',
))

let providerRow
let offersRows
let weekdayRows
let galleryRows

async function capture() {
  providerRow = (await pool.query('SELECT * FROM providers WHERE id = $1', [providerId])).rows[0]
  offersRows = (await pool.query('SELECT * FROM provider_services WHERE provider_id = $1 ORDER BY id', [providerId])).rows
  weekdayRows = (await pool.query('SELECT * FROM provider_weekdays WHERE provider_id = $1 ORDER BY weekday', [providerId])).rows
  galleryRows = (await pool.query(
    'SELECT id, mime_type, size, content, created_at FROM provider_gallery_photos WHERE provider_id = $1 ORDER BY created_at, id',
    [providerId],
  )).rows
}

async function clearGallery() {
  await pool.query('DELETE FROM provider_gallery_photos WHERE provider_id = $1', [providerId])
}

async function restore() {
  if (providerRow) {
    const columns = Object.keys(providerRow).filter(column => column !== 'id')
    const assignments = columns.map((column, index) => `${column} = $${index + 2}`).join(', ')
    await pool.query(
      `UPDATE providers SET ${assignments} WHERE id = $1`,
      [providerId, ...columns.map(column => providerRow[column])],
    )
  }
  for (const offer of offersRows ?? []) {
    const columns = Object.keys(offer).filter(column => column !== 'id')
    const assignments = columns.map((column, index) => `${column} = $${index + 2}`).join(', ')
    await pool.query(
      `UPDATE provider_services SET ${assignments} WHERE id = $1`,
      [offer.id, ...columns.map(column => offer[column])],
    )
  }
  await pool.query('DELETE FROM provider_weekdays WHERE provider_id = $1', [providerId])
  for (const day of weekdayRows ?? []) {
    await pool.query(
      `INSERT INTO provider_weekdays(provider_id, weekday, start_minute, end_minute, break_start_minute, break_end_minute)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [providerId, day.weekday, day.start_minute, day.end_minute, day.break_start_minute, day.break_end_minute],
    )
  }
  if (!galleryRows) return
  await pool.query('DELETE FROM provider_gallery_photos WHERE provider_id = $1', [providerId])
  for (const photo of galleryRows) {
    await pool.query(
      `INSERT INTO provider_gallery_photos (id, provider_id, mime_type, size, content, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [photo.id, providerId, photo.mime_type, photo.size, photo.content, photo.created_at],
    )
  }
}

async function loginApi(email) {
  const response = await fetch(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'admin' }),
    signal: AbortSignal.timeout(10000),
  })
  if (response.status !== 200) throw new Error(`login ${email} ${response.status}`)
  const body = await response.json()
  return body.token
}

async function readProfile(token) {
  const response = await fetch(`${api}/providers/me/public-profile`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  })
  if (response.status !== 200) throw new Error(`perfil ${response.status}`)
  return (await response.json()).data
}

// A conta de demonstração precisa começar sem dia ligado para o estado vazio dos
// horários e para o dia que o spec liga depois. A rotina original volta no finally.
async function clearRoutine(token) {
  const response = await fetch(`${api}/providers/weekly-availability`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      days: {
        mon: { enabled: false, start: null, end: null, break_start: null, break_end: null },
        tue: { enabled: false, start: null, end: null, break_start: null, break_end: null },
        wed: { enabled: false, start: null, end: null, break_start: null, break_end: null },
        thu: { enabled: false, start: null, end: null, break_start: null, break_end: null },
        fri: { enabled: false, start: null, end: null, break_start: null, break_end: null },
        sat: { enabled: false, start: null, end: null, break_start: null, break_end: null },
        sun: { enabled: false, start: null, end: null, break_start: null, break_end: null },
      },
      travel_gap_minutes: 30,
      manual_fit: false,
    }),
    signal: AbortSignal.timeout(10000),
  })
  if (response.status !== 200) throw new Error(`rotina ${response.status}`)
}

async function pickFile(page, buttonName) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 10000 }),
    page.getByRole('button', { name: buttonName, exact: true }).click(),
  ])
  await chooser.setFiles(pngPath)
}

async function openOwnProfile(page) {
  await page.getByRole('button', { name: 'Abrir perfil' }).click()
  await page.getByRole('button', { name: 'Perfil público' }).click()
  await page.getByText('Descrição profissional', { exact: true }).waitFor({ timeout: 20000 })
}

async function openSearchProfile(page) {
  await page.getByRole('button', { name: 'Buscar um serviço' }).click()
  await fillServiceAddress(page, 'Avenida Paulista, São Paulo')
  await page.getByRole('button', { name: /Groomer de Teste/ }).click()
}

async function run(browser) {
  const gate = { fail: false, delayMs: 0 }
  const page = await openPage(browser, { viewport: 'mobile' })
  await gateRoute(page, '**/api/v1/providers/me/public-profile', gate)

  await loginProfessional(page)
  await page.getByRole('button', { name: 'Abrir perfil' }).click()

  gate.fail = true
  await page.getByRole('button', { name: 'Perfil público' }).click()
  await page.getByText('Não foi possível conectar. Verifique sua internet e tente novamente.').waitFor({ timeout: 20000 })
  check('AC-01 erro do perfil', true)
  await saveScreenshot(page, path.join(shots, '00-mobile-erro.png'))
  gate.fail = false
  gate.delayMs = 1200
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await page.getByText('Carregando perfil', { exact: true }).waitFor({ timeout: 5000 })
  check('AC-01 carregando', true)
  await saveScreenshot(page, path.join(shots, '00b-mobile-carregando.png'))
  gate.delayMs = 0
  await page.getByText('Descrição profissional', { exact: true }).waitFor({ timeout: 20000 })

  const header = page.getByLabel('Profissional Groomer de Teste')
  await header.waitFor()
  check(
    'AC-01 cabeçalho',
    await header.getByText('Verificado', { exact: true }).count() > 0
      && await header.getByText(/Avaliação 5,0/).count() > 0,
  )
  check(
    'AC-01 área',
    await page.getByText('Raio de até 8 km', { exact: true }).count() > 0
      && await page.getByText('Avenida Paulista, São Paulo', { exact: true }).count() > 0,
  )
  check(
    'AC-01 serviços',
    await page.getByText(/A partir de R\$\s?80,00/).count() > 0
      && await page.getByText(/A partir de R\$\s?150,00/).count() > 0
      && await page.getByText(/A partir de R\$\s?100,00/).count() > 0,
  )
  check('AC-01 descrição', await page.getByText(rules, { exact: true }).count() > 0)
  check(
    'AC-01 horários sem dia ligado',
    await page.getByText('Nenhum dia de atendimento configurado.', { exact: true }).count() > 0,
  )
  check(
    'AC-02 selo só com verificação e sem edição',
    await header.getByText('Verificado', { exact: true }).count() > 0
      && await page.getByRole('button', { name: /Verificado/i }).count() === 0
      && await page.getByRole('switch', { name: /Verificado/i }).count() === 0,
  )
  check(
    'AC-05 galeria vazia não bloqueia o perfil',
    await page.getByText('Nenhuma foto na galeria.', { exact: true }).count() > 0
      && await page.getByRole('button', { name: 'Adicionar fotos' }).count() > 0
      && await page.getByRole('button', { name: 'Editar área' }).isVisible(),
  )
  await saveScreenshot(page, path.join(shots, '01-mobile-perfil.png'), { fullPage: true })
  await page.getByText('Fotos / Galeria', { exact: true }).scrollIntoViewIfNeeded()
  await saveScreenshot(page, path.join(shots, '01d-mobile-vazio.png'))

  await page.getByRole('button', { name: 'Editar horários' }).click()
  await page.getByText('Dias de trabalho', { exact: true }).waitFor({ timeout: 20000 })
  check(
    'AC-03 horários abre a rotina pelo perfil',
    await page.getByRole('button', { name: 'Ir para revisão' }).count() === 0
      && await page.getByRole('button', { name: 'Salvar' }).count() > 0,
  )
  await page.getByRole('button', { name: 'sábado, desligado' }).click()
  await page.getByRole('textbox', { name: 'Início de sábado' }).fill('08:00')
  await page.getByRole('textbox', { name: 'Fim de sábado' }).fill('12:00')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await page.getByLabel('Sáb, 08:00 às 12:00').waitFor({ timeout: 20000 })
  check('AC-03 horários', true)
  await saveScreenshot(page, path.join(shots, '01b-mobile-horarios.png'), { fullPage: true })

  await page.getByRole('button', { name: 'Editar descrição' }).click()
  const descriptionField = page.getByRole('textbox', { name: 'Sua descrição' })
  await descriptionField.waitFor()
  await descriptionField.fill(newRules)
  await saveScreenshot(page, path.join(shots, '01c-mobile-descricao.png'), { fullPage: true })
  await page.route('**/api/v1/providers/me/description', route => route.abort())
  await page.getByRole('button', { name: 'Salvar' }).click()
  await page.getByText('Não foi possível conectar. Verifique sua internet e tente novamente.').waitFor({ timeout: 15000 })
  check(
    'AC-03 falha ao salvar a descrição mantém o texto',
    await descriptionField.inputValue() === newRules
      && await page.getByText(rules, { exact: true }).count() === 0,
  )
  await page.unroute('**/api/v1/providers/me/description')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await page.getByText(newRules, { exact: true }).waitFor({ timeout: 20000 })
  check('AC-03 descrição', true)

  await page.getByRole('button', { name: 'Editar área' }).click()
  await page.getByRole('button', { name: '5 km' }).click()
  await page.getByRole('button', { name: 'Salvar' }).click()
  await page.getByText('Raio de até 5 km', { exact: true }).waitFor({ timeout: 25000 })
  check('AC-03 área', true)

  await page.getByRole('button', { name: 'Editar serviços' }).click()
  await page.getByRole('button', { name: 'Editar Banho', exact: true }).click()
  await page.getByRole('textbox', { name: 'Preço pequeno' }).fill('95,00')
  await page.getByRole('textbox', { name: 'Preço médio' }).fill('105,00')
  await page.getByRole('textbox', { name: 'Preço grande' }).fill('115,00')
  await page.getByRole('button', { name: 'Concluir' }).click()
  await page.getByRole('button', { name: 'Salvar' }).click()
  await page.getByText(/A partir de R\$\s?95,00/).waitFor({ timeout: 25000 })
  check('AC-03 serviços', true)

  await page.getByRole('button', { name: 'Editar foto' }).click()
  await page.getByRole('button', { name: 'Escolher foto' }).waitFor()
  await saveScreenshot(page, path.join(shots, '02b-mobile-foto.png'), { fullPage: true })
  await pickFile(page, 'Escolher foto')
  await page.locator('img[src^="blob:"]:visible').first().waitFor({ timeout: 20000 })
  check('AC-03 foto do cabeçalho', await page.locator('img[src^="blob:"]:visible').count() >= 1)

  await page.getByRole('button', { name: 'Voltar' }).click()
  await openOwnProfile(page)
  await page.locator('img[src^="blob:"]:visible').first().waitFor({ timeout: 20000 })
  check('AC-03 foto permanece ao reabrir', await page.locator('img[src^="blob:"]:visible').count() >= 1)

  await pickFile(page, 'Adicionar fotos')
  await page.getByRole('button', { name: 'Remover foto da galeria 1' }).waitFor({ timeout: 20000 })
  await page.locator('img[src^="blob:"]:visible').nth(1).waitFor({ timeout: 20000 })
  check('AC-05 foto incluída na galeria', await page.locator('img[src^="blob:"]:visible').count() === 2)
  await saveScreenshot(page, path.join(shots, '02-mobile-galeria.png'), { fullPage: true })

  await checkContrast(page, page.getByText('Perfil público', { exact: true }).last(), 'tema claro em 390', check)

  await page.getByRole('button', { name: 'Visualizar como tutor' }).click()
  await page.getByText('A prévia não inicia um agendamento.', { exact: true }).waitFor({ timeout: 20000 })
  check(
    'AC-04 prévia sem controles de edição',
    await page.getByRole('button', { name: 'Editar foto' }).count() === 0
      && await page.getByRole('button', { name: 'Editar descrição' }).count() === 0
      && await page.getByRole('button', { name: 'Editar área' }).count() === 0
      && await page.getByRole('button', { name: 'Editar serviços' }).count() === 0
      && await page.getByRole('button', { name: 'Editar horários' }).count() === 0
      && await page.getByRole('button', { name: 'Adicionar fotos' }).count() === 0,
  )
  check('AC-04 prévia não agenda', await page.getByRole('button', { name: 'Agendar serviço' }).isDisabled())
  await page.locator('img[src^="blob:"]:visible').nth(1).waitFor({ timeout: 20000 })
  check('AC-04 prévia mostra a galeria publicada', await page.locator('img[src^="blob:"]:visible').count() === 2)
  check('AC-03 prévia mostra a descrição nova', await page.getByText(newRules, { exact: true }).count() > 0)
  await saveScreenshot(page, path.join(shots, '03-mobile-previa.png'), { fullPage: true })

  await page.getByRole('button', { name: 'Voltar' }).click()
  await page.getByRole('button', { name: 'Remover foto da galeria 1' }).click()
  await page.getByText('Nenhuma foto na galeria.', { exact: true }).waitFor({ timeout: 20000 })
  check('AC-05 foto removida do perfil', true)
  await page.getByRole('button', { name: 'Visualizar como tutor' }).click()
  await page.getByText('A prévia não inicia um agendamento.', { exact: true }).waitFor({ timeout: 20000 })
  await page.getByText('Nenhuma foto publicada.', { exact: true }).waitFor({ timeout: 20000 })
  check('AC-05 foto removida sai da prévia', await page.locator('img[src^="blob:"]:visible').count() === 1)
  await page.getByRole('button', { name: 'Voltar' }).click()

  const tutor = await openPage(browser, { viewport: 'mobile' })
  await loginTutor(tutor)
  await openSearchProfile(tutor)
  await tutor.getByText('Regras de atendimento', { exact: true }).waitFor({ timeout: 20000 })
  check('AC-03 descrição nova na busca', await tutor.getByText(newRules, { exact: true }).count() > 0)
  check(
    'AC-04 busca sem controles de edição',
    await tutor.getByRole('button', { name: 'Editar área' }).count() === 0
      && await tutor.getByRole('button', { name: 'Adicionar fotos' }).count() === 0,
  )
  check(
    'AC-01 busca mostra área e horários',
    await tutor.getByText('Raio de até 5 km', { exact: true }).count() > 0
      && await tutor.getByLabel('Sáb, 08:00 às 12:00').count() > 0,
  )
  const book = tutor.getByRole('button', { name: 'Agendar serviço' })
  check('AC-04 busca começa sem serviço selecionado', await book.isDisabled())
  await tutor.getByRole('radio', { name: /^Banho, A partir de/ }).click()
  check('AC-04 busca agenda depois da seleção', await book.isEnabled())
  await saveScreenshot(tutor, path.join(shots, '05-mobile-busca.png'), { fullPage: true })
  await tutor.context().close()

  const emptyPage = await openPage(browser, { viewport: 'mobile' })
  await emptyPage.route('**/api/v1/providers/me/public-profile', async route => {
    const response = await route.fetch()
    const body = await response.json()
    body.data = { ...body.data, attendance_rules: null, area: null, schedule: [], gallery: [], services: [] }
    await route.fulfill({ response, json: body })
  })
  await loginProfessional(emptyPage)
  await emptyPage.getByRole('button', { name: 'Abrir perfil' }).click()
  await emptyPage.getByRole('button', { name: 'Perfil público' }).click()
  await emptyPage.getByText('Ainda não há descrição profissional.', { exact: true }).waitFor({ timeout: 20000 })
  check(
    'AC-01 vazios de descrição, área, horários e galeria',
    await emptyPage.getByText('Área de atendimento ainda não informada.', { exact: true }).count() > 0
      && await emptyPage.getByText('Nenhum dia de atendimento configurado.', { exact: true }).count() > 0
      && await emptyPage.getByText('Nenhuma foto na galeria.', { exact: true }).count() > 0,
  )
  await emptyPage.getByText('Fotos / Galeria', { exact: true }).scrollIntoViewIfNeeded()
  await saveScreenshot(emptyPage, path.join(shots, '01e-mobile-vazios.png'))
  await emptyPage.getByRole('button', { name: 'Visualizar como tutor' }).click()
  await emptyPage.getByText('A prévia não inicia um agendamento.', { exact: true }).waitFor({ timeout: 20000 })
  await emptyPage.getByText('Nenhum serviço disponível', { exact: true }).waitFor({ timeout: 20000 })
  check(
    'AC-04 prévia sem serviço ativo usa o perfil do dono',
    await emptyPage.getByText('Nenhum serviço disponível', { exact: true }).count() > 0
      && await emptyPage.getByRole('button', { name: 'Agendar serviço' }).isDisabled(),
  )
  await emptyPage.context().close()

  const wide = await openPage(browser, { viewport: 'desktop' })
  await loginProfessional(wide)
  await openOwnProfile(wide)
  await checkContrast(wide, wide.getByText('Perfil público', { exact: true }).last(), 'tema claro em 1440', check)
  await saveScreenshot(wide, path.join(shots, '04-desktop-perfil.png'), { fullPage: true })
  await wide.getByText('Fotos / Galeria', { exact: true }).scrollIntoViewIfNeeded()
  check('AC-01 galeria alcançável em 1440', await wide.getByRole('button', { name: 'Adicionar fotos' }).isVisible())
  await saveScreenshot(wide, path.join(shots, '04b-desktop-galeria.png'))
  await wide.context().close()
  await page.context().close()
}

let browser
let originalProfile
try {
  await capture()
  const token = await loginApi('groomer@email.com')
  originalProfile = await readProfile(token)
  await clearGallery()
  await clearRoutine(token)
  browser = await launchBrowser()
  await run(browser)
} catch (error) {
  session.fail(error)
} finally {
  await restore().catch(error => session.fail(error))
  if (browser) await browser.close().catch(() => {})
  try {
    const token = await loginApi('groomer@email.com')
    const profile = await readProfile(token)
    check(
      'restauração da conta de demonstração',
      profile.attendance_rules === originalProfile?.attendance_rules
        && JSON.stringify(profile.area) === JSON.stringify(originalProfile?.area)
        && (profile.photo_id ?? null) === (originalProfile?.photo_id ?? null)
        && profile.gallery.map(photo => photo.id).join(',') === (originalProfile?.gallery ?? []).map(photo => photo.id).join(',')
        && JSON.stringify(profile.services) === JSON.stringify(originalProfile?.services)
        && JSON.stringify(profile.schedule) === JSON.stringify(originalProfile?.schedule),
      JSON.stringify({
        rules: profile.attendance_rules,
        expectedRules: originalProfile?.attendance_rules,
        area: profile.area,
        expectedArea: originalProfile?.area,
        photo: profile.photo_id,
        expectedPhoto: originalProfile?.photo_id,
        gallery: profile.gallery.length,
        days: profile.schedule.length,
        expectedDays: originalProfile?.schedule.length,
        services: profile.services.map(service => `${service.name}:${service.price}`),
        expectedServices: originalProfile?.services.map(service => `${service.name}:${service.price}`),
      }),
    )
  } catch (error) {
    session.fail(error)
  }
  await pool.end()
  await session.finish()
}
