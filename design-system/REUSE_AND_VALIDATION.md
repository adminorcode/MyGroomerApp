# Reuso e validação a partir de Quem atende

Revisão de 08/11/2026. Complementa as seções 7, 8 e 19 de `MY_GROOMER_DESIGN_SYSTEM_v1.0.md`. O usuário definiu Quem atende como referência mais avançada de estética/UX e pediu que seus elementos úteis sejam reaproveitáveis, especialmente as pílulas de filtros e as ações de cards.

Esta revisão define regras e contratos a implementar; **não afirma que os componentes propostos abaixo já existem**. Consultar os arquivos e exports antes de usar uma API. A extração/migração de componentes ainda exige implementação, testes e revisão visual próprios. Não copiar toda a tela como template: seu header está em planejamento separado.

## Direção visual

Interface de serviços pet para tutor/profissional, acolhedora, clara e compacta, com Pink & Teal, Inter, superfícies claras e ações evidentes. Manter a hierarquia e os comportamentos úteis da busca, com geometria centralizada em componentes. Compactar o visual não reduz a área de toque adotada pelo projeto: pelo menos 48×48 pt para ações/acionadores; textos e controles podem crescer com conteúdo e escala de fonte.

## Elementos a reutilizar

| Elemento | Base existente | Contrato desejado / alcance | Estado |
| --- | --- | --- | --- |
| Ação explícita de card | `MGButton`; Ver perfil em `GroomerSearchCard` | Tamanho/forma nomeados: altura mínima48, cápsula, padding horizontal16, tipografia button, largura intrínseca quando couber. Variantes mantêm a semântica. | Estender MGButton; tamanho/forma ainda não são props implementadas. |
| Área de ações do card | Rodapés de GroomerSearchCard, RequestCard, ServiceEditorCard | Uma ação alinhada ao final; duas com hierarquia; reflow/empilhamento em largura curta; espaço estável no loading. | Extrair pattern de composição; nome sugerido `CardActions`. |
| Pílula que abre opções | `Pill` local em TutorSearchScreen | Label compacto, ícone opcional, contador, caret, aberto e aplicado separados. Papel de botão de expansão. | Extrair primitiva; nome sugerido `MGFilterTrigger`. MGChip não oferece esse contrato hoje. |
| Painel de filtros | Shell/rodapé de SearchFilterPanel | Superfície, título, conteúdo, ações e comportamento de confirmação comuns; campos/regras de domínio ficam na feature. | Extrair shell/pattern; nome sugerido `FilterPanel`. |
| Escolha em formato chip | MGChip e `Choice` local | Consolidar seleção simples/múltipla, check, estado, disabled e rótulo longo; papel acessível conforme seleção. | Evoluir MGChip; `variant` declarada hoje não é aplicada pelo componente. |
| Linha de seleção | `RadioRow` local, seleção de serviços no perfil | Ícone/rádio, título, descrição, pressed e checked; grupo identifica seleção única. | Compor primitiva de grupo/linha; nome sugerido `MGRadioGroup`. Não presumir implementação só porque consta no guia. |
| Linha com interruptor | SearchFilterPanel, AddressFormScreen, WeeklyAvailabilityScreen/Editor | Label e ajuda, alvo inteiro quando apropriado, uma única parada de foco, checked/disabled e acionamento consistente. | Extrair `MGSwitchRow`; escolher implementação por plataforma sem replicar tracks por tela. |
| Badge com ícone | MGBadge e `Badge` local em GroomerSearchCard | Mesmos tons/ícones, forma cápsula e texto que pode quebrar. Badge informativo não é botão. | Estender MGBadge; não criar outra biblioteca de badges. |
| Favorito/ação só com ícone | MGIconButton, favorito local | Alvo48, estados ativo/inativo/pending/disabled, feedback e nome acessível. | Evoluir MGIconButton; domínio/persistência de favorito ficam na feature. |
| Retrato e fallback | MGAvatar | Reusar circle/rounded já existentes; retrato na descoberta, círculo onde fizer sentido para conta/pet. | Já compartilhado; faltam presets nomeados caso medidas se repitam. |
| Categorias de serviço | CategoryTile da Home e CategoryTile local da busca | Mesmo mapa semântico de ícones e família visual; variantes de atalho de navegação e seleção compacta. | Unificar pattern, preservando o comportamento de cada contexto. |
| Abas de conteúdo | TabButton local e RequestGroupTabs | Contrato comum de tabs; variantes underline e segmented têm usos distintos. Não substituir a navegação inferior por tabs de conteúdo. | Extrair contrato compartilhado; nome sugerido `MGContentTabs`. |
| Campo de busca compacto | MGTextField, busca em TutorSearch | Reusar campo existente; geometria de busca centralizada e label acessível mesmo sem label visual. | Estender aparência/tamanho do campo quando necessário, sem sobrescrever foco por tela. |
| Ajuda/estado parcial | Hint local, estados de loading/erro/vazio existentes | Texto/ícone de apoio com contraste, progresso na parte que carrega e retry no local afetado. | Reusar estados MG existentes; extrair hint apenas com consumidores reais. |

A matriz é de reuso, não um pedido de migração geral imediata. Implementar primeiro os contratos usados na tarefa em andamento; novas telas e alterações desses elementos devem adotar o contrato compartilhado já disponível.

## Regras de criação

**RUV-01 — Verificar antes de criar.** Para cada necessidade, apontar o componente/pattern existente, suas props reais e a lacuna específica. Estender variantes/tamanhos/estados existentes antes de criar outro componente equivalente. A documentação deve distinguir implementado, proposto e legado.

**RUV-02 — Centralizar identidade.** Cor, tipografia, altura, padding, raio e sombra repetidos pertencem a tokens/receitas do componente. Telas podem ajustar disposição, largura e margens do contexto; não devem recriar a aparência do botão, chip ou badge com `style`. Não adicionar props sem efeito só para satisfazer o guia.

**RUV-03 — Ações de cards.** O padrão de ação explícita usa a geometria de Ver perfil. A principal é rosa com texto branco; alternativas usam secondary/tertiary; exclusão/recusa/cancelamento destrutivo mantém a variante semântica e a confirmação pertinente. Uma decisão tem uma ação principal. Não tornar todas as ações rosas nem adicionar um botão em cards cuja única interação já é navegação pela área inteira. Não aninhar ações independentes em um card inteiro clicável.

**RUV-04 — Reflow das ações.** Uma ação curta pode ter largura intrínseca. Com duas ações ou rótulos longos, empilhar ou ocupar a largura disponível quando não couberem. Aumentar altura para texto ampliado. Loading não altera largura de forma abrupta, não perde o nome acessível e bloqueia acionamento repetido; pending de uma decisão bloqueia ações concorrentes incompatíveis.

**RUV-05 — Pílulas de expansão.** Separar `expanded` (painel aberto) de `active`/contador (seleção aplicada). Caret acompanha abertura; estado aplicado permanece perceptível com o painel fechado, incluindo informação acessível. O acionador controla um painel identificado. Na web, testar `aria-expanded` no DOM e a relação com o painel — declarar props no JSX não prova que chegaram ao navegador. A regra do projeto inclui identificar o painel controlado, embora ARIA trate `aria-controls` como opcional para disclosure.

**RUV-06 — Forma de apresentação correta.** Os filtros atuais expandem conteúdo no fluxo abaixo da faixa de acionadores; não são um menu de ações nem um autocomplete. Preservar isso como primeira implementação reutilizável. Popover/sheet só quando o contexto exigir e com contrato próprio de foco, fechamento e teclado. Não atribuir role menu a um formulário de filtros. Autocomplete continua com combobox/listbox ligado ao campo, conforme a regra já existente.

**RUV-07 — Confirmação explícita quando necessária.** Painéis com múltiplos campos usam rascunho: Aplicar confirma; Cancelar/fechar/trocar descarta; Limpar altera o rascunho até Aplicar. A UI aplicada fica intacta enquanto se edita. Uma seleção rápida de status/horário pode continuar imediata quando essa é sua tarefa: compartilhar aparência não exige copiar a política de confirmação da busca. Não confundir ordenar resultados com excluir resultados.

**RUV-08 — Semântica de seleção.** Radio para uma opção de grupo, checkbox/toggle para múltiplas escolhas, switch para ligar/desligar, tab para alternar conteúdo e botão para abrir/acionar. Não escolher o papel pela forma arredondada. Um switch tem um único controle focável; ícone/track decorativo não gera outro input oculto. Preservar alternativas por campo/preset quando existir arrasto essencial.

**RUV-09 — Informações nos cards.** Reusar MGBadge, MGAvatar, MGIcon/MGIconButton e formatação monetária/data existentes. Disponibilidade, nota, cobertura e verificação continuam vindo do domínio. Só apresentar um novo `MetaRow`/`PriceBlock` compartilhado quando houver repetição real; não embutir regras de preço/avaliação em primitivas visuais.

**RUV-10 — Extração com consumidores.** Para um padrão novo, registrar ao menos dois consumidores concretos ou a ausência real de equivalente para uma primitiva necessária. Extrair a estrutura, não os nomes/categorias/limites da busca. O componente aceita conteúdo/composição de forma simples; a feature conserva endpoints, cache, filtros e mutações. Não criar um componente gigante com dezenas de flags de negócio.

**RUV-11 — Referência não é aprovação integral.** Quem atende orienta os elementos identificados. Sua aprovação visual anterior não comprova todos os estados de um novo componente nem comportamento nativo. Lacunas encontradas na promoção precisam ser corrigidas; não copiar defeitos porque o donor está aprovado. O header global segue `Plans/028-explorar-groomers-servicos/HEADER-PLAN.md` e não é congelado por este padrão.

**RUV-12 — Adoção incremental e rastreável.** Primeiro centralizar a receita e migrar Quem atende para consumi-la; depois migrar os consumidores escolhidos por família. O PR/plano lista todos os consumidores alterados, exemplos antes/depois e contratos preservados. Não migrar todo o app como efeito incidental de uma mudança pequena.

## Regras de validação

Continuam obrigatórias as skills ui-e2e e ui-review, com harness, um spec por vez, logs e capturas da revisão atual. Esta matriz define o que acrescentar ao promover um elemento; não cria um runner paralelo.

| ID | O que observar | Evidência necessária |
| --- | --- | --- |
| RV-01 | Componente disponível, props com efeito e export/catalog coerentes | leitura do contrato real + showcase de suas variantes; props previstas não contam como implementadas |
| RV-02 | Identidade única para a mesma variante; sem override de cor/forma por consumidor | revisão dos consumidores e comparação renderizada no showcase e telas |
| RV-03 | Default, pressed/focus, selected/expanded/active, loading e disabled conforme aplicabilidade | interação real, não só screenshot default; explicar cada estado não aplicável |
| RV-04 | Alvo efetivo48 e controles adjacentes sem sobreposição; visual compacto preservado | bounding boxes após estabilizar transições + toque nas bordas; hitSlop isolado não é prova |
| RV-05 | Nome, papel, checked/pressed/selected/expanded e relação com conteúdo realmente expostos | asserts no DOM/árvore acessível; não apenas busca textual ou inspeção do JSX |
| RV-06 | Enter/Space acionam; Tab é lógico; tabs de conteúdo têm navegação por setas; Escape/foco obedecem ao modo de apresentação | execução por teclado; foco retorna ao acionador quando uma ação remove o painel e não há novo destino lógico |
| RV-07 | Rascunho/aplicar/limpar/cancelar e abertura de outro painel | conjunto aplicado e campos observados antes/depois; não inferir efeito por fechamento visual |
| RV-08 | Reflow, nomes/textos longos e texto ampliado; estados carregando/erro/foto ausente e preço/endereço longos | 320/390/1440 no web + capturas de topo/ações quando o conteúdo exigir scroll; escala de texto aplicável à plataforma |
| RV-09 | Contraste com o fundo de cada estado, inclusive rosa selecionado, pressed e disabled aplicável | medição da composição renderizada; cores isoladas no token não bastam |
| RV-10 | Callbacks/rota/mutação únicos, loading estável e sem ações aninhadas conflitantes | teste da ação real de cada consumidor; snapshot visual não comprova navegação ou persistência |
| RV-11 | Regressão da primitiva e dos consumidores realmente migrados | spec do componente em showcase + specs de fluxos afetados, com logs separados e API/fixtures identificadas |
| RV-12 | Evidência corresponde ao conteúdo atual e à plataforma declarada | snapshot/hash do conjunto, UI-REVIEW atualizado, revisão de código e checks pertinentes. Web não comprova iOS/Android ou leitores nativos |

Antes de aprovar uma extração, o relatório lista consumidores, variantes, estados, tamanhos, plataformas, limitações e achados resolvidos. O teste do componente complementa, não substitui, o fluxo real. Reprovar duplicação de aparência, props ignoradas, controles inacessíveis ou estados silenciosos mesmo com typecheck verde.

## Ordem sugerida de implementação

1. Evoluir MGButton e sua área de ações; migrar Ver perfil e exemplos de uma/duas ações no showcase.
2. Extrair trigger/painel de filtros e consolidar Choice/RadioRow com os controles corretos; resolver semântica/foco antes da promoção.
3. Consolidar badges, ação por ícone e switch de linha com os consumidores já identificados.
4. Unificar categorias/abas/campo de busca conforme houver trabalho nesses fluxos; preservar variantes intencionais.
O header global segue seu plano separado e pode consumir os contratos consolidados conforme necessário; não depende de migrar todo o app nem de implementar todos os candidatos desta matriz. Sua validação não se confunde com a aprovação dos filtros.

Não há mudança de runtime nesta revisão documental. A análise e evidências observadas estão em `Plans/028-explorar-groomers-servicos/REUSE-ANALYSIS.md`.

## Referências de comportamento web

- [WAI-ARIA: disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/): botão de expansão, Enter/Space, estado expanded; relação controls opcional no padrão e exigida pelo contrato do projeto.
- [WAI-ARIA: tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/): seleção, painel associado e teclado de abas.
- [WAI-ARIA: button](https://www.w3.org/WAI/ARIA/apg/patterns/button/): ativação, estados e foco conforme o efeito da ação.
