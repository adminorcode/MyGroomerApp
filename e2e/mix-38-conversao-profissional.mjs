import { evidenceFile, launchBrowser, loginTutor, openPage, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-38-conversao-profissional.mjs',
  evidence: evidenceFile(plan, 'mix-38-conversao-profissional.log'),
})
const { check } = run

let browser
try {
  browser = await launchBrowser()
  const page = await openPage(browser)
  await loginTutor(page)
  await page.getByRole('button', { name: 'Abrir perfil', exact: true }).click()
  await page.getByRole('button', { name: 'Meus pets', exact: true }).waitFor({ timeout: 20000 })
  check('AC-01 o perfil do tutor não oferece Quero ser groomer', await page.getByRole('button', { name: 'Quero ser groomer', exact: true }).count() === 0)
  check('AC-01 o perfil do tutor mantém pets e endereços', await page.getByRole('button', { name: 'Endereços', exact: true }).isVisible())
  await page.context().close()
} finally {
  await browser?.close().catch(() => {})
  await run.finish()
}
