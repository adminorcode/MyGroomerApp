import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { evidenceFile, fillServiceAddress, gateRoute, launchBrowser, loginProfessional, loginTutor, openPage, startRun } from './harness.mjs'
import { activeText, capture, fit, navigateRegistered, plan } from './visual-helpers.mjs'

const run = startRun({ command: 'node --import ./e2e/preload.mjs e2e/visual-discovery-alignment.mjs', evidence: evidenceFile(plan, 'visual-discovery-alignment.log') })
const { check } = run
const require = createRequire(import.meta.url)
const { Pool } = require(path.resolve('../API/node_modules/pg'))
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const professionalId = randomUUID(), providerId = randomUUID(), offerId = randomUUID()
const professionalName = 'Profissional visual em domicílio'
const email = `visual-discovery-${professionalId}@mygroomer.test`
const api = 'http://127.0.0.1:3000/api/v1'
const date = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
const dateLabel = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00Z`))
let browser, guarded = false
async function request(route, method, body, token) {
  const response = await fetch(api + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
  const result = await response.json()
  if (!response.ok) throw new Error(`${method} ${route}: ${response.status}`)
  return result
}
try {
  guarded = new URL(process.env.DATABASE_URL).pathname === '/mygroomer_e2e'
  if (!guarded) throw new Error('Banco não é e2e')
  await pool.query(`INSERT INTO users(id,name,email,password,role,email_verified_at,phone_number,address) SELECT $1,$2,$3,password,role,NOW(),phone_number,address FROM users WHERE email='groomer@email.com'`, [professionalId, professionalName, email])
  await pool.query(`INSERT INTO providers(id,user_id,is_verified,base_address,base_latitude,base_longitude,radius_km,travel_gap_minutes,manual_fit) SELECT $1,$2,false,base_address,base_latitude,base_longitude,radius_km,30,false FROM providers WHERE id='10000000-0000-4000-8000-000000000003'`, [providerId, professionalId])
  await pool.query(`INSERT INTO provider_professional_types(provider_id,professional_type_id) SELECT $1,professional_type_id FROM provider_professional_types WHERE provider_id='10000000-0000-4000-8000-000000000003'`, [providerId])
  await pool.query(`INSERT INTO provider_services(id,provider_id,service_id,price,is_active,professional_type_id,description,price_small,price_medium,price_large,duration_small_minutes,duration_medium_minutes,duration_large_minutes) SELECT $1,$2,service_id,80,true,professional_type_id,'Banho para revisão visual',80,100,120,60,90,120 FROM provider_services WHERE id='10000000-0000-4000-8000-000000000010'`, [offerId, providerId])
  const token = (await request('/auth/login', 'POST', { email, password: 'admin' })).token
  const days = Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(key => [key, { enabled: true, start: '09:00', end: '18:00', break_start: '12:00', break_end: '13:00' }]))
  await request('/providers/weekly-availability', 'PUT', { days, travel_gap_minutes: 30, manual_fit: false }, token)
  browser = await launchBrowser()
  const page = await openPage(browser)
  await loginTutor(page)
  await page.getByRole('button', { name: 'Buscar um serviço', exact: true }).click()
  await fillServiceAddress(page, 'Avenida Paulista, São Paulo')
  await page.getByRole('radio', { name: 'Banho', exact: true }).click()
  const gate = { fail: true, delayMs: 0 }
  await gateRoute(page, '**/api/v1/providers/coverage**', gate)
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).waitFor({ timeout: 20000 })
  await capture(page, 'discovery-search-error')
  gate.fail = false; gate.delayMs = 1000
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await page.getByLabel('Buscando groomers', { exact: true }).waitFor()
  check('VIS-07 busca recupera erro sem bloquear o endereço', await page.getByRole('combobox', { name: 'Endereço do atendimento', exact: true }).isEnabled())
  const professional = page.getByRole('button', { name: new RegExp(professionalName) })
  await professional.waitFor({ timeout: 15000 })
  gate.delayMs = 0
  await fit(page, check, 'discovery-search', { scroll: true })
  await professional.click()
  await page.getByRole('button', { name: 'Agendar serviço', exact: true }).waitFor()
  check('VIS-03 perfil real exige serviço antes de agendar', await page.getByRole('button', { name: 'Agendar serviço', exact: true }).isDisabled())
  await fit(page, check, 'discovery-profile', { scroll: true })
  await page.getByRole('radio', { name: /^Banho, A partir de/ }).click()
  await page.getByRole('radio', { name: /^Banho, selecionado/, checked: true }).waitFor()
  check('VIS-07 serviço anuncia a seleção no perfil', await page.getByRole('radio', { name: /^Banho, selecionado/, checked: true }).count() === 1)
  await page.getByRole('button', { name: 'Agendar serviço', exact: true }).click()
  await activeText(page, 'Escolha um horário').waitFor()
  await page.getByRole('radio', { name: dateLabel, exact: true }).click()
  const pet = page.getByRole('radio', { name: /^Josefino/ })
  if (await pet.count()) await pet.click()
  await page.getByRole('button', { name: '09:00', exact: true }).waitFor()
  check('VIS-04 seleção depende de slot real', await page.getByRole('button', { name: 'Revisar solicitação', exact: true }).isDisabled())
  await page.getByRole('button', { name: '09:00', exact: true }).click()
  await fit(page, check, 'discovery-time', { scroll: true })
  await page.getByRole('button', { name: 'Revisar solicitação', exact: true }).click()
  await activeText(page, 'Resumo do agendamento').waitFor()
  await page.getByLabel('Pet: Josefino', { exact: true }).and(page.locator(':not([aria-hidden="true"] *)')).waitFor()
  await page.getByLabel('Local: Avenida Paulista, São Paulo', { exact: true }).and(page.locator(':not([aria-hidden="true"] *)')).waitFor()
  check('VIS-04 resumo mantém preço do pet e endereço reais', await page.getByLabel('Pet: Josefino', { exact: true }).and(page.locator(':not([aria-hidden="true"] *)')).count() === 1 && await page.getByLabel('Local: Avenida Paulista, São Paulo', { exact: true }).and(page.locator(':not([aria-hidden="true"] *)')).count() === 1)
  await fit(page, check, 'discovery-summary', { scroll: true })
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await navigateRegistered(page, 'ServiceProviders', { serviceId: '10000000-0000-4000-8000-000000000005', serviceName: 'Banho' })
  await page.getByRole('button', { name: /Groomer de Teste/ }).waitFor()
  await fit(page, check, 'discovery-legacy-providers')

  const provider = await openPage(browser)
  await loginProfessional(provider)
  await provider.getByRole('tab', { name: 'Serviços', exact: true }).click()
  await provider.getByRole('button', { name: 'Editar Banho', exact: true }).waitFor()
  await provider.getByRole('button', { name: 'Voltar', exact: true }).click()
  await provider.getByRole('textbox', { name: 'CPF / CNPJ', exact: true }).waitFor()
  check('VIS-05 cadastro profissional autenticado conserva conta e campos', await provider.getByRole('textbox', { name: 'Nome completo', exact: true }).isVisible())
  await fit(provider, check, 'discovery-professional-registration', { scroll: true })
} catch (error) { run.fail(error) }
finally {
  if (guarded) {
    await pool.query('DELETE FROM provider_services WHERE provider_id=$1', [providerId]).catch(error => run.fail(error))
    await pool.query('DELETE FROM providers WHERE id=$1', [providerId]).catch(error => run.fail(error))
    await pool.query('DELETE FROM users WHERE id=$1', [professionalId]).catch(error => run.fail(error))
  }
  await pool.end()
  await run.finish(browser)
}
