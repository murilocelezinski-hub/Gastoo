# Colaboração em Git (Gastoo)

Guia para hospedar o projeto remotamente e trabalhar em equipe.

## 1. Repositório remoto e `origin`

1. Crie um repositório **vazio** no [GitHub](https://github.com/new), GitLab ou outro serviço (sem README nem licença se você já tem commits locais).
2. Na pasta do projeto:

```bash
git remote add origin https://github.com/SEU_USUARIO/gastoo-app.git
```

(Substitua pela URL SSH ou HTTPS do seu repositório.)

Para conferir:

```bash
git remote -v
```

## 2. Primeiro envio (`main`)

```bash
git status
git add .
git commit -m "chore: estado inicial para colaboração"
git branch -M main
git push -u origin main
```

Se o remoto já tiver um commit inicial (README), use `git pull origin main --allow-unrelated-histories`, resolva conflitos se houver, depois `git push -u origin main`.

## 3. Convidar o colega

No GitHub: **Settings → Collaborators → Add people** (ou **Manage access** em repositórios da organização).

O colega aceita o convite e clona:

```bash
git clone https://github.com/SEU_USUARIO/gastoo-app.git
cd gastoo-app
npm install
cp .env.example .env
# Edite .env e defina EXPO_PUBLIC_GEMINI_API_KEY
npx expo start
```

## 4. Fluxo de trabalho recomendado

- Atualizar antes de começar: `git checkout main && git pull`.
- Criar ramo por tarefa: `git checkout -b feature/descricao-curta`.
- Commits pequenos e mensagens claras.
- Abrir **Pull Request** (ou Merge Request) para `main`, revisar e mesclar.
- Conflitos: resolver no editor, `git add` nos arquivos corrigidos, concluir o merge.

## Segredos e arquivos ignorados

- `.env` está no `.gitignore` — **não** subir chaves de API.
- Use [`.env.example`](../.env.example) só como modelo de variáveis.
- `node_modules/` e `.expo/` também são ignorados; cada um roda `npm install` após o clone.

## Resumo rápido

| Objetivo        | Comando / ação                          |
|-----------------|-----------------------------------------|
| Enviar mudanças | `git add`, `git commit`, `git push`     |
| Baixar do remoto| `git pull`                              |
| Primeira cópia  | `git clone` + `npm install` + `.env`   |
