# Gastoo

App de finanças pessoais (Expo / React Native).

## Desenvolvimento local

```bash
npm install
cp .env.example .env
# Preencha EXPO_PUBLIC_GEMINI_API_KEY no .env para categorização com IA
npm start
```

## Colaboração em equipe (Git)

- **`main`**: código integrado.
- **`murilo`**: sua branch de trabalho.
- **`vinicius`**: branch do colega.

Fluxo completo (criar branches, dia a dia, merge na `main`): **[docs/COLLABORATION.md](docs/COLLABORATION.md)**.

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `EXPO_PUBLIC_GEMINI_API_KEY` | Chave da API Google Gemini (opcional; há fallback por palavras-chave) |

Não commite o arquivo `.env`; use apenas `.env.example` como referência.
