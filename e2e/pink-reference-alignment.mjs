import { evidenceFile, launchBrowser, loginTutor, openLogin, openPage, saveScreenshot, startRun } from './harness.mjs'
import { inspectRenderedText } from './visual-audit.mjs'

const plan = '022-screen-reference-alignment'
const run = startRun({ command: 'node --import ./e2e/preload.mjs e2e/pink-reference-alignment.mjs', evidence: evidenceFile(plan, 'pink-reference-alignment.log') })
const { check } = run
const button = (page, name) => page.getByRole('button', { name, exact: true })
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/pink-${name}.png`))
const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}
async function pair(control, label) {
  const background = await control.evaluate(el => getComputedStyle(el).backgroundColor)
  const foreground = await control.getByText(label, { exact: true }).evaluate(el => getComputedStyle(el).color)
  return { foreground, background, contrast: ratio(foreground, background) }
}
let browser
try {
  browser = await launchBrowser()
  const page = await openPage(browser)
  await openLogin(page)
  const enter = button(page, 'Entrar')
  let colors = await pair(enter, 'Entrar')
  check('PA-01 CTA usa o rosa #D95786 da referência A01', colors.background === 'rgb(217, 87, 134)', JSON.stringify(colors))
  check('PA-02 texto normal sobre rosa mantém contraste AA', colors.contrast >= 4.5, JSON.stringify(colors))
  await shot(page, 'login')

  await enter.hover()
  await page.mouse.down()
  await page.waitForTimeout(80)
  colors = await pair(enter, 'Entrar')
  check('PA-02 pressed real usa o rosa claro previsto', colors.background === 'rgb(220, 98, 141)', JSON.stringify(colors))
  check('PA-02 texto no pressed mantém contraste AA', colors.contrast >= 4.5, JSON.stringify(colors))
  await shot(page, 'pressed')
  await page.mouse.move(1, 1)
  await page.mouse.up()

  await button(page, 'Não tem uma conta? Cadastre-se').click()
  const tutor = button(page, 'Sou tutor')
  colors = await pair(tutor, 'Sou tutor')
  check('PA-01 boas-vindas usa o mesmo rosa de referência', colors.background === 'rgb(217, 87, 134)', JSON.stringify(colors))
  const outline = button(page, 'Sou profissional')
  const outlineColor = await outline.getByText('Sou profissional', { exact: true }).evaluate(el => getComputedStyle(el).color)
  check('PA-02 outline usa rosa de texto separado e legível', outlineColor === 'rgb(198, 38, 105)' && ratio(outlineColor, 'rgb(249, 248, 246)') >= 4.5, outlineColor)
  await shot(page, 'welcome')

  const authenticated = await openPage(browser)
  await loginTutor(authenticated)
  const tab = authenticated.getByRole('tab', { name: /Início/ })
  const tabColor = await tab.getByText('Início', { exact: true }).evaluate(el => getComputedStyle(el).color)
  check('PA-02 label de navegação usa rosa de texto', tabColor === 'rgb(198, 38, 105)', tabColor)
  await button(authenticated, 'Abrir perfil').click()
  await button(authenticated, 'Design System').click()
  const primary = button(authenticated, 'Primário')
  await primary.scrollIntoViewIfNeeded()
  colors = await pair(primary, 'Primário')
  check('PA-01 componente compartilhado mantém fill de referência', colors.background === 'rgb(217, 87, 134)', JSON.stringify(colors))
  const disabledButton = button(authenticated, 'Desabilitado').and(authenticated.locator('[aria-busy]'))
  check('PA-02 disabled e loading preservam bloqueio semântico', await disabledButton.isDisabled() && await button(authenticated, 'Carregando').isDisabled())
  await shot(authenticated, 'components')
  const chip = button(authenticated, 'Filtro')
  await chip.scrollIntoViewIfNeeded()
  colors = await pair(chip, 'Filtro')
  check('PA-02 seleção suave preserva texto AA', colors.background === 'rgb(252, 229, 237)' && colors.contrast >= 4.5, JSON.stringify(colors))
  check('PA-03 componentes visíveis sem candidatos de contraste', (await inspectRenderedText(authenticated)).candidates.length === 0)
  await shot(authenticated, 'selection')
  await chip.hover()
  await authenticated.mouse.down()
  colors = await pair(chip, 'Filtro')
  check('PA-02 chip suave pressionado mantém texto AA sem desvanecer', colors.contrast >= 4.5 && await chip.evaluate(el => getComputedStyle(el).opacity === '1'), JSON.stringify(colors))
  await shot(authenticated, 'selection-pressed')
  await authenticated.mouse.move(1, 1)
  await authenticated.mouse.up()
} catch (error) { run.fail(error) }
finally { await run.finish(browser) }
