# Pendências da Vitrine

Itens combinados e ainda não feitos. Marque com `[x]` e mova para o README quando entrarem.

## Rastreamento

- [ ] **Validar com IDs reais.** Hoje o Meta Pixel, o Google Analytics, o TikTok e o Pinterest foram testados com IDs de exemplo e as bibliotecas simuladas. Antes de entregar a um cliente: colocar um ID real e conferir no Gerenciador de Eventos do Meta e no Google Tag Assistant (PageView, Lead, conversão do Google Ads).
- [ ] **Meta Conversions API (envio pelo servidor).** Conversão que funciona mesmo com bloqueador de anúncios. Precisa de token por site (guardado com cuidado, só administradores), envio do Lead no servidor quando o contato é gravado, e e-mail e telefone com hash SHA-256. Usar o mesmo `event_id` do pixel para o Meta não contar duas vezes.
- [ ] **Eventos por regra**, como "rolou 75% da página" ou "clicou neste botão específico". Hoje só existem PageView, Lead e clique nos botões principais.

## Cadastros

- [x] ~~**Notion direto.**~~ Feito: conexão por cliente e por formulário, com mapeamento de colunas (ver README). Falta validar com uma conta real do Notion (os testes usam um servidor falso) e ver abaixo o que ficou de fora.
- [ ] **Notion, o que ficou de fora:** evitar linha duplicada se o Notion criar a página mas a resposta se perder e a entrega for repetida (hoje seria preciso um campo de código do cadastro e uma consulta antes de criar); colunas de relação, pessoas e arquivos; bancos com várias fontes de dados (API nova do Notion, usamos a versão 2022-06-28); OAuth do Notion no lugar do token manual.
- [ ] **Google Planilhas direto.** Mesmo caminho: uma conta de serviço da agência (um "robô") que o cliente convida na planilha, sem o botão "Entrar com Google" por cliente, que exige verificação do app pelo Google. Precisa de um projeto no Google Cloud (a API do Google Planilhas é gratuita) e validação com uma planilha de teste.
- [ ] **Validar o aviso por e-mail com o serviço real.** Foi testado o caminho de erro (servidor sem e-mail) e o conteúdo da mensagem nos testes automáticos, mas não um envio de verdade pela Resend.
- [ ] **Captcha só em emergência** (Cloudflare Turnstile, sem rastreamento), ligado por site quando ele sofrer um ataque. Depende de chave.
- [ ] **Validar a proteção de DNS com um nome real que aponta para dentro** (por exemplo `localtest.me`). Nos testes automáticos o bloqueio é provado com um resolvedor simulado; no ambiente de teste do navegador o DNS não respondia.

## Segurança

- [ ] **Servir os sites em outro domínio que não o do painel.** Hoje, no endereço provisório, site e painel dividem a origem, e por isso só a equipe da agência pode colar código próprio. Separando, esse campo (e o Tag Manager) poderia ser liberado aos clientes com segurança.

## IA

- [ ] **Skill por cliente.** Escolher as skills conforme o site editado (por exemplo `cliente-gemini`), em vez de só `direcao-de-arte` e `sobre-a-agencia` para todos.

## SEO e IAs

- [ ] **Conferir no Google Search Console e no Bing Webmaster** com um domínio real: enviar o `sitemap.xml`, inspecionar uma URL e validar os dados estruturados no Teste de Resultados Enriquecidos. Os arquivos foram testados por requisições, não pelos buscadores.
- [ ] **Confirmar os nomes dos rastreadores de IA** na documentação atual de cada empresa (OpenAI, Anthropic, Perplexity, Google, Apple, Meta). Esses nomes mudam; a lista fica em `lib/seo.ts`.
- [ ] **IndexNow** (Bing e outros) para avisar a publicação na hora, em vez de esperar o rastreio.
- [ ] **Redirecionamentos** quando o endereço de uma página muda, para não perder o link antigo no Google.
- [ ] **Imagens**: gerar tamanhos responsivos (`srcset`), formatos modernos e `loading="lazy"` consistente; medir com Lighthouse. O bloco 3D (three.js) deve carregar só quando aparece.
- [ ] **Telemetria de rastreadores de IA**: contar quantas vezes cada agente leu o site, para mostrar ao cliente. Hoje eles não executam o contador de visitas.
- [ ] **Idiomas**: `hreflang` e sites em mais de um idioma (hoje tudo é `pt-BR`).
