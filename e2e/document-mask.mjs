import path from 'node:path'
import { mkdirSync } from 'node:fs'
import { evidenceFile, launchBrowser, openPage, openRegistrationWelcome, startRun } from './harness.mjs'

const run = startRun({ command: 'node e2e/document-mask.mjs', evidence: evidenceFile('010-groomer-registration/document-mask', 'document-mask.log') })
const shots = path.dirname(evidenceFile('010-groomer-registration/document-mask', 'ui-review/placeholder'))
mkdirSync(shots, { recursive: true })
const { check } = run
let browser
let page
const field = name => page.getByRole('textbox', { name, exact: true })
const button = name => page.getByRole('button', { name, exact: true })
const capture = name => page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true })
async function placeCaret(position) {
  await field('CPF / CNPJ').evaluate((el, caret) => { el.focus(); el.setSelectionRange(caret, caret); el.dispatchEvent(new Event('select', { bubbles: true })) }, position)
}
async function valueIs(expected) {
  await page.waitForFunction(({ expected }) => document.querySelector('input[aria-label="CPF / CNPJ"]')?.value === expected, { expected })
  return await field('CPF / CNPJ').inputValue() === expected
}

try {
  browser = await launchBrowser()
  page = await openPage(browser)
  await openRegistrationWelcome(page)
  await button('Sou profissional').click()
  await field('CPF / CNPJ').waitFor()
  await field('CPF / CNPJ').pressSequentially('52998224725', { delay: 20 })
  check('DM-01 CPF ganha pontos e hífen ao digitar', await valueIs('529.982.247-25'))
  await capture('01-cpf-mobile')
  await field('CPF / CNPJ').press('0')
  check('DM-02 décimo segundo dígito troca para CNPJ', await valueIs('52.998.224/7250'))
  await field('CPF / CNPJ').press('Backspace')
  check('DM-02 voltar para onze dígitos restaura CPF', await valueIs('529.982.247-25'))
  await field('CPF / CNPJ').fill('11222333000181')
  check('DM-02 CNPJ colado sem máscara é formatado', await valueIs('11.222.333/0001-81'))
  await field('CPF / CNPJ').fill('11.222.333/0001-81')
  check('DM-03 colar CNPJ com máscara não duplica pontuação', await valueIs('11.222.333/0001-81'))
  await capture('02-cnpj-mobile')
  await field('CPF / CNPJ').fill('112223330001819999')
  check('DM-05 limite de quatorze dígitos', await valueIs('11.222.333/0001-81'))
  await field('CPF / CNPJ').fill('abc529.982.247-25')
  check('DM-03 caracteres não numéricos são removidos', await valueIs('529.982.247-25'))
  await placeCaret(4)
  await field('CPF / CNPJ').press('8')
  check('DM-03 inserção no meio troca máscara sem perder dígitos', await valueIs('52.989.822/4725'))
  const digitCaret = await field('CPF / CNPJ').evaluate(el => el.value.slice(0, el.selectionStart).replace(/\D/g, '').length)
  check('DM-03 cursor permanece junto ao dígito editado', digitCaret === 4)
  await field('CPF / CNPJ').press('Backspace')
  check('DM-03 apagar inserção restaura CPF', await valueIs('529.982.247-25'))
  await field('CPF / CNPJ').fill('12345678909')
  await placeCaret(4)
  await field('CPF / CNPJ').press('Backspace')
  check('DM-03 Backspace sobre ponto apaga dígito sem travar', await valueIs('124.567.890-9'))
  await field('CPF / CNPJ').fill('12345678909')
  await placeCaret(3)
  await field('CPF / CNPJ').press('Delete')
  check('DM-03 Delete sobre ponto apaga o próximo dígito', await valueIs('123.567.890-9'))
  await field('CPF / CNPJ').press('ControlOrMeta+A')
  await field('CPF / CNPJ').press('Backspace')
  check('DM-03 seleção total permite limpar o campo', await valueIs(''))
  await field('CPF / CNPJ').fill('11222333000181')
  await button('Salvar e sair').click()
  await button('Sou profissional').waitFor()
  await openRegistrationWelcome(page)
  await button('Sou profissional').click()
  check('DM-04 rascunho recuperado mantém a máscara', await valueIs('11.222.333/0001-81'))
  await field('Nome completo').fill('Profissional Máscara')
  await field('Telefone').fill('(11) 98765-4321')
  await field('E-mail').fill('document-mask@mygroomer.test')
  await field('Experiência').fill('Atendimento domiciliar há cinco anos.')
  await field('Certificações').fill('Curso profissional de banho e tosa.')
  await field('Senha').fill('LocalTest#2026')
  await page.getByRole('checkbox', { name: 'Groomer', exact: true }).click()
  let sent
  await page.route('**/auth/register', async route => {
    sent = route.request().postDataJSON()
    await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Envio simulado para conferir a máscara.' }) })
  })
  await button('Continuar').click()
  await page.getByText('Envio simulado para conferir a máscara.', { exact: true }).waitFor()
  check('DM-04 API recebe somente quatorze números', sent?.registration.document === '11222333000181')
  await page.setViewportSize({ width: 1440, height: 900 })
  await field('CPF / CNPJ').scrollIntoViewIfNeeded()
  await capture('03-cnpj-desktop')
  await page.setViewportSize({ width: 320, height: 760 })
  await field('CPF / CNPJ').scrollIntoViewIfNeeded()
  await capture('04-cnpj-narrow')
  check('DM-05 documento completo cabe em320', await field('CPF / CNPJ').evaluate(el => el.scrollWidth <= el.clientWidth + 1))
} catch (error) {
  if (page && !page.isClosed()) await capture('failure').catch(() => {})
  run.fail(error)
} finally { await run.finish(browser) }
