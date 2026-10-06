import { DatabaseSync } from 'node:sqlite';

export const db = new DatabaseSync(process.env.DB_FILE || 'banco.db');
db.exec(`
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY, nome TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL, sal TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessoes (
  token TEXT PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criada_em INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS temas (
  id INTEGER PRIMARY KEY, nome TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS questoes (
  id INTEGER PRIMARY KEY,
  enunciado TEXT NOT NULL,
  alternativas TEXT NOT NULL DEFAULT '[]',   -- JSON; vazio = questão dissertativa
  gabarito TEXT NOT NULL DEFAULT '',         -- índice da alternativa (0 = A) ou resposta esperada
  dificuldade TEXT NOT NULL DEFAULT 'média',
  fonte TEXT NOT NULL DEFAULT '',            -- prova de origem, ex.: "Prova 1 - 2024"
  autor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS questoes_temas (
  questao_id INTEGER NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
  tema_id INTEGER NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
  PRIMARY KEY (questao_id, tema_id)
);
CREATE TABLE IF NOT EXISTS provas (
  id INTEGER PRIMARY KEY, titulo TEXT NOT NULL, autor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  questoes TEXT NOT NULL                     -- JSON: lista de ids na ordem
);
`);

export function salvarQuestao(q, autorId) {
  const temas = [...new Set((q.temas || []).map(t => String(t).trim().toLowerCase()).filter(Boolean))];
  if (!String(q.enunciado || '').trim()) throw new Error('Enunciado obrigatório');
  if (!temas.length) throw new Error('Informe ao menos um tema');
  const alternativas = (q.alternativas || []).map(a => String(a).trim()).filter(Boolean);
  db.exec('BEGIN');
  try {
    const r = db.prepare(
      'INSERT INTO questoes (enunciado, alternativas, gabarito, dificuldade, fonte, autor_id) VALUES (?,?,?,?,?,?)'
    ).run(String(q.enunciado).trim(), JSON.stringify(alternativas), String(q.gabarito ?? ''),
      q.dificuldade || 'média', q.fonte || '', autorId ?? null);
    for (const t of temas) {
      db.prepare('INSERT OR IGNORE INTO temas (nome) VALUES (?)').run(t);
      const tid = db.prepare('SELECT id FROM temas WHERE nome = ?').get(t).id;
      db.prepare('INSERT INTO questoes_temas VALUES (?,?)').run(r.lastInsertRowid, tid);
    }
    db.exec('COMMIT');
    return Number(r.lastInsertRowid);
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

export function listarQuestoes({ temas = [], dificuldade = '', q = '', ids = null } = {}) {
  const where = [], params = [];
  if (ids) { where.push(`q.id IN (${ids.map(() => '?').join(',') || 'NULL'})`); params.push(...ids); }
  if (temas.length) {
    where.push(`q.id IN (SELECT questao_id FROM questoes_temas qt JOIN temas t ON t.id = qt.tema_id
                         WHERE t.nome IN (${temas.map(() => '?').join(',')}))`);
    params.push(...temas);
  }
  if (dificuldade) { where.push('q.dificuldade = ?'); params.push(dificuldade); }
  if (q) { where.push('q.enunciado LIKE ?'); params.push(`%${q}%`); }
  const rows = db.prepare(`
    SELECT q.*, (SELECT group_concat(t.nome, ',') FROM questoes_temas qt JOIN temas t ON t.id = qt.tema_id
                 WHERE qt.questao_id = q.id) AS temas
    FROM questoes q ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY q.id`).all(...params);
  return rows.map(r => ({ ...r, alternativas: JSON.parse(r.alternativas), temas: r.temas ? r.temas.split(',') : [] }));
}
