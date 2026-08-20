---
date: 2026-06-14
title: Principal repositório de plugins do ManyBot será substituído
---

# Principal repositório de plugins do ManyBot será substituído

O [manyplug-repo](https://github.com/many-bot/manyplug-repo) (repositório de plugins do ManyBot) entrará em desuso em breve,
e será substituído por uma alternativa mais descentralizada e aberta, que é basicamente um repositório Git independente por
plugin.

Os plugins atuais que estão indexados na nossa página já ganharam seus repositórios próprios e já começaram a receber
atualizações.

O novo modelo permite usar a ferramenta `manyplug` para baixar plugins fora do repositório, apenas colando uma URL
de um repositório Git válido. Desenvolvedores que querem seus plugins listados na nossa página, podem pedir via email.
Após a indexação, usuários podem instalar seu plugin apenas usando uma chave `usuário/plugin`. Exemplo:

```
manyplug install synt-xerror/manymedia
```

Esse novo modelo está funcionando desde a versão 2.1.0 do ManyPlug.

Isso irá procurar no [mpindex.json](/mpindex.json) pelo nome e então baixará a snapshot do repositório. Nossa missão
é tentar depender menos de programas externos instalados (atualmente o `manyplug` depende do Git).

A previsão para a migração completa é para o mês que vem (1º de Julho de 2026) - enquanto isso, o repositório antigo
continua funcionando normalmente e recebendo atualizações. No entanto, não vai ser mais na mesma frequência e
pode ficar atrasado em relação ao novo modelo.


