import { salvarQuestao, db } from './db.js';
import fs from 'node:fs';

const arquivo = process.argv[2] || 'exemplo-questoes.json';
const lista = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
if (!db.prepare('SELECT 1 FROM usuarios LIMIT 1').get()) {
  db.prepare("INSERT INTO usuarios (nome,email,senha_hash,sal) VALUES ('Importação','importacao@local','-','-')").run();
}
const autor = db.prepare('SELECT id FROM usuarios ORDER BY id LIMIT 1').get().id;
lista.forEach(q => salvarQuestao(q, autor));
console.log(`${lista.length} questões importadas de ${arquivo}`);
