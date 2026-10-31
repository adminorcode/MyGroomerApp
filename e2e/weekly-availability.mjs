import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  checkContrast,
  evidenceFile,
  launchBrowser,
  loginProfessional,
  openPage,
  startRun,
} from './harness.mjs'

const require = createRequire(import.meta.url)
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../API')
require(path.join(apiRoot, 'node_modules/dotenv')).config({ path: path.join(apiRoot, '.env'), quiet: true })
const { Pool } = require(path.join(apiRoot, 'node_modules/pg'))

const session = startRun({
  command: 'node e2e/weekly-availability.mjs',
  evidence: evidenceFile('013-weekly-availability', 'weekly-availability.log'),
})
const { check } = session
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const providerId = '10000000-0000-4000-8000-000000000003'
let snapshot

async function capture() {
  const current = await pool.query(
    'SELECT travel_gap_minutes, manual_fit FROM providers WHERE id = $1',
    [providerId],
  )
  snapshot = current.rows[0]
}

async function restore() {
  await pool.query('DELETE FROM provider_manual_appointments WHERE provider_id = $1', [providerId])
  await pool.query('DELETE FROM provider_weekdays WHERE provider_id = $1', [providerId])
  if (!snapshot) return
  await pool.query(
    'UPDATE providers SET travel_gap_minutes = $2, manual_fit = $3 WHERE id = $1',
    [providerId, snapshot.travel_gap_minutes, snapshot.manual_fit],
  )
}

async function openServices(page) {
  const tab = page.getByRole('tab', { name: 'Serviços' })
  const button = page.getByRole('button', { name: 'Serviços', exact: true })
  await tab.or(button).first().waitFor({ timeout: 20000 })
  if (await tab.count()) await tab.click()
  else await button.click()
}

async function disabled(locator) {
  return locator.evaluate(element => element.getAttribute('aria-disabled') === 'true' || element.hasAttribute('disabled'))
}

async function openAvailability(page) {
  await openServices(page)
  await page.getByText('Dados do serviço', { exact: true }).waitFor({ timeout: 20000 })
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Disponibilidade semanal' }).click()
}

async function run() {
  await capture()
  const browser = await launchBrowser()
  const page = await openPage(browser, { viewport: 'mobile' })
  try {
    let mode = 'fail'
    await page.route('**/api/v1/providers/weekly-availability**', async route => {
      const url = route.request().url()
      if (route.request().method() !== 'GET' || url.includes('/slots') || url.includes('/appointments')) {
        return route.continue()
      }
      if (mode === 'fail') return route.abort()
      if (mode === 'delay') await new Promise(resolve => setTimeout(resolve, 1200))
      return route.continue()
    })

    await loginProfessional(page)
    await openAvailability(page)
    await page.getByText('Não foi possível conectar à API. Verifique o servidor e tente novamente.').waitFor({ timeout: 15000 })
    check('erro', true)

    mode = 'delay'
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await page.getByLabel('Carregando').waitFor({ timeout: 5000 })
    check('carregando', true)
    mode = 'pass'
    await page.getByRole('button', { name: 'segunda-feira, desligado' }).waitFor({ timeout: 15000 })
    await checkContrast(page, page.getByText('Disponibilidade', { exact: true }), 'tema claro em 390', check)
    await page.setViewportSize({ width: 1440, height: 900 })
    await checkContrast(page, page.getByText('Disponibilidade', { exact: true }), 'tema claro em 1440', check)
    await page.setViewportSize({ width: 390, height: 844 })

    const review = page.getByRole('button', { name: 'Ir para revisão' })
    const include = page.getByRole('button', { name: 'Incluir atendimento' })
    check('vazio', await page.getByRole('button', { name: 'segunda-feira, desligado' }).isVisible() && !(await disabled(review)) && await page.getByText('Outros dias ativos', { exact: true }).count() === 0)
    await review.click()
    await page.getByText('Escolha de 15 em 15 minutos, até 2 horas.', { exact: true }).waitFor({ timeout: 5000 })

    await page.getByRole('button', { name: 'segunda-feira, desligado' }).click()
    await page.getByRole('textbox', { name: 'Fim de segunda-feira' }).fill('08:00')
    await review.click()
    await page.getByText('O fim de segunda-feira precisa ser depois do início.', { exact: true }).waitFor()
    check('AC-02', await page.getByText('Rotina salva.', { exact: true }).count() === 0, 'fim antes do início não grava')

    await page.getByRole('textbox', { name: 'Fim de segunda-feira' }).fill('13:00')
    await page.getByRole('textbox', { name: 'Início do intervalo de segunda-feira' }).fill('14:00')
    await page.getByRole('textbox', { name: 'Fim do intervalo de segunda-feira' }).fill('15:00')
    await review.click()
    await page.getByText('O intervalo de segunda-feira precisa ficar dentro da jornada.', { exact: true }).waitFor()
    check('AC-02', await page.getByText('Rotina salva.', { exact: true }).count() === 0, 'intervalo fora da jornada não grava')

    await page.getByRole('textbox', { name: 'Início do intervalo de segunda-feira' }).fill('')
    await page.getByRole('textbox', { name: 'Fim do intervalo de segunda-feira' }).fill('')
    await page.getByRole('button', { name: '30 minutos' }).click()
    check('AC-05', !(await disabled(review)), 'rotina válida libera a revisão')
    await review.click()
    await page.getByText('Rotina salva.', { exact: true }).waitFor({ timeout: 15000 })
    await page.getByText('Entre atendimentos: 30 minutos.', { exact: true }).waitFor({ timeout: 15000 })
    check('AC-03', await page.getByRole('button', { name: '30 minutos, selecionado' }).isVisible() && await page.getByRole('button', { name: '120 minutos' }).isVisible(), '30 minutos ficam selecionados e 2 horas está disponível')

    await page.getByRole('button', { name: '15 minutos' }).click()
    await review.click()
    await page.getByText('Entre atendimentos: 15 minutos.', { exact: true }).waitFor({ timeout: 15000 })
    check('AC-03', await page.getByRole('button', { name: '30 minutos, selecionado' }).count() === 0, '15 minutos substitui a seleção de 30')

    await page.getByRole('button', { name: 'segunda-feira, ligado' }).click()
    await review.click()
    await page.getByText('Dia desligado não oferece horário.', { exact: true }).waitFor({ timeout: 15000 })
    check('AC-01', await page.getByRole('button', { name: 'segunda-feira, desligado' }).isVisible(), 'dia desligado não oferece horário')

    await page.getByRole('button', { name: 'segunda-feira, desligado' }).click()
    await page.getByRole('textbox', { name: 'Início de segunda-feira' }).fill('09:00')
    await page.getByRole('textbox', { name: 'Fim de segunda-feira' }).fill('13:00')
    await page.getByRole('button', { name: '30 minutos' }).click()
    check('AC-04', await disabled(include) && await page.getByText('Encaixe manual desligado. Horário fora da rotina não entra.', { exact: true }).isVisible(), 'encaixe desligado recusa a inclusão')
    await page.getByRole('switch', { name: 'Encaixe manual' }).click()
    await review.click()
    await page.getByText('Rotina salva.', { exact: true }).waitFor({ timeout: 15000 })
    await page.getByRole('button', { name: 'Incluir atendimento' }).click()
    await page.getByText('Atendimento incluído.', { exact: true }).waitFor({ timeout: 15000 })
    check('AC-04', true, 'encaixe ligado inclui horário fora da rotina')

    await page.getByRole('button', { name: 'Voltar' }).click()
    await page.getByRole('button', { name: 'Disponibilidade semanal' }).waitFor({ timeout: 15000 })
    check('AC-05', await page.getByText('Local de atendimento', { exact: true }).first().isVisible(), 'voltar abre o local de atendimento')
    await page.getByRole('button', { name: 'Disponibilidade semanal' }).click()
    await page.getByRole('textbox', { name: 'Início de segunda-feira' }).waitFor({ timeout: 15000 })
    const keptStart = await page.getByRole('textbox', { name: 'Início de segunda-feira' }).inputValue()
    const keptSwitch = await page.getByRole('switch', { name: 'Encaixe manual' }).getAttribute('aria-checked')
    const keptGap = await page.getByRole('button', { name: '30 minutos, selecionado' }).count()
    check('AC-05', keptStart === '09:00' && keptSwitch === 'true' && keptGap === 1, `inicio=${keptStart} encaixe=${keptSwitch} gap30=${keptGap}`)
  } finally {
    await page.context().close()
    await browser.close()
  }
}

run()
  .catch(error => session.fail(error))
  .finally(async () => {
    await restore().catch(error => session.fail(error))
    await pool.end()
    await session.finish()
  })
