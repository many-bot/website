const result = document.getElementById('result');

document.querySelectorAll('nav button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('nav button').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    result.textContent = '';
  });
});

async function submitForm(endpoint, form, event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  if ('breaking' in data) data.breaking = form.breaking.checked;

  result.textContent = 'enviando...';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    result.textContent = `${res.status}\n${JSON.stringify(body, null, 2)}`;
    if (res.ok) form.reset();
  } catch (err) {
    result.textContent = `erro de rede: ${err.message}`;
  }
}

document.getElementById('blogForm').addEventListener('submit', (e) =>
  submitForm('/api/blog', e.target, e),
);

document.getElementById('changelogForm').addEventListener('submit', (e) =>
  submitForm('/api/changelog', e.target, e),
);

