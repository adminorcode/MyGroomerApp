import { createRequire } from 'node:module'
import path from 'node:path'
import { evidenceFile, gateRoute, launchBrowser, loginProfessional, loginTutor, openPage, startRun } from './harness.mjs'
import { activeText, assertLayoutInWindow, capture, captureScroll, fit, plan } from './visual-helpers.mjs'

const run = startRun({ command: 'node --import ./e2e/preload.mjs e2e/visual-secondary-screens.mjs', evidence: evidenceFile(plan, 'visual-secondary-screens.log') })
const { check } = run
const require = createRequire(import.meta.url)
const { Pool } = require(path.resolve('../API/node_modules/pg'))
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const message = `Teste visual de conversa ${Date.now()}`
let browser
try {
  browser = await launchBrowser()
  const tutor = await openPage(browser)
  await loginTutor(tutor)
  await tutor.getByRole('button', { name: 'Abrir perfil', exact: true }).click()
  await tutor.getByRole('button', { name: 'Meus pets', exact: true }).waitFor()
  check('VIS-06 perfil tutor mantém ações reais', await tutor.getByRole('button', { name: 'Endereços', exact: true }).isVisible())
  await fit(tutor, check, 'secondary-profile-tutor')
  await tutor.getByRole('button', { name: 'Quero ser groomer', exact: true }).click()
  await tutor.getByRole('button', { name: 'Cadastrar como groomer', exact: true }).waitFor()
  await fit(tutor, check, 'secondary-conversion', { scroll: true })
  await tutor.getByRole('button', { name: 'Banco', exact: true }).click()
  check('VIS-06 conversão mantém campos bancários condicionais', await tutor.getByRole('textbox', { name: 'Código do banco', exact: true }).isVisible())
  await capture(tutor, 'secondary-conversion-bank')
  await tutor.getByRole('button', { name: 'Voltar', exact: true }).click()
  await tutor.getByRole('button', { name: 'Design System', exact: true }).click()
  await activeText(tutor, 'Tipografia').waitFor()
  await captureScroll(tutor, 'secondary-showcase-390')
  await tutor.getByRole('button', { name: 'Filtro', exact: true }).click()
  await tutor.getByRole('button', { name: 'Filtro', exact: true }).evaluate(el => new Promise(resolve => { const poll = () => el.getAttribute('aria-selected') === 'false' ? resolve() : requestAnimationFrame(poll); poll() }))
  check('VIS-01 showcase exercita componentes reais', await tutor.getByRole('button', { name: 'Filtro', exact: true }).getAttribute('aria-selected') === 'false')
  await tutor.getByRole('textbox', { name: 'Nome do pet', exact: true }).fill('Nome bastante comprido para conferir a leitura no componente')
  await fit(tutor, check, 'secondary-showcase', { scroll: true })
  await tutor.getByRole('button', { name: 'Voltar', exact: true }).click()
  await tutor.getByRole('tab', { name: 'Mensagens', exact: true }).click()
  await tutor.getByRole('button', { name: 'Conversa com Groomer de Teste', exact: true }).waitFor()
  await fit(tutor, check, 'secondary-conversations-tutor')
  await tutor.getByRole('button', { name: 'Conversa com Groomer de Teste', exact: true }).click()
  await tutor.getByRole('textbox', { name: 'Mensagem', exact: true }).waitFor()
  await activeText(tutor, 'Ola! Esta conversa usa dados de demonstracao.').waitFor()
  const send = tutor.getByRole('button', { name: 'Enviar mensagem', exact: true })
  check('VIS-06 mensagem vazia não pode ser enviada', await send.isDisabled())
  await fit(tutor, check, 'secondary-chat-tutor')
  await tutor.getByRole('textbox', { name: 'Mensagem', exact: true }).fill(message)
  await send.waitFor({ state: 'visible' })
  await send.click({ timeout: 20000 })
  await activeText(tutor, message).waitFor({ timeout: 15000 })
  check('VIS-06 envio real mantém conteúdo e limpa campo', await tutor.getByRole('textbox', { name: 'Mensagem', exact: true }).inputValue() === '')
  await capture(tutor, 'secondary-chat-sent')

  const professional = await openPage(browser)
  await loginProfessional(professional)
  await professional.getByRole('button', { name: 'Abrir perfil', exact: true }).click()
  await professional.getByRole('button', { name: 'Perfil público', exact: true }).waitFor()
  check('VIS-06 perfil profissional preserva identidade e permissões', await activeText(professional, 'Profissional').isVisible() && await professional.getByRole('button', { name: 'Meus pets', exact: true }).count() === 0)
  await fit(professional, check, 'secondary-profile-professional')
  await professional.getByRole('tab', { name: 'Mensagens', exact: true }).click()
  await professional.getByRole('button', { name: 'Conversa com Tutor de Teste', exact: true }).waitFor()
  check('VIS-08 conversa profissional compõe com AS03 e AS18', await professional.getByTestId('artwork-cat').locator('img').evaluate(el => el.complete && el.naturalWidth > 0))
  await fit(professional, check, 'secondary-conversations-professional')
  await professional.getByRole('button', { name: 'Conversa com Tutor de Teste', exact: true }).click()
  await activeText(professional, message).waitFor()
  check('VIS-06 mensagem enviada aparece para o destinatário real', await activeText(professional, message).isVisible())
  await fit(professional, check, 'secondary-chat-professional')

  const failure = await openPage(browser)
  const gate = { fail: true, delayMs: 0 }
  await gateRoute(failure, '**/api/v1/conversations', gate)
  await loginTutor(failure)
  await failure.getByRole('tab', { name: 'Mensagens', exact: true }).click()
  await activeText(failure, 'Não foi possível carregar as conversas.').waitFor({ timeout: 20000 })
  await capture(failure, 'secondary-conversations-error')
  gate.fail = false
  gate.delayMs = 1000
  await failure.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await failure.getByLabel('Carregando conversas', { exact: true }).waitFor()
  check('VIS-07 conversas recuperam erro com carregamento visível', await failure.getByLabel('Carregando conversas', { exact: true }).isVisible())
  await failure.getByRole('button', { name: 'Conversa com Groomer de Teste', exact: true }).waitFor()
  await failure.route('**/api/v1/conversations/*/messages*', route => route.fulfill({ json: { data: [] } }))
  await failure.getByRole('button', { name: 'Conversa com Groomer de Teste', exact: true }).click()
  await activeText(failure, 'Nenhuma mensagem ainda. Diga olá!').waitFor()
  check('VIS-07 conversa vazia orienta próxima ação', await failure.getByRole('textbox', { name: 'Mensagem', exact: true }).isEnabled())
  await capture(failure, 'secondary-chat-empty')

  await pool.query("UPDATE users SET name=$1 WHERE id=$2", ['Tutor com um nome muito extenso para conferir a leitura e as quebras da interface', '10000000-0000-4000-8000-000000000001'])
  const largeText = await openPage(browser)
  await largeText.setViewportSize({ width: 320, height: 844 })
  await loginTutor(largeText)
  await largeText.getByRole('button', { name: 'Abrir perfil', exact: true }).click()
  await largeText.getByRole('button', { name: 'Sair', exact: true }).waitFor()
  await largeText.evaluate(() => {
    for (const node of document.querySelectorAll('div')) {
      if (node.closest('[aria-hidden="true"]') || ![...node.childNodes].some(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim())) continue
      const css = getComputedStyle(node)
      node.style.fontSize = `${parseFloat(css.fontSize) * 1.3}px`
      node.style.lineHeight = `${parseFloat(css.lineHeight) * 1.3 || parseFloat(css.fontSize) * 1.6}px`
    }
  })
  check('VIS-07 nome longo e texto ampliado mantêm controles dentro da área útil', await assertLayoutInWindow(largeText))
  await captureScroll(largeText, 'secondary-profile-large-text-320')
  await largeText.getByRole('button', { name: 'Sair', exact: true }).scrollIntoViewIfNeeded()
  check('VIS-07 saída permanece alcançável após rolagem com texto ampliado', await largeText.getByRole('button', { name: 'Sair', exact: true }).isVisible())
} catch (error) { run.fail(error) }
finally {
  await pool.query('UPDATE users SET name=$1 WHERE id=$2', ['Tutor de Teste', '10000000-0000-4000-8000-000000000001']).catch(error => run.fail(error))
  await pool.query('DELETE FROM messages WHERE content=$1 AND sender_id=$2', [message, '10000000-0000-4000-8000-000000000001']).catch(error => run.fail(error))
  await pool.end()
  await run.finish(browser)
}
