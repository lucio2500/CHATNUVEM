const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LETRAS = 'ABCDEFGHIJ';
const estado = { usuario: null, temasSel: new Set(), questoes: [], escolhidas: new Map() };

async function api(url, metodo = 'GET', corpo) {
  const r = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) { if (r.status === 401) abrirLogin(); throw new Error(dados.erro || 'Erro'); }
  return dados;
}

/* ---------- abas ---------- */
document.querySelectorAll('nav button').forEach(b => b.onclick = () => mostrar(b.dataset.aba));
function mostrar(aba) {
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('ativa', b.dataset.aba === aba));
  document.querySelectorAll('main > section').forEach(s => s.hidden = s.id !== 'aba-' + aba);
  if (aba === 'prova') renderFolha();
  if (aba === 'salvas') carregarSalvas();
  if (aba === 'banco') carregarQuestoes();
}

/* ---------- login ---------- */
let modoCriar = false;
function abrirLogin() { $('#login-erro').textContent = ''; $('#dlg-login').showModal(); }
$('#fecha-login').onclick = () => $('#dlg-login').close();
$('#alterna').onclick = () => {
  modoCriar = !modoCriar;
  $('#l-nome').hidden = !modoCriar;
  $('#login-titulo').textContent = modoCriar ? 'Criar conta' : 'Entrar';
  $('#alterna').textContent = modoCriar ? 'Já tenho conta' : 'Criar conta';
};
$('#form-login').onsubmit = async e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  try {
    const r = await api(modoCriar ? '/api/registrar' : '/api/login', 'POST', d);
    estado.usuario = r.usuario; $('#dlg-login').close(); renderConta();
  } catch (err) { $('#login-erro').textContent = err.message; }
};
function renderConta() {
  const c = $('#conta');
  c.innerHTML = estado.usuario ? `${esc(estado.usuario.nome)} <button id="sair">Sair</button>` : '<button id="entrar">Entrar</button>';
  if ($('#sair')) $('#sair').onclick = async () => { await api('/api/logout', 'POST'); estado.usuario = null; renderConta(); };
  if ($('#entrar')) $('#entrar').onclick = abrirLogin;
}

/* ---------- banco ---------- */
async function carregarTemas() {
  const temas = await api('/api/temas');
  $('#temas').innerHTML = temas.map(t =>
    `<span class="chip ${estado.temasSel.has(t.nome) ? 'on' : ''}" data-t="${esc(t.nome)}">${esc(t.nome)} (${t.total})</span>`).join('') || '<em>Nenhum tema ainda</em>';
  $('#temas').querySelectorAll('.chip').forEach(ch => ch.onclick = () => {
    const t = ch.dataset.t; estado.temasSel.has(t) ? estado.temasSel.delete(t) : estado.temasSel.add(t);
    ch.classList.toggle('on'); carregarQuestoes();
  });
}
async function carregarQuestoes() {
  const p = new URLSearchParams({ temas: [...estado.temasSel].join(','), dificuldade: $('#f-dif').value, q: $('#f-q').value });
  estado.questoes = await api('/api/questoes?' + p);
  $('#resumo').textContent = `${estado.questoes.length} questão(ões) encontrada(s)`;
  $('#lista').innerHTML = estado.questoes.map(q => `
    <div class="q"><input type="checkbox" data-id="${q.id}" ${estado.escolhidas.has(q.id) ? 'checked' : ''}>
      <div class="corpo">${blocoQuestao(q, false)}
        <div class="meta">${q.temas.map(t => `<span class="tag">${esc(t)}</span>`).join('')} ${esc(q.dificuldade)}${q.fonte ? ' · ' + esc(q.fonte) : ''}
          ${estado.usuario && estado.usuario.id === q.autor_id ? `<button data-del="${q.id}">excluir</button>` : ''}</div></div></div>`).join('');
  $('#lista').querySelectorAll('input[type=checkbox]').forEach(cb => cb.onchange = () => alternar(Number(cb.dataset.id), cb.checked));
  $('#lista').querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (confirm('Excluir questão?')) { await api('/api/questoes/' + b.dataset.del, 'DELETE'); estado.escolhidas.delete(Number(b.dataset.del)); atualizar(); }
  });
}
function alternar(id, on) {
  const q = estado.questoes.find(x => x.id === id);
  on ? estado.escolhidas.set(id, q) : estado.escolhidas.delete(id);
  $('#qtd').textContent = estado.escolhidas.size;
}
$('#sel-todas').onclick = () => { estado.questoes.forEach(q => estado.escolhidas.set(q.id, q)); $('#qtd').textContent = estado.escolhidas.size; carregarQuestoes(); };
$('#f-dif').onchange = carregarQuestoes;
$('#f-q').oninput = carregarQuestoes;
const atualizar = async () => { await carregarTemas(); await carregarQuestoes(); $('#qtd').textContent = estado.escolhidas.size; };

function blocoQuestao(q, numero) {
  const alts = q.alternativas.length ? `<ol>${q.alternativas.map(a => `<li>${esc(a)}</li>`).join('')}</ol>` : '';
  return `<div>${numero ? `<strong>${numero}.</strong> ` : ''}${esc(q.enunciado).replace(/\n/g, '<br>')}${alts}</div>`;
}

/* ---------- prova ---------- */
function renderFolha() {
  let qs = [...estado.escolhidas.values()];
  if ($('#embaralhar').checked) qs.sort(() => Math.random() - 0.5);
  const sub = $('#subtitulo').value;
  let h = `<h1>${esc($('#titulo').value)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
    <div class="cab"><span>Nome: ______________________________</span><span>Data: ___/___/_____</span></div>`;
  h += qs.length ? qs.map((q, i) => `<div class="folha-q">${blocoQuestao(q, i + 1)}${q.alternativas.length ? '' : '<div style="height:90px"></div>'}</div>`).join('')
    : '<p class="no-print"><em>Nenhuma questão selecionada. Volte ao banco e marque as questões.</em></p>';
  if ($('#com-gabarito').checked && qs.length) {
    h += `<div class="gab"><h2>Gabarito</h2>${qs.map((q, i) => {
      const ind = q.alternativas.length ? LETRAS[Number(q.gabarito)] ?? q.gabarito : q.gabarito;
      return `<p><strong>${i + 1}.</strong> ${esc(ind || '—')}</p>`;
    }).join('')}</div>`;
  }
  $('#folha').innerHTML = h;
  return qs;
}
['#titulo', '#subtitulo'].forEach(s => $(s).oninput = renderFolha);
['#embaralhar', '#com-gabarito'].forEach(s => $(s).onchange = renderFolha);
$('#btn-imprimir').onclick = () => { renderFolha(); window.print(); };
$('#btn-salvar').onclick = async () => {
  if (!estado.escolhidas.size) return alert('Selecione questões primeiro');
  try { await api('/api/provas', 'POST', { titulo: $('#titulo').value, ids: [...estado.escolhidas.keys()] }); alert('Prova salva!'); } catch (e) { alert(e.message); }
};

/* ---------- salvas ---------- */
async function carregarSalvas() {
  const l = await api('/api/provas');
  $('#salvas').innerHTML = l.map(p => `<div class="q"><div class="corpo"><strong>${esc(p.titulo)}</strong> <span class="meta">por ${esc(p.autor || '?')}</span></div>
    <button data-abrir="${p.id}">Abrir</button> <button data-excl="${p.id}">Excluir</button></div>`).join('') || '<p>Nenhuma prova salva.</p>';
  $('#salvas').querySelectorAll('[data-abrir]').forEach(b => b.onclick = async () => {
    const p = await api('/api/provas/' + b.dataset.abrir);
    estado.escolhidas = new Map(p.questoes.map(q => [q.id, q])); $('#titulo').value = p.titulo; $('#qtd').textContent = estado.escolhidas.size; mostrar('prova');
  });
  $('#salvas').querySelectorAll('[data-excl]').forEach(b => b.onclick = async () => {
    try { await api('/api/provas/' + b.dataset.excl, 'DELETE'); carregarSalvas(); } catch (e) { alert(e.message); }
  });
}

/* ---------- cadastro ---------- */
$('#form-q').onsubmit = async e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const alternativas = d.alternativas.split('\n').map(s => s.trim()).filter(Boolean);
  const gabarito = alternativas.length && /^\d+$/.test(d.gabarito) ? String(Number(d.gabarito) - 1) : d.gabarito;
  try {
    await api('/api/questoes', 'POST', { ...d, alternativas, gabarito, temas: d.temas.split(',') });
    e.target.reset(); alert('Questão salva!'); atualizar();
  } catch (err) { alert(err.message); }
};
$('#arq-json').onchange = async e => {
  try {
    const r = await api('/api/importar', 'POST', JSON.parse(await e.target.files[0].text()));
    $('#msg-import').textContent = `${r.importadas} importada(s). ${r.erros.join(' | ')}`; atualizar();
  } catch (err) { $('#msg-import').textContent = 'Erro: ' + err.message; }
};

/* ---------- início ---------- */
(async () => { estado.usuario = (await api('/api/eu')).usuario; renderConta(); atualizar(); })();
