---
date: 2026-06-11
title: Baileys and ManyBot
excerpt: Plans for migrating from whatsapp-web.js to Baileys
image: https://manybot.stxerr.dev/assets/blog_manybot-and-baileys.png
---

# Baileys and ManyBot

![Baileys and ManyBot](/assets/blog_manybot-and-baileys.png)

In case you didn't know, ManyBot is based on the [whatsapp-web.js](https://wwebjs.dev/) library, which emulates
WhatsApp Web inside a *headless* browser (no UI, controllable by code) based on
Chromium, called [Puppeteer](https://pptr.dev/).

If you know a bit about software development, you probably understand that software relying on Chromium
to run is generally quite *heavy*. An example is [Electron](https://www.electronjs.org/), a framework
for building desktop apps using HTML, CSS, and JS — it also runs Chromium under the hood. It's
well known for its ease of use, since you build apps with the same tools you use for websites.
But let's be honest, running an entire browser for a single app is heavy, especially for a simple bot like ManyBot.

That's why our team has been planning a future migration to the Baileys library, which instead of
using an entire browser under the hood, communicates directly with the WhatsApp Web protocol without any heavy
Chromium behind it, using reverse engineering to connect directly to WhatsApp's servers via
WebSocket. Much lighter and faster.

Additionally, there's also the possibility of supporting Meta's official API for those who want maximum stability. But
that idea is still much further out than Baileys.

For now, the idea is experimental. It will start being tested from a new branch in the repository called
`poc/baileys`. If you'd like to help with the idea, that's the right place to go.