export function slugify(input) {
  return String(input)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')       // espaços/símbolos -> hífen
    .replace(/^-+|-+$/g, '');          // remove hífen nas pontas
}

export function slugifyVersion(input) {
  return String(input).trim().replace(/[^a-zA-Z0-9.\-_]/g, '-');
}

