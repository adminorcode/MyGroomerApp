import { evidenceFile, gateRoute, launchBrowser, loginTutor, openPage, saveScreenshot, startRun } from './harness.mjs'

const plan = '027-mistura-acolhedora-editorial'
const run = startRun({
  command: 'node --import ./e2e/preload.mjs e2e/mix-38-conversao-profissional.mjs',
  evidence: evidenceFile(plan, 'mix-38-conversao-profissional.log'),
})
const { check } = run
const shot = (page, name) => saveScreenshot(page, evidenceFile(plan, `ui-review/${name}.png`))

// Nenhum envio bem-sucedido: a conta de teste viraria groomer no seed. Envios de erro e carregamento são abortados antes da API.
const REGISTER = '**/api/v1/providers/register'
const CTA_PINK = 'rgb(198, 72, 120)' // action.primary (R1)
const WHITE = 'rgb(255, 255, 255)' // onAction.primary
const TEAL_SUBTLE = 'rgb(233, 243, 242)' // surface.tealSubtle (convite, R3)
const TEXT_PRIMARY = 'rgb(37, 61, 66)' // text.primary sobre tealSubtle (R5)
const BORDER = 'rgb(217, 224, 225)' // border.default
const ERROR = 'rgb(179, 38, 30)' // feedback.error
const FAIL_MESSAGE = 'Não foi possível concluir o cadastro de groomer. Tente novamente.'

const visible = locator => locator.filter({ visible: true })
const button = (page, name) => page.getByRole('button', { name, exact: true })
const field = (page, name) => page.getByRole('textbox', { name, exact: true })
const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
const ratio = (foreground, background) => {
  const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}

async function styleOf(locator) {
  return locator.evaluate(el => {
    const cs = getComputedStyle(el)
    return { color: cs.color, fontSize: cs.fontSize, background: cs.backgroundColor, radius: cs.borderRadius, border: cs.borderTopWidth, borderColor: cs.borderTopColor, minHeight: cs.minHeight }
  })
}

async function openConversion(page) {
  await loginTutor(page)
  await button(page, 'Abrir perfil').click()
  await button(page, 'Quero ser groomer').click()
  await button(page, 'Cadastrar como groomer').waitFor({ timeout: 20000 })
}

async function fillBank(page) {
  await button(page, 'Banco').click()
  await field(page, 'Número da conta').fill('12345-6')
  await field(page, 'Nome do titular').fill('Tutor de Teste')
  await field(page, 'Código do banco').fill('001')
  await field(page, 'Área de atendimento').fill('São Paulo, Pinheiros')
}

let browser
try {
  browser = await launchBrowser()

  // --- Conversão (tela 38): estrutura e cores ---
  const page = await openPage(browser)
  await openConversion(page)

  const invite = visible(page.getByText('Ofereça seus serviços', { exact: true }))
  const inviteCard = invite.locator('xpath=../..') // card = pai do bloco de texto
  const inviteCardStyle = await styleOf(inviteCard)
  const inviteTitleStyle = await styleOf(invite)
  check('AC-03 R3 bloco de convite em tealSubtle', inviteCardStyle.background === TEAL_SUBTLE, JSON.stringify(inviteCardStyle))
  check('AC-04 texto do convite é text.primary sobre tealSubtle (R5)', inviteTitleStyle.color === TEXT_PRIMARY && ratio(inviteTitleStyle.color, TEAL_SUBTLE) >= 4.5, JSON.stringify(inviteTitleStyle))
  check('AC-07 destaque do convite com raio 20', inviteCardStyle.radius === '20px', inviteCardStyle.radius)
  check('CMP-04 ilustração do convite presente', await visible(page.getByTestId('artwork-professional')).count() === 1)
  await shot(page, 'conversao-profissional-topo')

  // R1: opção selecionada em rosa; opção não selecionada em contorno neutro.
  const money = visible(button(page, 'Dinheiro móvel'))
  const bank = visible(button(page, 'Banco'))
  const moneyStyle = await styleOf(money)
  const moneyText = await styleOf(money.getByText('Dinheiro móvel', { exact: true }))
  check('AC-02 R1 opção selecionada em action.primary', moneyStyle.background === CTA_PINK, JSON.stringify(moneyStyle))
  check('AC-04 texto da opção selecionada é branco sobre rosa', moneyText.color === WHITE && ratio(moneyText.color, CTA_PINK) >= 4.5, JSON.stringify(moneyText))
  const bankStyle = await styleOf(bank)
  check('R1 opção não selecionada sem preenchimento rosa', bankStyle.background === 'rgba(0, 0, 0, 0)' && bankStyle.borderColor === BORDER, JSON.stringify(bankStyle))

  await bank.click()
  const bankSelected = await styleOf(visible(button(page, 'Banco')))
  const moneyAfter = await styleOf(visible(button(page, 'Dinheiro móvel')))
  check('R1 Banco selecionado em action.primary', bankSelected.background === CTA_PINK, JSON.stringify(bankSelected))
  check('R1 Dinheiro móvel volta a não selecionado', moneyAfter.background === 'rgba(0, 0, 0, 0)', JSON.stringify(moneyAfter))

  // Campos com raio 12 e altura 40.
  const accountStyle = await field(page, 'Número da conta').evaluate(el => ({ radius: getComputedStyle(el).borderRadius, minHeight: getComputedStyle(el).minHeight }))
  check('AC-07 campo com raio 12 e altura 40', accountStyle.radius === '12px' && accountStyle.minHeight === '40px', JSON.stringify(accountStyle))

  // CTA: action.primary, botão 16 pt e altura 40.
  const submit = visible(button(page, 'Cadastrar como groomer'))
  const submitStyle = await styleOf(submit)
  check('AC-02 CTA Cadastrar como groomer é action.primary', submitStyle.background === CTA_PINK, JSON.stringify(submitStyle))
  check('AC-07 botão com raio 16 e altura 40', submitStyle.radius === '16px' && submitStyle.minHeight === '40px', `${submitStyle.radius} ${submitStyle.minHeight}`)

  // Validação visível com texto e cor de erro (sem envio: campos vazios).
  await submit.click()
  const accountError = visible(page.getByText('O número da conta é obrigatório', { exact: true }))
  await accountError.waitFor({ timeout: 10000 })
  check('AC-08 erro de validação aparece com texto', await accountError.count() === 1)
  const errorStyle = await styleOf(accountError)
  check('AC-08 erro de validação usa feedback.error', errorStyle.color === ERROR, JSON.stringify(errorStyle))
  await shot(page, 'conversao-profissional')

  // --- Carregando (tela 38): botão ocupado e bloqueado durante o envio ---
  // O envio é atrasado e depois abortado: gateRoute continuaria a requisição e registraria o groomer no seed.
  const loading = await openPage(browser)
  await loading.route(REGISTER, async route => {
    await new Promise(resolve => setTimeout(resolve, 2500))
    await route.abort()
  })
  await openConversion(loading)
  await fillBank(loading)
  loading.on('dialog', dialog => { void dialog.accept() })
  const busy = visible(button(loading, 'Cadastrar como groomer'))
  await busy.click()
  await loading.waitForTimeout(400)
  check('AC-08 CTA sinaliza carregamento com aria-busy', (await busy.getAttribute('aria-busy')) === 'true')
  check('AC-08 CTA bloqueado enquanto envia', await busy.isDisabled())
  await shot(loading, 'conversao-profissional-carregando')
  // A falha aparece na própria tela, em alerta com texto, junto do CTA.
  await visible(loading.getByText(FAIL_MESSAGE, { exact: true })).waitFor({ timeout: 20000 })
  check('AC-08 envio com falha informa o erro com texto', await loading.getByRole('alert').filter({ hasText: FAIL_MESSAGE }).count() === 1)

  // --- Erro (tela 38): falha de rede no envio, sem registro ---
  const failing = await openPage(browser)
  const gate = { fail: true, delayMs: 0 }
  await gateRoute(failing, REGISTER, gate)
  await openConversion(failing)
  await fillBank(failing)
  failing.on('dialog', dialog => { void dialog.accept() })
  await button(failing, 'Cadastrar como groomer').click()
  await visible(failing.getByText(FAIL_MESSAGE, { exact: true })).waitFor({ timeout: 20000 })
  check('AC-08 falha no envio mostra mensagem com texto', await failing.getByRole('alert').filter({ hasText: FAIL_MESSAGE }).count() === 1)
  check('AC-08 o CTA volta a ficar disponível após o erro', await button(failing, 'Cadastrar como groomer').isEnabled())
  check('AC-08 dados preenchidos são mantidos após o erro', await field(failing, 'Número da conta').inputValue() === '12345-6')
  await shot(failing, 'conversao-profissional-erro')
} catch (error) {
  run.fail(error)
} finally {
  await run.finish(browser)
}
