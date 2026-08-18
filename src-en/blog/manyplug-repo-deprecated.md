---
date: 2026-06-14
title: Main ManyBot plugin repository will be replaced
---

# Main ManyBot plugin repository will be replaced

The [manyplug-repo](https://github.com/many-bot/manyplug-repo) (ManyBot plugin repository) will be deprecated soon,
and will be replaced by a more decentralized and open alternative, which is basically an independent Git repository per
plugin.

The current plugins indexed on our page have already received their own repositories and have started receiving
updates.

The new model allows using the `manyplug` tool to download plugins outside the repository, simply by pasting a URL
of a valid Git repository. Developers who want their plugins listed on our page can request via email.
After indexing, users can install your plugin using a simple `user/plugin` key. Example:

```
manyplug install synt-xerror/manymedia
```

This new model has been working since ManyPlug version 2.1.0.

This will look up the name in [mpindex.json](/mpindex.json) and then download the repository snapshot. Our mission
is to try to depend less on external installed programs (currently `manyplug` depends on Git).

The estimated timeline for the complete migration is next month (July 1, 2026) — in the meantime, the old repository
continues working normally and receiving updates. However, it won't be as frequent and
may fall behind the new model.