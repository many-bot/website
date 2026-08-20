// Fonte única pros métodos do ctx que aparecem repetidos em vários docs
// (ex: ctx.send.text aparece hoje em getting-started, ctx-messaging e
// common-patterns — mudar a assinatura aqui atualiza os 3 de uma vez,
// nos dois idiomas).

export type CtxMethod = {
  signature: string;
  context: 'setup' | 'runtime' | 'both';
  description: { pt: string; en: string };
};

export const ctxMethods: Record<string, CtxMethod> = {
  'send.text': {
    signature: 'ctx.send.text(text: string, options?: { linkPreview?: boolean; mentions?: string[] })',
    context: 'runtime',
    description: {
      pt: 'Envia uma mensagem de texto no chat atual.',
      en: 'Sends a text message to the current chat.',
    },
  },
  'msg.reply.text': {
    signature: 'ctx.msg.reply.text(text: string, options?: { linkPreview?: boolean; mentions?: string[] })',
    context: 'runtime',
    description: {
      pt: 'Envia uma mensagem de texto citando a mensagem que disparou o handler (prefira em grupos).',
      en: 'Sends a text message quoting the message that triggered the handler (prefer in groups).',
    },
  },
  'send.to': {
    signature: 'ctx.send.to(chatId: string)',
    context: 'both',
    description: {
      pt: 'Retorna um sender apontado pra outro chat por ID — disponível em setup e runtime.',
      en: 'Returns a sender targeting another chat by ID — available in both setup and runtime.',
    },
  },
  'storage.resolve': {
    signature: 'ctx.storage.resolve(relativePath: string): string',
    context: 'both',
    description: {
      pt: 'Resolve um caminho seguro dentro da pasta de dados do plugin (bloqueia "..", paths absolutos e barras invertidas).',
      en: 'Resolves a safe path inside the plugin\'s data folder (blocks "..", absolute paths and backslashes).',
    },
  },
  'config.get': {
    signature: 'ctx.config.get(key: string, defaultValue?: unknown): unknown',
    context: 'both',
    description: {
      pt: 'Lê uma chave do manybot.toml do usuário (passa por hot-reload — exceto LANGUAGE).',
      en: 'Reads a key from the user\'s manybot.toml (hot-reloaded — except LANGUAGE).',
    },
  },
};
