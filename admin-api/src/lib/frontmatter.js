const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(value) {
  return typeof value === 'string' && DATE_RE.test(value);
}

function formatValue(value) {
  if (typeof value === 'boolean') return String(value);
  return JSON.stringify(String(value));
}

export function buildMarkdown(fields, body) {
  const lines = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => (k === 'date' ? `${k}: ${v}` : `${k}: ${formatValue(v)}`));

  return `---\n${lines.join('\n')}\n---\n\n${body.trim()}\n`;
}
