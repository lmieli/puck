# Pendências da Vitrine

Itens combinados e ainda não feitos. Marque com `[x]` e mova para o README quando entrarem.

## Rastreamento

- [ ] **Validar com IDs reais.** Hoje o Meta Pixel, o Google Analytics, o TikTok e o Pinterest foram testados com IDs de exemplo e as bibliotecas simuladas. Antes de entregar a um cliente: colocar um ID real e conferir no Gerenciador de Eventos do Meta e no Google Tag Assistant (PageView, Lead, conversão do Google Ads).
- [ ] **Meta Conversions API (envio pelo servidor).** Conversão que funciona mesmo com bloqueador de anúncios. Precisa de token por site (guardado com cuidado, só administradores), envio do Lead no servidor quando o contato é gravado, e e-mail e telefone com hash SHA-256. Usar o mesmo `event_id` do pixel para o Meta não contar duas vezes.
- [ ] **Eventos por regra**, como "rolou 75% da página" ou "clicou neste botão específico". Hoje só existem PageView, Lead e clique nos botões principais.

- [ ] **Cliques do WhatsApp no painel Visitas.** Hoje o clique só vai para os pixels. Contar também no painel (por dia e página) mostraria quantas conversas o balão gerou sem depender de Meta ou Google.
- [ ] **Conversão do Google Ads para o clique no WhatsApp.** Precisa de um rótulo de conversão próprio, separado do rótulo do formulário, para não contar em dobro.

## WhatsApp

- [ ] **Horário de atendimento.** Mostrar o balão só no horário comercial, ou trocar a mensagem fora dele.
- [ ] **Balão por página.** Esconder em páginas específicas (por exemplo, no obrigado do formulário).

## Segurança

- [ ] **Servir os sites em outro domínio que não o do painel.** Hoje, no endereço provisório, site e painel dividem a origem, e por isso só a equipe da agência pode colar código próprio. Separando, esse campo (e o Tag Manager) poderia ser liberado aos clientes com segurança.

## IA

- [ ] **Skill por cliente.** Escolher as skills conforme o site editado (por exemplo `cliente-gemini`), em vez de só `direcao-de-arte` e `sobre-a-agencia` para todos.
