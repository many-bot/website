---
date: 2026-07-17
title: Everything you need to know about ManyBot v5.2 and ManyPlug v2.4
excerpt: This was a big update, and below you'll find everything about it.
---

This was a big update, and below you'll find everything about it.

I'll be comparing v5.1.0 with v5.2.4, which is the latest at the moment.

# Architecture

There was a complete migration of the runtime from whatsapp-web.js to Baileys. This was only discussed ([Baileys and ManyBot](/blog/baileys/)) and is now a reality.

You can expect a faster bot, easier to configure, and a few API changes that I'll cover below.

There was also a complete rewrite of the project from JavaScript to TypeScript, which is a significant step toward the project's maturity. It eliminated some issues that were starting to appear due to typing and somewhat messy code. At least in my opinion, I find TypeScript code much more readable — maybe I'm crazy.

We also have a new driver pattern (src/drivers/), isolating all WhatsApp-specific logic:

- drivers/whatsapp/index.ts, adapter.ts, messageHandler.ts, loginPrompt.ts
- drivers/whatsapp/api/index.ts (formerly kernel/pluginApi.js)
- drivers/whatsapp/sdk/baileysSock.ts (formerly client/)

Structure prepared for future drivers (Discord, Telegram, Business API).

BUT, this is still just organization — this multi-runtime multi-platform idea is quite futuristic, and we're still thinking a lot about how to implement it and whether we'll actually do it.

And I accidentally added a CHANGELOG.md file to the repository lol, we're already removing it and adding it to `.gitignore`.

# Breaking Changes

> A "breaking change" means any change you make to your software that could cause your users' usage to break after they upgrade.
> source: [carlosschults.net](https://carlosschults.net/en/what-are-breaking-changes)

Now comes the fun part that involves you plugin developers :)

If your plugin uses any of the code lines below, it will break (error or different behavior) and needs to be adjusted. So **pay attention**.

1. ctx.contacts.getProfilePicUrl() was renamed

```js
// before (5.1.0): will error: "getProfilePicUrl is not a function"
const url = await ctx.contacts.getProfilePicUrl(contactId);

// now (5.2.4)
const url = await ctx.contacts.getPfpUrl(contactId);
```

2. Contact object fields changed

```js
const c = await ctx.contacts.get(contactId);

// no longer exist
c.isMyContact

c.isWAContact

// new equivalent field
c.isWAAccount // true if it's a valid WhatsApp account

// behavior changed (no error, but value changed)
c.shortName // used to be filled sometimes, now always null and will be removed
```

The reason is that Baileys doesn't have these. But I highly doubt you've ever used them — normally you'll only use `c.pushname`.

3. ctx.send opts no longer accepts any option

```js
// before: extra options were passed directly to whatsapp-web.js
ctx.send.text("hi", { myRandomOption: true });
// now this option is simply ignored, no error and no effect

// only these two options still work
ctx.send.text("hi", { linkPreview: false });
ctx.send.text("hi", { mentions: [5511999999999@s.whatsapp.net] });
```

We'll add more options over time as needed. But for now only these options seem good.

Read here if you want to see all available options: [Options by method - API - Messages (send and msg)](/docs/03-ctx-messaging/#options-by-method).

4. ctx.msg.getReply() returns a different object

```js
const reply = await ctx.msg.getReply();

// before: native whatsapp-web.js object fields
reply.author
reply.from
reply.body

// now: same format as ctx.msg
reply.sender // replaces author/from
reply.body // this stays the same
reply.command, reply.args, reply.is(...) // gained everything ctx.msg has
```

# New features

Enough talk about broken things — let's talk about new stuff.

Besides the migration to Baileys, 5.2 brought some new improvements for both plugin developers and users.

## Message chaining

Now all send methods (`ctx.send.*`) return a `MessageHandle`, allowing interaction with the sent message.

Before:

```js
await ctx.send.text("Hello!");
```

Now:

```js
const msg = await ctx.send.text("Hello!");

await msg.reply("How are you?");
await msg.react("👍");
```

## Plugin storage

ManyBot now has an internal database for storing per-chat settings, `ctx.storage`.

You store a key with a value and can retrieve it later per chat. Useful for specific settings like configuring a chat to receive a newsletter, or enabling/disabling a feature for a specific user. The possibilities are truly endless.

This eliminates the need for many plugins to create their own JSON files just to store simple preferences, making the code much cleaner.

Details: [ctx.storage - Utilities - API](/docs/08-ctx-utilities/#ctxstorage)

---

## Scheduler rewritten

The scheduled tasks system was completely rewritten and now uses `node-cron` with persistent scheduling.

It's still being tested, but you can schedule a function to run at a specific time, like reminding group members of an event.

---

## Better typing

TypeScript developers now have practically complete autocomplete for the `ctx` object.

Additionally, several APIs received more precise types, reducing errors during development.

Install this package in your plugin's directory:

```bash

npm install @manybot/types

```

Details: [TypeScript - How to make a plugin - Plugins](/docs/how-to-make-a-plugin/#typescript)

---

# ManyPlug

Now let's talk about the plugin manager, which received lots of new useful stuff:

## New features

1. `search`
- searches plugins in the remote registry by name, key, description, or category; supports `-c`/`--category` for filtering.

2. Pluginpacks and profiles
- `manyplug init --type pluginpack`
- creates a "pluginpack" type repository, which is a plugin containing multiple plugins, each in its own subdirectory with its own manyplug.json. When you install a pluginpack, it installs all contained plugins at once.
- `manyplug init --type profile`
- creates a plugin with a manifest that has a list of plugin keys (plugins: [...]) to install. When you install a profile, it reads the plugin list and downloads all listed plugins. Unlike a pluginpack, it needs to download everything from the index — the profile just lists them.

3. New flags `-p`/`--profile` in `enable`/`disable`
- to enable/disable all plugins installed via a specific profile at once, using the profile name. This only works with profiles — with pluginpacks you need to list them all in a profile if you want to manage them together.

4. Internationalization (i18n)
- All CLI output (error messages, warnings, help, etc.) is now translatable, with src/locales/en.json and src/locales/pt.json.
- Language detected automatically from system locale, configurable via LANGUAGE in the config file or by the MANYPLUG_LANG environment variable (which takes priority and forces the language even without config). For now, no Spanish translation, only Brazilian Portuguese and English.

5. Configuration
- The config file `~/.manybot/manyplug.toml` now has more options: language, registry URL, whether to ask for confirmation before destructive actions, enabled plugins list.

6. `init`
- New flag `--lang (js/ts)` to choose the plugin language; if omitted, it asks interactively. When choosing TypeScript, the scaffold generates `src/index.ts`, `tsconfig.json`, and `package.json` with `@manybot/types` and build script.
- And we now have more categories: integration, games, media, utility, admin, fun, moderation, ai, education, social, economy, automation, tools.

7. `install`
- Newly installed plugins are now automatically enabled (no need to run enable afterwards).
- Warning when the plugin's manyplug.json declares a dependency on another plugin (via dependencies) that isn't installed yet.
- Installs npm dependencies by reading the plugin's own package.json (`npm install`), with automatic approval of native builds for trusted packages (sharp, sqlite3, better-sqlite3, canvas, bcrypt) and npm rebuild at the end.

8. `validate`
- New optional `manybotVersion` field in the manifest, with semver compatibility checking (>=, <=, ^, ~, etc.) against the locally installed ManyBot version.
- Checks for missing package.json dependencies in node_modules.
- Validates locale/ folder: existence, valid JSON in each file, and translation keys synced between languages.
- Static code scanning of the plugin:
- Detects use of non-existent properties/methods on ctx (e.g., ctx.foo, ctx.send.bar()).
- Detects invalid calls on "sender" objects that aren't functions (e.g., ctx.send(...) instead of ctx.send.text(...)).
- Detects external binaries called via exec/spawn and warns if they aren't installed on the system (and shows the version when found).
- Detects inter-plugin dependencies via ctx.plugins.require("key") and automatically adds them to the dependencies field of manyplug.json, also warning about declared but unused dependencies.
- Specific rules for pluginpacks (requires subdirectories with their own manyplug.json) and profiles (requires non-empty plugins list with valid entries).

9. `link`

Creates a symlink from a local plugin into the plugin directory (like `npm link`): edits in the directory take effect immediately, without reinstalling. Also works for pluginpacks (links each subplugin).

### Other

New short command `mp`, installed alongside manyplug (same binary).

New aliases:
- install → i
- update → up
- link → ln
- search → s
- enable → en
- disable → dis
- validate → val.

## Changed

The `dependencies` field in manyplug.json is now reserved for inter-plugin ManyBot dependencies (via `ctx.plugins.require`). npm dependencies now come from the plugin's own package.json.

Interactive prompts (ask/confirm) rewritten with a custom line reader, replacing node:readline, fixing cases where a line typed during an await could be lost or hang with non-interactive stdin.

Log output standardized into a single module (src/logger.js), with colors via chalk (info, warn, error, success, markers +/-/~/· per item).

`manyplug help` without arguments now shows the help itself instead of exiting silently.

## Removed

The `service` field was removed from manifest validation rules, as it was completely useless — ManyBot never actually read it.

`man` page deleted. I wish it could stay, but maintaining two docs simultaneously was too much work. Maybe it'll return someday.

`ora` dependency (spinner) removed — progress indicators now use simple colored text output.

## Fixes

Small indentation/formatting adjustments and normalization of error messages in version.js, enable.js, and other commands.

Issues with node:readline that didn't close the CLI when install and update commands finished. Now we use a custom reader.

---

# Planning

We still want to change a few things, like completely removing sqlite3 and better-sqlite3 from our lives and fully migrating to Node.js's native module "node:sqlite", eliminating compilation issues on Android once and for all.

And yes, we're revisiting the idea of supporting Android, given that this has been growing in our community — people who don't have computers still want to use ManyBot. The next updates from v5.2.4 onward should be more focused on this.