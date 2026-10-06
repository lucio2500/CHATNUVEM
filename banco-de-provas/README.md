# Banco de Provas

Cadastre questões com temas, filtre por tema, monte a prova na tela e imprima/salve em PDF.

## Rodar
    npm run seed      # opcional: importa exemplo-questoes.json
    npm start         # http://localhost:3000

Requer Node 22.5+. Sem dependências externas (SQLite embutido, arquivo `banco.db`).

## Usar
1. Crie uma conta (qualquer visitante pode ver o banco; só logados cadastram e salvam provas).
2. **Banco de questões**: marque temas, dificuldade ou busque texto; marque as questões desejadas.
3. **Minha prova**: ajuste título, embaralhe, inclua gabarito e clique em *Imprimir / salvar PDF*
   (no diálogo de impressão escolha "Salvar como PDF").
4. **Importar** suas provas antigas: converta as questões para o formato de `exemplo-questoes.json`.
