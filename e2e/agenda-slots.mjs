import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { evidenceFile, fillServiceAddress, launchBrowser, openPage, loginTutor, gateRoute, startRun } from './harness.mjs'

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
require(path.join(apiRoot, 'node_modules/dotenv')).config({ path: path.join(apiRoot, '.env'), quiet: true })
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const run = startRun({ command: 'node e2e/agenda-slots.mjs', evidence: evidenceFile('008-agenda-slots', 'agenda-slots.log') })
const { check } = run
const base = 'http://127.0.0.1:3000/api/v1'
const providerId = randomUUID(), tutorId = randomUUID(), professionalId = randomUUID(), offerId = randomUUID()
const suffix = randomUUID()
const tutorEmail = `slots-ui-${suffix}@mygroomer.test`, providerEmail = `slots-pro-${suffix}@mygroomer.test`
const professionalName = 'Profissional de horários e cuidados pet em domicílio'
let browser, guarded = false, tutorToken, providerToken, smallPet, largePet
const screenshotDir = path.dirname(evidenceFile('008-agenda-slots', 'ui-review/mobile.png'))
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const addDays = (date, days) => { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0,10) }
const emptyDate = addDays(today, 1), openDate = addDays(today, 2)
const dayLabel = date => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00Z`))
const clock = iso => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
async function request(route, method='GET', body, token=tutorToken) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) })
  const raw = await response.text()
  const result = raw ? JSON.parse(raw) : {}
  if (!response.ok) throw new Error(`${method} ${route}: ${response.status} ${JSON.stringify(result)}`)
  return result
}
const available = pet => request(`/bookings/slots?provider_service_id=${offerId}&pet_id=${pet.id}&date=${openDate}`)
async function capture(page, name, locator) {
  if (locator) await locator.scrollIntoViewIfNeeded()
  await page.screenshot({ path: path.join(screenshotDir, `${name}.png`) })
}
async function openBooking(page) {
  await loginTutor(page, { email: tutorEmail, password: 'admin' })
  await page.getByRole('button', { name: 'Buscar um serviço' }).click()
  await fillServiceAddress(page, 'Avenida Paulista, São Paulo')
  if (!await page.getByRole('radio', { name: 'Banho, selecionado' }).count()) await page.getByRole('radio', { name: 'Banho', exact: true }).click()
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await page.getByRole('button', { name: new RegExp(professionalName) }).click()
  await page.getByRole('radio', { name: /^Banho, A partir de/ }).click()
  await page.getByRole('button', { name: 'Agendar serviço', exact: true }).click()
  await page.getByText('Escolha um horário', { exact: true }).waitFor()
}
async function setup() {
  const db = new URL(process.env.DATABASE_URL)
  if (process.env.LOCAL_TEST_MODE !== 'true' || !['localhost','127.0.0.1','[::1]'].includes(db.hostname) || db.pathname !== '/mygroomer_dev') throw new Error('Recusando banco fora do ambiente local')
  guarded = true
  for (const [id, email, name, source] of [[tutorId,tutorEmail,'Tutor horários','tutor@email.com'],[professionalId,providerEmail,professionalName,'groomer@email.com']]) {
    await pool.query(`INSERT INTO users(id,name,email,password,role,email_verified_at,phone_number,address)
      SELECT $1,$2,$3,password,role,NOW(),phone_number,address FROM users WHERE email=$4`, [id,name,email,source])
  }
  await pool.query(`INSERT INTO providers(id,user_id,is_verified,base_address,base_latitude,base_longitude,radius_km,travel_gap_minutes,manual_fit)
    SELECT $1,$2,true,base_address,base_latitude,base_longitude,radius_km,30,false FROM providers WHERE id='10000000-0000-4000-8000-000000000003'`,[providerId,professionalId])
  await pool.query(`INSERT INTO provider_professional_types(provider_id,professional_type_id)
    SELECT $1,professional_type_id FROM provider_professional_types WHERE provider_id='10000000-0000-4000-8000-000000000003'`,[providerId])
  await pool.query(`INSERT INTO provider_services(id,provider_id,service_id,price,is_active,professional_type_id,description,price_small,price_medium,price_large,duration_small_minutes,duration_medium_minutes,duration_large_minutes)
    SELECT $1,$2,service_id,80,true,professional_type_id,'Banho para teste de horários',80,100,120,60,90,120 FROM provider_services WHERE id='10000000-0000-4000-8000-000000000010'`,[offerId,providerId])
  tutorToken = (await request('/auth/login','POST',{email:tutorEmail,password:'admin'},null)).token
  providerToken = (await request('/auth/login','POST',{email:providerEmail,password:'admin'},null)).token
  const days = Object.fromEntries(['mon','tue','wed','thu','fri','sat','sun'].map(key => [key,{enabled:true,start:'09:00',end:'18:00',break_start:'12:00',break_end:'13:00'}]))
  const key = ['sun','mon','tue','wed','thu','fri','sat'][new Date(`${emptyDate}T12:00:00Z`).getUTCDay()]
  days[key] = {enabled:false,start:null,end:null,break_start:null,break_end:null}
  await request('/providers/weekly-availability','PUT',{days,travel_gap_minutes:30,manual_fit:false},providerToken)
  smallPet = (await request('/pets','POST',{name:'Luna horários',species:'dog',breed:'SRD',size:'small',age_years:3})).data
  largePet = (await request('/pets','POST',{name:'Thor horários',species:'dog',breed:'SRD',size:'large',age_years:4})).data
  mkdirSync(screenshotDir,{recursive:true})
}
async function execute() {
  await setup()
  browser = await launchBrowser()
  const recovery = await openPage(browser)
  const serviceGate = {fail:true,delayMs:0}
  await gateRoute(recovery,new RegExp(`/api/v1/providers/${offerId}$`),serviceGate)
  await openBooking(recovery)
  await recovery.getByText('Não foi possível carregar este serviço.',{exact:true}).waitFor()
  check('AC-03 erro de serviço mantém voltar e recuperação',await recovery.getByRole('button',{name:'Voltar',exact:true}).isEnabled())
  serviceGate.fail=false
  serviceGate.delayMs=1500
  await recovery.getByRole('button',{name:'Tentar novamente',exact:true}).click()
  await recovery.getByText('Carregando serviço',{exact:true}).waitFor()
  await capture(recovery,'service-loading')
  await recovery.getByLabel(`Profissional: ${professionalName}`,{exact:true}).waitFor()
  await recovery.context().close()
  const emptyPets = await openPage(browser)
  await emptyPets.route('**/api/v1/pets',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:[]})}))
  await openBooking(emptyPets)
  await emptyPets.getByText('Você ainda não cadastrou um pet.',{exact:true}).waitFor()
  check('AC-03 sem pets oferece cadastro e bloqueia envio',await emptyPets.getByRole('button',{name:'Cadastrar pet',exact:true}).isEnabled() && await emptyPets.getByRole('button',{name:'Criar agendamento de teste',exact:true}).isDisabled())
  await capture(emptyPets,'no-pets')
  await emptyPets.context().close()
  const page = await openPage(browser)
  const gate = {fail:false,delayMs:0}
  await gateRoute(page,'**/api/v1/bookings/slots?**',gate)
  await openBooking(page)
  const create = page.getByRole('button',{name:'Criar agendamento de teste'})
  check('AC-02 sem pet e slot não envia',await create.isDisabled())
  await page.getByRole('radio',{name:dayLabel(openDate),exact:true}).click()
  gate.delayMs = 1800
  await page.getByRole('radio',{name:/^Luna horários/}).click()
  await page.getByText('Buscando horários…',{exact:true}).waitFor()
  check('AC-02 carregamento parcial mantém o local da busca',await page.getByLabel('Local do atendimento: Avenida Paulista, São Paulo').isVisible())
  await capture(page,'loading',page.getByText('Buscando horários…',{exact:true}))
  gate.delayMs = 0
  await page.getByRole('button',{name:'09:00',exact:true}).waitFor()
  const expected = (await available(smallPet)).data
  check('AC-02 API usa duração do porte pequeno',expected.duration_minutes === 60)
  check('AC-02 grade contém somente slots da API',JSON.stringify(await page.getByRole('button',{name:/^\d\d:\d\d$/}).allTextContents()) === JSON.stringify(expected.slots.map(clock)))
  await page.getByRole('button',{name:'09:00',exact:true}).click()
  check('AC-03 contexto mostra profissional serviço e pet', await page.getByLabel(`Profissional: ${professionalName}`,{exact:true}).count() === 1 && await page.getByLabel('Serviço: Banho',{exact:true}).count() === 1 && await page.getByLabel('Pet: Luna horários',{exact:true}).count() === 1)
  check('AC-02 seleção explícita libera envio',await create.isEnabled())
  await capture(page,'selected-slots',page.getByText('Horários disponíveis',{exact:true}))
  await capture(page,'mobile-context',page.getByText('Escolha um horário',{exact:true}))
  await page.getByRole('button',{name:'Trocar pet',exact:true}).click()
  await page.getByRole('radio',{name:/^Thor horários/}).click()
  await page.getByText(/Duração: 120 min/).waitFor()
  check('AC-02 trocar porte remove seleção e recalcula',await create.isDisabled() && (await available(largePet)).data.duration_minutes === 120)
  await page.getByRole('radio',{name:dayLabel(emptyDate),exact:true}).click()
  await page.getByText('Nenhum horário disponível',{exact:true}).waitFor()
  check('AC-02 dia desligado vazio e CTA desabilitado',await create.isDisabled())
  await capture(page,'empty',page.getByText('Nenhum horário disponível',{exact:true}))
  gate.fail = true
  await page.getByRole('radio',{name:dayLabel(openDate),exact:true}).click()
  await page.getByRole('button',{name:'Atualizar horários',exact:true}).waitFor()
  check('AC-02 erro tem recuperação e não permite enviar',await create.isDisabled())
  await capture(page,'network-error',page.getByRole('button',{name:'Atualizar horários',exact:true}))
  gate.fail = false
  await page.getByRole('button',{name:'Atualizar horários',exact:true}).click()
  await page.getByText(/Duração: 120 min/).waitFor()
  await page.getByRole('button',{name:'Trocar pet',exact:true}).click()
  await page.getByRole('radio',{name:/^Luna horários/}).click()
  await page.getByText(/Duração: 60 min/).waitFor()
  const first = (await available(smallPet)).data.slots[0]
  const block = (await request('/providers/agenda-blocks','POST',{starts_at:first,ends_at:new Date(new Date(first).getTime()+60*60000).toISOString()},providerToken)).data
  await page.getByRole('radio',{name:dayLabel(emptyDate),exact:true}).click()
  await page.getByText('Nenhum horário disponível',{exact:true}).waitFor()
  await page.getByRole('radio',{name:dayLabel(openDate),exact:true}).click()
  await page.getByText(/Duração: 60 min/).waitFor()
  check('AC-01 intervalo bloqueado some da grade',await page.getByRole('button',{name:clock(first),exact:true}).count() === 0)
  await request(`/providers/agenda-blocks/${block.id}`,'DELETE',undefined,providerToken)
  await page.getByRole('radio',{name:dayLabel(emptyDate),exact:true}).click()
  await page.getByText('Nenhum horário disponível',{exact:true}).waitFor()
  await page.getByRole('radio',{name:dayLabel(openDate),exact:true}).click()
  await page.getByText(/Duração: 60 min/).waitFor()
  const next = (await available(smallPet)).data.slots.find(iso => clock(iso) !== clock(first))
  await page.getByRole('button',{name:clock(next),exact:true}).click()
  const conflict = (await request('/providers/agenda-blocks','POST',{starts_at:next,ends_at:new Date(new Date(next).getTime()+60*60000).toISOString()},providerToken)).data
  const submission = {fail:false,delayMs:1200}
  await gateRoute(page,'**/api/v1/bookings',submission)
  let posts = 0
  page.on('request',request=>{if(request.method()==='POST' && request.url().endsWith('/bookings')) posts++})
  const responseWait = page.waitForResponse(response=>response.request().method()==='POST' && response.url().endsWith('/bookings'))
  await create.click()
  await page.getByText('Enviando agendamento…',{exact:true}).waitFor()
  check('AC-05 envio pendente desabilita repetição',await create.isDisabled())
  const refused = await responseWait
  await page.getByRole('alert').waitFor()
  check('AC-04 conflito real recebe 409 e mantém formulário',refused.status() === 409 && await create.isDisabled() && await page.getByLabel('Local do atendimento: Avenida Paulista, São Paulo').isVisible())
  check('AC-05 um único POST no envio',posts===1)
  await capture(page,'conflict',page.getByRole('alert'))
  await request(`/providers/agenda-blocks/${conflict.id}`,'DELETE',undefined,providerToken)
  await page.getByRole('radio',{name:dayLabel(emptyDate),exact:true}).click()
  await page.getByText('Nenhum horário disponível',{exact:true}).waitFor()
  await page.getByRole('radio',{name:dayLabel(openDate),exact:true}).click()
  await page.getByText(/Duração: 60 min/).waitFor()
  await page.setViewportSize({width:320,height:844})
  await page.getByRole('button',{name:clock(first),exact:true}).click()
  await capture(page,'narrow-320',page.getByText('Horários disponíveis',{exact:true}))
  check('AC-02 janela estreita sem overflow horizontal',await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth))
  const dimensions = await page.getByRole('button',{name:clock(first),exact:true}).boundingBox()
  check('AC-02 horário tem alvo de toque >=48',dimensions.width>=48 && dimensions.height>=48)
  const ratio = await page.getByRole('button',{name:clock(first),exact:true}).evaluate(element=>{
    const ink = getComputedStyle(element.querySelector('[dir]') ?? element).color.match(/\d+/g).map(Number)
    const bg = getComputedStyle(element).backgroundColor.match(/\d+/g).map(Number)
    const lum = rgb=>rgb.slice(0,3).map(n=>{n/=255;return n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4}).reduce((sum,n,i)=>sum+n*[0.2126,0.7152,0.0722][i],0)
    const a=lum(ink),b=lum(bg);return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)
  })
  check('AC-02 contraste do horário selecionado >=4.5',ratio>=4.5,`ratio=${ratio}`)
  await page.setViewportSize({width:1440,height:900})
  await capture(page,'desktop',page.getByText('Horários disponíveis',{exact:true}))
  check('AC-03 desktop mantém contexto e envio',await create.isEnabled())
  submission.delayMs=0
  const createdWait = page.waitForResponse(response=>response.request().method()==='POST' && response.url().endsWith('/bookings'))
  await create.click()
  const createdResponse = await createdWait
  const createdBody = await createdResponse.json()
  await page.getByText('Detalhe do agendamento',{exact:true}).waitFor({timeout:15000})
  check('AC-04 sucesso cria reserva real e abre detalhe',createdResponse.status()===201 && !!createdBody.data.booking.id)
  await capture(page,'created')
  await page.context().close()
}
try { await execute() } catch(error) { run.fail(error) } finally {
  if(browser) await browser.close()
  try {
    if(guarded) {
      await pool.query('DELETE FROM bookings WHERE provider_service_id=$1',[offerId])
      await pool.query('DELETE FROM pets WHERE owner_id=$1',[tutorId])
      await pool.query('DELETE FROM provider_services WHERE provider_id=$1',[providerId])
      await pool.query('DELETE FROM providers WHERE id=$1',[providerId])
      await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[[tutorId,professionalId]])
    }
  } catch(error) { run.fail(error) }
  await pool.end()
  await run.finish()
}
