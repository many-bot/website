---
title: Baileys e ManyBot
excerpt: Planos para migração do whatsapp-web.js para Baileys
---

Caso não saiba, o ManyBot é baseado na biblioteca [whatsapp-web.js](https://wwebjs.dev/), que emula o
WhatsApp Web dentro de um navegador *headless* (sem UI, controlável por código) baseado em 
Chromium, chamado [Puppeteer](https://pptr.dev/).

Se você sabe um pouco sobre desenvolvimento de software, deve entender que softwares que dependem do Chromium
para funcionar geralmente são bem *gordos*. Um exemplo é o [Electron](https://www.electronjs.org/), um framework
para construir apps de desktop usando HTML, CSS e JS, e para isso ele também roda um Chromium por baixo. Ele é 
bem conhecido por sua facilidade de uso, já que você faz apps com as mesmas ferramentas que usa para fazer websites.
Mas vamos combinar, rodar um navegador inteiro para um único app é pesado, ainda mais para um simples bot como o ManyBot.

Por isso nossa equipe esteve planejando uma possível migração futura para a biblioteca Baileys, que em vez de
usar um navegador inteiro por trás, se comunica diretamente com o protocolo do WhatsApp Web sem nenhum Chromium
pesado por trás, utilizando de engenharia reversa para se conectar direto nos servidores do Whatsapp via
WebSocket. Muito mais leve e rápido.

Além disso, há a possibilidade também de suportarmos a API oficial da Meta, para quem quer estabilidade máxima. Mas
essa ideia ainda está bem mais longe que o Baileys.

Por enquanto a ideia é experimental, começará a ser testada a partir de uma nova branch no repositório chamada 
`poc/baileys`. Caso queira ajudar na ideia, é lá o lugar certo para ir.

