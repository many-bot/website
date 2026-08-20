---
date: 2026-07-17
title: Tudo o que você precisa saber sobre o ManyBot v5.2 e ManyPlug v2.4
excerpt: Essa foi uma atualização das grandes, e aqui abaixo você vai saber tudo sobre ela.
---

Essa foi uma atualização das grandes, e aqui abaixo você vai saber tudo sobre ela.

Vou estar comparando a v5.1.0 com a v5.2.4, que é a mais recente até o momento.

# Arquitetura

Houve uma migração completa do runtime de whatsapp-web.js para Baileys. Isso era apenas discutido ([Baileys e ManyBot](/blog/baileys/)) e agora é realidade.

Você pode esperar um bot mais rápido, fácil de configurar e algumas poucas mudanças na API que vou falar abaixo.

Também houve reescrita total do projeto de JavaScript para TypeScript, o que é um passo significativo para a maturidade do projeto. Eliminou alguns problemas que estavam começando a aparecer por conta de tipagem e código meio confuso. Na minha opinião pelo menos, eu acho o código TypeScript bem mais legível, talvez eu seja louco.

Temos também um novo padrão de drivers (src/drivers/), isolando toda a lógica específica de WhatsApp:

- drivers/whatsapp/index.ts, adapter.ts, messageHandler.ts, loginPrompt.ts
- drivers/whatsapp/api/index.ts (antigo kernel/pluginApi.js)
- drivers/whatsapp/sdk/baileysSock.ts (antigo client/)

Estrutura preparada para futuros drivers (Discord, Telegram, Business API).

MAS, isso ainda é só organização, é bem futurística essa ideia de multi-runtime de diferentes plataformas, estamos pensando muito como implementar isso e se realmente vamos implementar isso.

E adicionei um arquivo CHANGELOG.md no repositório sem querer kk, já estamos removendo e adicionando no `.gitignore`.

# Breaking Changes

> “Breaking change” significa qualquer mudança que você faz no seu software que pode fazer o uso dos seus usuários quebrar, depois que eles fizerem o upgrade.
> fonte: [carlosschults.net](https://carlosschults.net/pt/o-que-sao-breaking-changes#o-que-%C3%A9-um-breaking-change)

Agora vem a parte mais legal, que envolve você que é desenvolvedor de plugins :)

Se o plugin usa qualquer uma das linhas de código abaixo, ele vai quebrar (erro ou comportamento diferente) e precisa ser ajustado. Então **préstenção**.

1. ctx.contacts.getProfilePicUrl() foi renomeado

```js
// antes (5.1.0): vai dar erro: "getProfilePicUrl is not a function"
const url = await ctx.contacts.getProfilePicUrl(contactId);

// agora (5.2.4)
const url = await ctx.contacts.getPfpUrl(contactId);
```

2. Campos do objeto de contato mudaram

```js
const c = await ctx.contacts.get(contactId);

// não existem mais
c.isMyContact

c.isWAContact

// novo campo equivalente
c.isWAAccount // true se é uma conta WhatsApp válida

// mudou de comportamento (não dá erro, mas o valor mudou)
c.shortName // antes podia vir preenchido, agora é sempre null e vai ser removido
```

O motivo é que Baileys não tem isso. Mas eu duvido muito que você já usou isso, normalmente você vai usar somente `c.pushname`.

3. opts de ctx.send não aceita mais qualquer opção

```js
// antes: opções extras eram repassadas direto pro whatsapp-web.js
ctx.send.text("oi", { minhaOpcaoQualquer: true });
// agora essa opção é simplesmente ignorada, sem erro e sem efeito

// depois: só estas duas opções continuam funcionando
ctx.send.text("oi", { linkPreview: false });
ctx.send.text("oi", { mentions: [5511999999999@s.whatsapp.net] });
```

Com o tempo adicionamos mais opções conforme a necessidade. Mas por enquanto só essas opções parecem ser boas.

Leia aqui caso queira ver todas as opções disponíveis: [Opções por método - API - Mensagens (send e msg)](/docs/03-ctx-messaging/#opcoes-por-metodo).

4. ctx.msg.getReply() retorna um objeto diferente

```js
const reply = await ctx.msg.getReply();

// antes: campos do objeto nativo do whatsapp-web.js
reply.author
reply.from
reply.body

// agora: mesmo formato do ctx.msg
reply.sender // no lugar de author/from
reply.body // esse continua igual
reply.command, reply.args, reply.is(...) // ganhou tudo que ctx.msg tem
```

# Novas features

Chega de falar de coisas quebradas e vamos falar sobre coisas novas.

Além da migração para Baileys, a 5.2 trouxe algumas melhorias novas tanto pra quem desenvolve plugins quanto pra quem usa eles.

## Message chaining

Agora todos os métodos de envio (`ctx.send.*`) retornam um `MessageHandle`, permitindo interagir com a mensagem enviada.

Antes:

```js
await ctx.send.text("Olá!");
```

Agora:

```js
const msg = await ctx.send.text("Olá!");

await msg.reply("Tudo bem?");
await msg.react("👍");
```

## Configurações de plugins

Agora o ManyBot possui um banco interno para armazenar configurações por chat, o `ctx.storage`.

Você armazena uma chave com um valor e pode pegar depois por chat. Útil para configurações específicas como configurar um chat para receber uma newsletter, ou desativar/ativar uma função para um usuário específico. As possibilidades são realmente infinitas.

Isso elimina a necessidade de muitos plugins criarem seus próprios arquivos JSON apenas para guardar preferências simples, deixando o código muito mais limpo.

Detalhes: [ctx.storage - Utilidades - API](/docs/08-ctx-utilities/#ctxstorage)

---

## Scheduler reescrito

O sistema de tarefas agendadas foi completamente reescrito e agora utiliza `node-cron` e tem agendamentos persistentes.

É algo ainda em testes, mas você consegue agendar uma função para acontecer em determinado momento, como lembrar os membros de um grupo de um evento.

---

## Melhor tipagem

Quem desenvolve em TypeScript agora conta com autocomplete praticamente completo para o objeto `ctx`.

Além disso, diversas APIs receberam tipos mais precisos, reduzindo erros durante o desenvolvimento.

Instale esse pacote no diretório do seu plugin:

```bash

npm install @manybot/types

```

Detalhes: [TypeScript - Como fazer um plugin - Plugins](/docs/how-to-make-a-plugin/#typescript)

---

# ManyPlug

Vamos falar agora do gerenciador de plugins que recebeu muita coisa nova e útil para ajudar você:

## Novas features

1. `search`
- busca plugins no registro remoto por nome, key, descrição ou categoria; suporta `-c`/`--category` para filtrar.

2. Pluginpacks e profiles
- `manyplug init --type pluginpack`
- cria um repositório do tipo "pluginpack", que é um plugin com vários plugins dentro, cada um em seu próprio subdiretório com manyplug.json próprio. Quando você instala um pluginpack, ele instala todos os plugins dentro de uma vez.
- `manyplug init --type profile`
- cria um plugin com um manifest que tem uma lista de plugin keys (plugins: [...]) a instalar. Quando você instala um profile, ele lê a lista de plugins e baixa todos os plugins listados. Ao contrário de um pluginpack, ele precisa baixar todas do índice, o profile apenas lista elas.

3. Novos flags `-p`/`--profile` em `enable`/`disable`
- para habilitar/desabilitar de uma vez todos os plugins instalados via um profile específico, usando o nome do profile. Isso só funciona com profiles, com pluginpacks você precisa listar todos num profile caso queira gerenciá-los juntos.

4. Internacionalização (i18n)
- Toda a saída do CLI (mensagens de erro, avisos, ajuda, etc.) passou a ser traduzível, com src/locales/en.json e src/locales/pt.json.
- Idioma detectado automaticamente pelo locale do sistema, configurável via LANGUAGE no arquivo de config ou pela variável de ambiente MANYPLUG_LANG (tem prioridade e força o idioma mesmo sem config). Por enquanto, não tem tradução em espanhol, só português brasileiro e inglês.

5. Configuração
- O arquivo de configuração `~/.manybot/manyplug.toml` tem agora mais opções: idioma, URL do registro, se pede confirmação antes de ações destrutivas, lista de plugins habilitados.

6. `init`
- Novo flag `--lang (js/ts)` para escolher a linguagem do plugin; se omitido, pergunta interativamente. Ao escolher TypeScript, o scaffold gera `src/index.ts`, `tsconfig.json` e `package.json` com `@manybot/types` e script de build.
- E agora temos mais categorias: integration, games, media, utility, admin, fun, moderation, ai, education, social, economy, automation, tools.

7. `install`
- Plugins recém-instalados agora são habilitados automaticamente (não precisa mais rodar enable depois).
- Aviso quando o manyplug.json do plugin declara dependência de outro plugin (via dependencies) que ainda não está instalado.
- Instala as dependências npm lendo o package.json do próprio plugin (`npm install`), com aprovação automática de builds nativos de pacotes confiáveis (sharp, sqlite3, better-sqlite3, canvas, bcrypt) e npm rebuild ao final.

8. `validate`
- Novo campo opcional `manybotVersion` no manifest, com checagem de compatibilidade semver (>=, <=, ^, ~, etc.) contra a versão do ManyBot instalada localmente.
- Checagem de dependências do package.json faltando em node_modules.
- Validação da pasta locale/: existência, JSON válido em cada arquivo, e chaves de tradução sincronizadas entre os idiomas.
- Escaneamento estático do código do plugin:
- Detecta uso de propriedades/métodos inexistentes em ctx (ex: ctx.foo, ctx.send.bar()).
- Detecta chamadas inválidas em objetos "sender" que não são funções (ex: ctx.send(...) em vez de ctx.send.text(...)).
- Detecta binários externos chamados via exec/spawn e avisa se não estão instalados no sistema (e mostra a versão quando encontra).
- Detecta dependências entre plugins via ctx.plugins.require("key") e adiciona automaticamente ao campo dependencies do manyplug.json, avisando também sobre dependências declaradas mas não usadas.
- Regras específicas para pluginpacks (exige subdiretórios com manyplug.json próprio) e profiles (exige lista plugins não vazia com entradas válidas).

9. `link`

Cria um symlink de um plugin local dentro do diretório de plugins (como `npm link`): edições no diretório passam a valer na hora, sem precisar reinstalar. Funciona também para pluginpacks (linka cada subplugin).

### Outros

Novo comando curto mp, instalado junto com manyplug (mesmo binário).

Novos aliases:
- install → i
- update → up
- link → ln
- search → s
- enable → en
- disable → dis
- validate → val.

## Alterado

O campo `dependencies` do manyplug.json passa a ser reservado para dependências entre plugins do ManyBot (via `ctx.plugins.require`). Dependências npm agora vêm do package.json do próprio plugin.

Prompts interativos (ask/confirm) reescritos com um leitor de linha próprio, no lugar de node:readline, corrigindo casos em que uma linha digitada durante um await podia ser perdida ou travar com stdin não interativo.

Saída de log padronizada em um módulo único (src/logger.js), com cores via chalk (info, warn, error, sucesso, marcadores +/-/~/· por item).

`manyplug help` sem argumento agora mostra a própria ajuda em vez de sair sem fazer nada.

## Removido

Campo service saiu das regras de validação do manifest, por ser totalmente inútil, o ManyBot nunca lia aquilo de fato.

Página `man` foi deletada. Eu também queria que ela permanecesse, mas dava muito trabalho manter duas docs ao mesmo tempo. Talvez um dia volte.

Dependência ora (spinner) removida — indicadores de progresso agora usam saída de texto simples colorida.

## Correções

Pequenos ajustes de indentação/formatação e normalização de mensagens de erro em version.js, enable.js e outros comandos.

Problemas com o node:readline que não fechava o CLI quando ações quando os comandos install e update terminavam. Agora usamos leitor próprio.

---

# Planejando

Ainda queremos mudar algumas coisas, como remover completamente sqlite3 e better-sqlite3 de nossas vidas e migrar totalmente para o módulo nativo do Node.js, o "node:sqlite", e eliminar de vez os problemas de compilação no Android.

E sim, estamos voltando com a ideia de suportar Android dado que isso tem crescido na nossa comunidade, pessoas que não tem computadores ainda querem usar o ManyBot. As próximas atualizações a partir da v5.2.4 devem ser mais focadas nisso.
