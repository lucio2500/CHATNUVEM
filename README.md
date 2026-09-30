# CHAT NUVEM ☁️

Repositório de aprendizado: **como usar o GitHub** e **como usar o Claude Code na nuvem**.

Aqui não existe erro grave: tudo que for feito pode ser desfeito. É um espaço para testar.

---

## 1. O que é o GitHub?

O GitHub é um "Google Drive para código", só que **guarda o histórico de todas as mudanças**.

| Termo | O que significa |
|---|---|
| **Repositório (repo)** | Uma pasta de projeto no GitHub. Este aqui é o `CHATNUVEM`. |
| **Arquivo** | O conteúdo do projeto (textos, código, imagens). |
| **Commit** | Uma "foto" salva das mudanças, com uma mensagem explicando o que mudou. |
| **Branch (ramo)** | Uma cópia paralela do projeto para testar mudanças sem mexer na versão principal. A principal se chama `main`. |
| **Push** | Enviar os commits para o GitHub. |
| **Pull Request (PR)** | Um pedido para juntar as mudanças de uma branch na `main`. Você revisa e aprova. |
| **Merge** | O ato de juntar (aceitar) um Pull Request. |

**Fluxo típico:**

```
main ──●──────────────●──  (versão oficial)
        \            /
         ●───●───●──      (branch de teste → Pull Request → Merge)
```

---

## 2. O que é o Claude Code na nuvem?

É o Claude trabalhando **dentro do seu repositório**, num computador na nuvem.
Você pede em português, e ele:

1. lê os arquivos do projeto;
2. cria ou altera arquivos;
3. faz o **commit** e o **push** para uma branch;
4. se você pedir, abre um **Pull Request** para você revisar.

**Onde acessar:** [claude.ai/code](https://claude.ai/code) (navegador, celular ou app desktop).

**Como começar uma sessão:**

1. Abra [claude.ai/code](https://claude.ai/code).
2. Escolha o repositório (`lucio2500/CHATNUVEM`).
3. Escreva o que você quer, como numa conversa.

**Importante:** o computador da nuvem é temporário. O que não for enviado (push) ao GitHub se perde quando a sessão termina.
Por isso o Claude sempre faz o push no final.

---

## 3. Exercícios para praticar

Faça um de cada vez, numa sessão do Claude Code com este repositório:

- [ ] **Exercício 1:** peça *"Crie um arquivo `anotacoes.md` com uma lista das coisas que aprendi hoje"*.
      Depois, veja o arquivo aqui no GitHub.
- [ ] **Exercício 2:** peça *"Abra um Pull Request com essa mudança"*.
      Na aba **Pull requests** do GitHub, abra o PR, veja a aba **Files changed** e clique em **Merge**.
- [ ] **Exercício 3:** peça *"Crie uma página HTML simples de boas-vindas e explique cada parte"*.
- [ ] **Exercício 4:** no GitHub, clique em **Commits** (ícone de relógio) e veja o histórico de tudo que foi feito.
- [ ] **Exercício 5:** edite um arquivo **direto pelo site** do GitHub (ícone de lápis ✏️) e faça um commit você mesmo.

---

## 4. Dicas

- Seja específico nos pedidos: *"adicione um título azul"* funciona melhor que *"deixe bonito"*.
- Pode pedir explicações: *"explique o que você fez como se eu fosse iniciante"*.
- Errou? Peça *"desfaça a última mudança"*: o histórico do Git permite voltar atrás.

📚 Documentação oficial: <https://code.claude.com/docs/en/claude-code-on-the-web>
