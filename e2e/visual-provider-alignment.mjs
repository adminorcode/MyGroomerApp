import path from 'node:path'
import { createRequire } from 'node:module'
import { inspectRenderedText } from './visual-audit.mjs'
import { assertLayoutInWindow, captureScroll } from './visual-helpers.mjs'
import {
  evidenceFile, gateRoute, launchBrowser, loginProfessional, openPage,
  saveScreenshot, startRun,
} from './harness.mjs'

const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/visual-provider-alignment.mjs',
  evidence: evidenceFile('022-screen-reference-alignment', 'visual-provider-alignment.log'),
})
const { check } = run
const shots = evidenceFile('022-screen-reference-alignment', 'ui-review')
const visible = page => page.locator(':not([aria-hidden="true"] *)')
const text = (page, value) => page.getByText(value, { exact: true }).and(visible(page))
const require = createRequire(import.meta.url)
const { Pool } = require(path.resolve('../API/node_modules/pg'))
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const pendingBooking = '10000000-0000-4000-8000-000000000020'
let browser, originalPet, originalGap

async function tab(page, name) {
  await page.getByRole('tab', { name, exact: true }).or(page.getByRole('button', { name, exact: true })).first().click()
}

async function sizes(page, name, anchor) {
  for (const [label, width, height] of [['mobile', 390, 844], ['narrow', 320, 844], ['desktop', 1440, 900]]) {
    await page.setViewportSize({ width, height })
    await anchor.waitFor({ timeout: 20000 })
    await page.waitForTimeout(350)
    const bounds = await anchor.boundingBox()
    if (name === 'availability') {
      check(`VIS-07 nome do dia e estado completos em ${label}`, await text(page, 'Segunda-feira').evaluate(el => el.scrollWidth <= el.clientWidth + 1) && await text(page, 'Dia ativo').evaluate(el => el.scrollWidth <= el.clientWidth + 1))
    }
    check(`VIS-07 ${name} ${label}`, !!bounds && bounds.x >= 0 && bounds.x + bounds.width <= width + 1 && await assertLayoutInWindow(page),
      'A tarefa permanece dentro da largura disponível')
    await saveScreenshot(page, path.join(shots, `provider-${name}-${label}.png`))
    if (label === 'mobile' && !name.includes('sheet')) await captureScroll(page, `provider-${name}-mobile-complete`)
  }
  await page.setViewportSize({ width: 390, height: 844 })
}

async function checkArtwork(page) {
  const illustration = page.getByTestId('artwork-professional').and(visible(page))
  await illustration.waitFor()
  const image = illustration.locator('img')
  await image.waitFor({ state: 'attached' })
  await image.evaluate(el => el.decode().catch(() => {}))
  const loaded = await image.evaluate(el => el.complete && el.naturalWidth > 0)
  const contains = await illustration.evaluate(el => [...el.querySelectorAll('div')].some(node => getComputedStyle(node).backgroundSize === 'contain'))
  check('VIS-08 AS-04 carregado sem distorção', loaded && contains)
}

async function openPublicProfile(page) {
  await page.getByRole('button', { name: 'Abrir perfil', exact: true }).click()
  await page.getByRole('button', { name: 'Perfil público', exact: true }).click()
  await page.getByRole('button', { name: 'Visualizar como tutor', exact: true }).waitFor({ timeout: 20000 })
}

try {
  originalGap = (await pool.query("SELECT travel_gap_minutes FROM providers WHERE id='10000000-0000-4000-8000-000000000003'")).rows[0].travel_gap_minutes
  await pool.query("UPDATE providers SET travel_gap_minutes=30 WHERE id='10000000-0000-4000-8000-000000000003'")
  originalPet = (await pool.query('SELECT pet_id FROM bookings WHERE id=$1', [pendingBooking])).rows[0].pet_id
  await pool.query('UPDATE bookings SET pet_id=$1 WHERE id=$2', ['10000000-0000-4000-8000-000000000060', pendingBooking])
  browser = await launchBrowser()
  const page = await openPage(browser)
  await loginProfessional(page)
  await sizes(page, 'agenda', text(page, 'Agenda do groomer'))
  await page.getByRole('button', { name: 'Bloquear horário', exact: true }).click()
  const confirmBlock = page.getByRole('button', { name: 'Confirmar bloqueio', exact: true })
  await confirmBlock.waitFor()
  check('VIS-05 bloqueio inválido fica desabilitado', await confirmBlock.isDisabled())
  check('VIS-05 bloqueio não cria motivo de negócio', await page.getByRole('textbox', { name: 'Descrição', exact: true }).count() === 0)
  await page.getByRole('textbox', { name: 'Fim', exact: true }).fill('10:00')
  check('VIS-05 bloqueio válido permite confirmar', await confirmBlock.isEnabled())
  await sizes(page, 'block-sheet', confirmBlock)
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()

  await tab(page, 'Solicitações')
  await page.getByRole('tab', { name: 'Pendentes', exact: true }).waitFor()
  const request = page.getByRole('button', { name: /^Abrir ficha de / }).first()
  await request.waitFor({ timeout: 20000 })
  await sizes(page, 'requests', text(page, 'Solicitações recebidas'))
  await request.click()
  await page.getByRole('group', { name: 'Dados do pet', exact: true }).waitFor({ timeout: 20000 })
  check('VIS-05 ficha mantém anamnese e notas', await page.getByRole('group', { name: 'Anamnese', exact: true }).count() === 1
    && await page.getByRole('group', { name: 'Suas notas', exact: true }).count() === 1)
  await sizes(page, 'request-profile', page.getByRole('heading', { name: 'Ficha do atendimento', exact: true }))
  await page.getByRole('button', { name: 'Ver agendamento', exact: true }).click()
  await text(page, 'Serviço solicitado').waitFor({ timeout: 20000 })
  await sizes(page, 'booking-detail', page.getByRole('heading', { name: 'Detalhes do agendamento', exact: true }))
  const slotsGate = { fail: true, delayMs: 0 }
  await gateRoute(page, '**/api/v1/bookings/slots?**', slotsGate)
  await page.getByRole('button', { name: 'Reagendar', exact: true }).click()
  const reschedule = page.getByRole('button', { name: 'Confirmar novo horário', exact: true })
  await reschedule.waitFor()
  await text(page, 'Não foi possível carregar os horários.').waitFor({ timeout: 20000 })
  await saveScreenshot(page, path.join(shots, 'provider-reschedule-error.png'))
  slotsGate.fail = false
  slotsGate.delayMs = 1200
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await page.getByRole('progressbar', { name: 'Carregando horários disponíveis', exact: true }).waitFor()
  check('VIS-07 reagendamento recupera erro com espera visível', await reschedule.isDisabled())
  await saveScreenshot(page, path.join(shots, 'provider-reschedule-loading.png'))
  await page.getByRole('progressbar', { name: 'Carregando horários disponíveis', exact: true }).waitFor({ state: 'hidden', timeout: 15000 })
  check('VIS-07 reagendamento recebe grade real ou estado vazio', await page.getByRole('button', { name: /^\d\d:\d\d$/ }).count() > 0 || await text(page, 'Nenhum horário livre neste dia.').count() === 1)
  slotsGate.delayMs = 0
  check('VIS-05 reagendamento exige slot selecionado', await reschedule.isDisabled())
  check('VIS-05 reagendamento não aceita hora arbitrária', await page.getByRole('textbox', { name: 'Horário', exact: true }).count() === 0)
  await sizes(page, 'reschedule-sheet', reschedule)
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()

  await tab(page, 'Rendimentos')
  await text(page, 'Total recebido').waitFor({ timeout: 20000 })
  check('VIS-06 rendimentos preserva Pendente', await text(page, 'Pendente').count() === 1 && await text(page, 'Disponível').count() === 0)
  await sizes(page, 'earnings', text(page, 'Rendimentos').first())

  await openPublicProfile(page)
  await sizes(page, 'public-profile', page.getByRole('button', { name: 'Visualizar como tutor', exact: true }))
  check('VIS-08 AS-06 decorativo presente', await page.getByTestId('artwork-paw-decoration').and(visible(page)).count() === 1)
  await text(page, 'Avenida Paulista, São Paulo').scrollIntoViewIfNeeded()
  const addressContrast = (await inspectRenderedText(page)).measured.find(item => item.text === 'Avenida Paulista, São Paulo')
  check('VIS-07 endereço do perfil sobre teal atende AA', !!addressContrast && addressContrast.contrast >= 4.5, JSON.stringify(addressContrast))
  await saveScreenshot(page, path.join(shots, 'provider-public-profile-area-contrast.png'))
  await page.getByRole('button', { name: 'Editar serviços', exact: true }).click()
  await page.getByRole('button', { name: 'Editar Banho', exact: true }).waitFor({ timeout: 20000 })
  await checkArtwork(page)
  await sizes(page, 'service-menu', text(page, 'Serviços e preços').first())
  await page.getByRole('button', { name: 'Editar Banho', exact: true }).click()
  await page.getByRole('textbox', { name: 'Preço pequeno', exact: true }).waitFor()
  check('VIS-05 editor mantém preço e duração por porte', await page.getByRole('textbox', { name: /^Preço / }).count() === 3
    && await page.getByRole('textbox', { name: /^Duração / }).count() === 3)
  await sizes(page, 'offer-editor', text(page, 'Banho').first())
  await page.getByRole('button', { name: 'Concluir', exact: true }).click()
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.getByRole('button', { name: 'Editar área', exact: true }).click()
  await page.getByRole('combobox', { name: 'Endereço-base', exact: true }).waitFor({ timeout: 20000 })
  await checkArtwork(page)
  await sizes(page, 'service-location', text(page, 'Área de atendimento').first())
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.getByRole('button', { name: 'Editar horários', exact: true }).click()
  await page.getByRole('switch', { name: 'Encaixe manual', exact: true }).waitFor({ timeout: 20000 })
  await checkArtwork(page)
  await sizes(page, 'availability', text(page, 'Horários de atendimento').first())
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await page.getByRole('button', { name: 'Visualizar como tutor', exact: true }).click()
  const booking = page.getByRole('button', { name: 'Agendar serviço', exact: true })
  await booking.waitFor({ timeout: 20000 })
  check('VIS-05 prévia somente leitura', await booking.isDisabled()
    && await page.getByRole('button', { name: 'Editar serviços', exact: true }).count() === 0
    && await page.getByRole('button', { name: 'Adicionar fotos', exact: true }).count() === 0)
  await sizes(page, 'public-preview', booking)

  const states = await openPage(browser)
  const gate = { fail: false, delayMs: 1500 }
  await gateRoute(states, '**/api/v1/providers/me/public-profile', gate)
  await loginProfessional(states)
  await states.getByRole('button', { name: 'Abrir perfil', exact: true }).click()
  await states.getByRole('button', { name: 'Perfil público', exact: true }).click()
  await text(states, 'Carregando perfil').waitFor()
  check('VIS-07 perfil anuncia carregando', await text(states, 'Carregando perfil').isVisible())
  await saveScreenshot(states, path.join(shots, 'provider-profile-loading.png'))
  await states.getByRole('button', { name: 'Visualizar como tutor', exact: true }).waitFor({ timeout: 20000 })
  await states.context().close()
  const errorPage = await openPage(browser)
  const errorGate = { fail: true, delayMs: 0 }
  await gateRoute(errorPage, '**/api/v1/providers/me/public-profile', errorGate)
  await loginProfessional(errorPage)
  await errorPage.getByRole('button', { name: 'Abrir perfil', exact: true }).click()
  await errorPage.getByRole('button', { name: 'Perfil público', exact: true }).click()
  await errorPage.getByRole('button', { name: 'Tentar novamente', exact: true }).waitFor({ timeout: 30000 })
  check('VIS-07 perfil erro recuperável', await errorPage.getByRole('button', { name: 'Tentar novamente', exact: true }).isVisible())
  await saveScreenshot(errorPage, path.join(shots, 'provider-profile-error.png'))
  errorGate.fail = false
  await errorPage.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await errorPage.getByRole('button', { name: 'Visualizar como tutor', exact: true }).waitFor({ timeout: 20000 })
  check('VIS-07 perfil recuperado', await errorPage.getByRole('button', { name: 'Visualizar como tutor', exact: true }).isVisible())
} catch (error) {
  run.fail(error)
} finally {
  if (originalGap !== undefined) await pool.query("UPDATE providers SET travel_gap_minutes=$1 WHERE id='10000000-0000-4000-8000-000000000003'", [originalGap]).catch(error => run.fail(error))
  if (originalPet !== undefined) await pool.query('UPDATE bookings SET pet_id=$1 WHERE id=$2', [originalPet, pendingBooking]).catch(error => run.fail(error))
  await pool.end()
  await run.finish(browser)
}
