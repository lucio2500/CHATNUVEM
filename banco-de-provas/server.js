import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db, salvarQuestao, listarQuestoes } from './db.js';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const SESSAO_MS = 7 * 24 * 3600 * 1000;

const json = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
};
const lerCorpo = req => new Promise((ok, falha) => {
  let s = '';
  req.on('data', c => { s += c; if (s.length > 5e6) { req.destroy(); falha(new Error('Corpo muito grande')); } });
  req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch { falha(new Error('JSON inválido')); } });
});
const hash = (senha, sal) => crypto.scryptSync(senha, sal, 64).toString('hex');

function usuarioDaSessao(req) {
  const m = /(?:^|; )sessao=([a-f0-9]+)/.exec(req.headers.cookie || '');
  if (!m) return null;
  return db.prepare(`SELECT u.id, u.nome, u.email FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
                     WHERE s.token = ? AND s.criada_em > ?`).get(m[1], Date.now() - SESSAO_MS) || null;
}
function criarSessao(res, usuarioId) {
  const token = crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT INTO sessoes VALUES (?,?,?)').run(token, usuarioId, Date.now());
  return { 'Set-Cookie': `sessao=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSAO_MS / 1000}` };
}

async function api(req, res, url) {
  const { pathname: p, searchParams: sp } = url;
  const m = req.method;
  const eu = usuarioDaSessao(req);
  const exigirLogin = () => { if (!eu) { json(res, 401, { erro: 'Faça login' }); return false; } return true; };

  if (p === '/api/eu' && m === 'GET') return json(res, 200, { usuario: eu });

  if (p === '/api/registrar' && m === 'POST') {
    const { nome, email, senha } = await lerCorpo(req);
    if (!nome || !email || !senha || senha.length < 6) return json(res, 400, { erro: 'Nome, e-mail e senha (mín. 6) obrigatórios' });
    const sal = crypto.randomBytes(16).toString('hex');
    try {
      const r = db.prepare('INSERT INTO usuarios (nome,email,senha_hash,sal) VALUES (?,?,?,?)')
        .run(nome.trim(), email.trim().toLowerCase(), hash(senha, sal), sal);
      return json(res, 200, { usuario: { id: Number(r.lastInsertRowid), nome, email } }, criarSessao(res, r.lastInsertRowid));
    } catch { return json(res, 409, { erro: 'E-mail já cadastrado' }); }
  }
  if (p === '/api/login' && m === 'POST') {
    const { email, senha } = await lerCorpo(req);
    const u = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(String(email || '').trim().toLowerCase());
    const ok = u && crypto.timingSafeEqual(Buffer.from(hash(String(senha || ''), u.sal)), Buffer.from(u.senha_hash));
    if (!ok) return json(res, 401, { erro: 'E-mail ou senha incorretos' });
    return json(res, 200, { usuario: { id: u.id, nome: u.nome, email: u.email } }, criarSessao(res, u.id));
  }
  if (p === '/api/logout' && m === 'POST') {
    const t = /sessao=([a-f0-9]+)/.exec(req.headers.cookie || '')?.[1];
    if (t) db.prepare('DELETE FROM sessoes WHERE token = ?').run(t);
    return json(res, 200, {}, { 'Set-Cookie': 'sessao=; Path=/; Max-Age=0' });
  }

  if (p === '/api/temas' && m === 'GET') {
    return json(res, 200, db.prepare(`SELECT t.nome, COUNT(qt.questao_id) AS total FROM temas t
      LEFT JOIN questoes_temas qt ON qt.tema_id = t.id GROUP BY t.id ORDER BY t.nome`).all());
  }
  if (p === '/api/fontes' && m === 'GET') {
    return json(res, 200, db.prepare("SELECT DISTINCT fonte FROM questoes WHERE fonte <> '' ORDER BY fonte").all().map(r => r.fonte));
  }

  if (p === '/api/questoes' && m === 'GET') {
    const temas = (sp.get('temas') || '').split(',').filter(Boolean);
    return json(res, 200, listarQuestoes({ temas, dificuldade: sp.get('dificuldade') || '', q: sp.get('q') || '' }));
  }
  if (p === '/api/questoes' && m === 'POST') {
    if (!exigirLogin()) return;
    const corpo = await lerCorpo(req);
    try { return json(res, 200, { id: salvarQuestao(corpo, eu.id) }); }
    catch (e) { return json(res, 400, { erro: e.message }); }
  }
  if (p === '/api/importar' && m === 'POST') {
    if (!exigirLogin()) return;
    const lista = await lerCorpo(req);
    if (!Array.isArray(lista)) return json(res, 400, { erro: 'Envie uma lista de questões' });
    let importadas = 0; const erros = [];
    lista.forEach((q, i) => { try { salvarQuestao(q, eu.id); importadas++; } catch (e) { erros.push(`#${i + 1}: ${e.message}`); } });
    return json(res, 200, { importadas, erros });
  }
  const dq = /^\/api\/questoes\/(\d+)$/.exec(p);
  if (dq && m === 'DELETE') {
    if (!exigirLogin()) return;
    const r = db.prepare('DELETE FROM questoes WHERE id = ? AND autor_id = ?').run(dq[1], eu.id);
    return r.changes ? json(res, 200, {}) : json(res, 403, { erro: 'Só o autor pode excluir' });
  }

  if (p === '/api/provas' && m === 'GET') {
    return json(res, 200, db.prepare(`SELECT p.id, p.titulo, u.nome AS autor FROM provas p
      LEFT JOIN usuarios u ON u.id = p.autor_id ORDER BY p.id DESC`).all());
  }
  if (p === '/api/provas' && m === 'POST') {
    if (!exigirLogin()) return;
    const { titulo, ids } = await lerCorpo(req);
    if (!titulo || !Array.isArray(ids) || !ids.length) return json(res, 400, { erro: 'Título e questões obrigatórios' });
    const r = db.prepare('INSERT INTO provas (titulo, autor_id, questoes) VALUES (?,?,?)')
      .run(titulo, eu.id, JSON.stringify(ids.map(Number)));
    return json(res, 200, { id: Number(r.lastInsertRowid) });
  }
  const gp = /^\/api\/provas\/(\d+)$/.exec(p);
  if (gp && m === 'GET') {
    const pr = db.prepare('SELECT * FROM provas WHERE id = ?').get(gp[1]);
    if (!pr) return json(res, 404, { erro: 'Prova não encontrada' });
    const ids = JSON.parse(pr.questoes);
    const porId = new Map(listarQuestoes({ ids }).map(q => [q.id, q]));
    return json(res, 200, { id: pr.id, titulo: pr.titulo, questoes: ids.map(i => porId.get(i)).filter(Boolean) });
  }
  if (gp && m === 'DELETE') {
    if (!exigirLogin()) return;
    const r = db.prepare('DELETE FROM provas WHERE id = ? AND autor_id = ?').run(gp[1], eu.id);
    return r.changes ? json(res, 200, {}) : json(res, 403, { erro: 'Só o autor pode excluir' });
  }
  json(res, 404, { erro: 'Rota não encontrada' });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    const arq = path.join(PUBLIC, url.pathname === '/' ? 'index.html' : url.pathname);
    if (!arq.startsWith(PUBLIC) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404); return res.end('Não encontrado'); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    fs.createReadStream(arq).pipe(res);
  } catch (e) { json(res, 500, { erro: e.message }); }
}).listen(process.env.PORT || 3000, () => console.log(`Banco de Provas em http://localhost:${process.env.PORT || 3000}`));
