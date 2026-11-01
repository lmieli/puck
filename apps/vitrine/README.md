# Vitrine

Plataforma para agências criarem, editarem e publicarem sites dos seus clientes, com edição por IA própria e blocos no estilo de grandes lançamentos de produto: tipografia limpa, muito espaço em branco, rolagem cinematográfica, parallax, produto em 3D e storytelling visual.

Construída sobre o editor [Puck](../../packages/core) deste repositório. A IA é implementada aqui mesmo, chamando a API do Claude diretamente. Não usa o Puck AI nem a nuvem do Puck.

![Abertura cinematográfica](screenshots/site-01-abertura.jpg)

## O que o produto faz

| Área                | Recursos                                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vários clientes** | Cada site é um cliente (tenant). Usuários têm papel por site. A agência vê todos; o cliente só vê o dele.                                                                                               |
| **Edição por IA**   | Painel "IA" no editor. A pessoa descreve a mudança e a página muda ao vivo, bloco a bloco. Entende o bloco selecionado ("mude este título"). Cria um site inteiro a partir de uma descrição do negócio. |
| **Editor visual**   | Arrastar e soltar, campos em português, envio de imagens, cores, pré-visualização em celular, tablet e computador. Rascunho salvo automaticamente.                                                      |
| **Publicação**      | Rascunho e publicado separados. Publicar não precisa de deploy. Cada publicação vira uma versão.                                                                                                        |
| **Histórico**       | Painel "Versões" no editor: abrir qualquer versão no editor ou restaurar (republica sem apagar nada). Desfazer/refazer na sessão.                                                                       |
| **Papéis**          | Agência (todos os sites), Administrador do site (publica, restaura, domínios, equipe), Editor (edita e envia para revisão; não publica nem apaga blocos). Verificado no servidor em toda chamada.       |
| **Domínios**        | Domínio próprio do cliente com verificação por registro TXT e checagem de CNAME. Endereço provisório `<site>.<domínio raiz>`.                                                                           |
| **Contatos**        | O bloco "Formulário de contato" grava as mensagens no painel do cliente (aba Contatos), com limite de envio por IP.                                                                                     |
| **Atividade**       | Registro de publicações, restaurações, pedidos de revisão, uso da IA, domínios e acessos.                                                                                                               |

## Blocos

| Categoria       | Bloco                                                                                                                  | O que faz                                                                                                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cinematográfico | Abertura                                                                                                               | Estilo cinematográfico: a seção fica presa e a imagem cresce até a tela inteira enquanto o título se dissolve. Também "texto + imagem" e "só tipografia". Aceita vídeo.                 |
|                 | Produto em 3D                                                                                                          | Renderização 3D em tempo real (Three.js) que gira e aproxima com a rolagem, com legendas por etapa. Objetos gerados (smartphone, relógio, alto-falante, fone) ou modelo `.glb` próprio. |
|                 | História com rolagem                                                                                                   | Imagem presa de um lado, trocando suavemente a cada capítulo de texto.                                                                                                                  |
|                 | Parallax                                                                                                               | Imagem em profundidade com frase que surge ao rolar.                                                                                                                                    |
|                 | Frase que se revela                                                                                                    | As palavras acendem uma a uma conforme a rolagem.                                                                                                                                       |
|                 | Galeria horizontal                                                                                                     | A rolagem vertical move uma fileira de cartões na horizontal.                                                                                                                           |
| Conteúdo        | Grade de recursos                                                                                                      | Mosaico estilo bento com números, imagens e frases, animado ao entrar na tela.                                                                                                          |
|                 | Imagem + texto, Números (contagem animada), Especificações, Galeria (com ampliação), Depoimentos, Perguntas frequentes |                                                                                                                                                                                         |
| Conversão       | Compra / chamada final                                                                                                 | Preço, amostras de cor e botões.                                                                                                                                                        |
|                 | Formulário de contato                                                                                                  | Salva os contatos no painel.                                                                                                                                                            |
| Estrutura       | Menu, Rodapé, Espaço                                                                                                   |                                                                                                                                                                                         |

Configurações de página: tema claro ou escuro, cor de destaque, tipografia (limpa, editorial serifada ou geométrica), título e descrição para o Google. Qualquer seção pode usar o tema invertido, suave ou a cor de destaque, para criar contraste.

As animações rodam sem bibliotecas: o progresso da rolagem vira uma variável CSS atualizada por `requestAnimationFrame`, então o React não renderiza de novo durante a rolagem. Quem pede movimento reduzido no sistema recebe a página estática.

## Como a IA funciona

1. O painel envia o pedido, a página atual (JSON), o bloco selecionado e as últimas mensagens para `/api/ai`.
2. O servidor confere login e papel e chama o Claude (`claude-opus-5-5`, pensamento adaptativo, streaming) com seis ferramentas: `insert_block`, `update_block`, `remove_block`, `move_block`, `update_page` e `replace_content`.
3. Cada chamada de ferramenta é validada contra o esquema dos blocos (`blocks/schema.ts`). Uma entrada inválida volta para a IA como erro e ela corrige sozinha.
4. Cada mudança aceita é enviada ao editor na hora (a página muda enquanto a IA trabalha). No fim, a alteração inteira vira um passo de desfazer.
5. A IA nunca publica. O resultado fica no rascunho até alguém publicar.

O esquema dos blocos é a fonte única: gera os campos do editor, a validação e o catálogo que a IA lê. Um bloco novo aparece para a IA automaticamente.

O prompt de sistema traz uma direção de arte (ritmo das seções, títulos curtos, contraste, uma ideia por seção) e uma biblioteca de imagens verificadas. Ele é estável e vai com cache. A IA está instruída a não inventar fatos verificáveis sobre negócios reais e a marcar dados que faltam como provisórios.

O pedido usa fallback automático do servidor (`fallbacks: "default"`) para o caso de um modelo recusar.

## Rodar

Na raiz do repositório:

```sh
pnpm install
cp apps/vitrine/.env.example apps/vitrine/.env.local   # e preencha ANTHROPIC_API_KEY
pnpm --filter vitrine dev
```

Abra [http://localhost:3000](http://localhost:3000). O banco é criado em `apps/vitrine/data/` no primeiro acesso, com dois sites de demonstração:

| Conta                   | Senha        | Acesso                                     |
| ----------------------- | ------------ | ------------------------------------------ |
| `admin@vitrine.app`     | `vitrine123` | Agência: todos os sites, cria sites        |
| `cliente@gemini.com.br` | `vitrine123` | Administrador do site Gemini Engenharia    |
| `editor@gemini.com.br`  | `vitrine123` | Editor do site Gemini (envia para revisão) |

Sites publicados: `/sites/aurora` (lançamento de produto) e `/sites/gemini` (construtora).

Sem `ANTHROPIC_API_KEY`, tudo funciona menos a IA, e o painel avisa o que falta. `VITRINE_AI_MOCK=1` liga um modo de teste que entende poucas frases e serve só para testar o fluxo sem chave.

## Variáveis de ambiente

| Variável                                       | Para quê                                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`                            | Liga a edição por IA.                                                  |
| `VITRINE_AI_MODEL`                             | Troca o modelo (padrão `claude-opus-5-5`).                             |
| `VITRINE_ROOT_DOMAIN`                          | Domínio raiz da plataforma. Sites ficam em `<slug>.<raiz>`.            |
| `VITRINE_APP_HOSTS`                            | Hosts do painel, separados por vírgula (padrão `localhost,127.0.0.1`). |
| `VITRINE_CNAME_TARGET`                         | Destino do CNAME que os clientes configuram (padrão `sites.<raiz>`).   |
| `VITRINE_PLATFORM_IP`                          | IP aceito em registro A, para domínios sem www.                        |
| `VITRINE_DATA_DIR`                             | Pasta do banco e dos arquivos enviados (padrão `./data`).              |
| `VITRINE_ADMIN_EMAIL`, `VITRINE_DEMO_PASSWORD` | Conta inicial da agência e senha das contas de demonstração.           |
| `VITRINE_HIDE_DEMO`                            | Esconde a lista de contas de demonstração no login.                    |

## Testes

```sh
pnpm --filter vitrine test
```

- `tests/page-ops.test.ts`: as operações da IA (inserir, editar, mover, remover, reconstruir), a validação, os modelos e o catálogo.
- `tests/agent.test.ts`: roda o agente real (SDK da Anthropic, streaming, ferramentas) contra um servidor falso da API. Confere o formato do pedido, a execução das ferramentas e a correção após um erro.

## Arquitetura

| Caminho                       | Função                                                         |
| ----------------------------- | -------------------------------------------------------------- |
| `blocks/schema.ts`            | Definição de todos os blocos (fonte única).                    |
| `blocks/components/`          | Renderização dos blocos. `three-scene.ts` é o renderizador 3D. |
| `blocks/motion.ts`            | Animação por rolagem, revelação e etapa ativa.                 |
| `blocks/site.css`             | Visual dos sites (temas, tipografia, animações).               |
| `ai/page-ops.ts`              | Operações puras e validadas sobre a página.                    |
| `ai/agent.ts`, `ai/prompt.ts` | Agente de IA e prompt de sistema.                              |
| `lib/db.ts`, `lib/repo.ts`    | Banco SQLite e regras de negócio (papéis, versões, domínios).  |
| `proxy.ts`                    | Encaminha domínios de clientes para o site certo.              |
| `app/(dash)`, `app/(editor)`  | Painel e editor.                                               |
| `app/sites`, `app/domain`     | Sites publicados (por endereço e por domínio).                 |

## Antes de ir para produção

- **Banco:** o SQLite embutido do Node serve para uma instância. Para várias instâncias ou hospedagem serverless, troque `lib/db.ts` por Postgres (o resto usa só as funções de `lib/repo.ts`). O módulo `node:sqlite` ainda é experimental no Node 22; o projeto pede Node 24.
- **Arquivos enviados:** ficam em disco (`data/uploads`). Em produção, use S3 ou similar.
- **Certificados HTTPS dos domínios:** use uma hospedagem que emita sozinha (Vercel Domains API, Cloudflare for SaaS ou Caddy com TLS sob demanda).
- **Convites:** hoje o painel mostra uma senha provisória uma vez. Ligue um serviço de e-mail para enviar convites e redefinir senhas.
- **Imagens das demonstrações:** vêm do Unsplash e do site atual da Gemini. Hospede as imagens dos clientes na plataforma.
