# Radar Aviação SP

Busca vagas de aviação (manutenção, planejamento, MRO, engenharia e afins) no LinkedIn, por período e região de São Paulo, e mostra tudo numa lista única sem repetidas, com opção de baixar em CSV.

- `index.html`: front end estático.
- `api/vagas.js`: função da Vercel que consulta a página pública de vagas do LinkedIn (sem login) para cada termo e junta os resultados.
- `lib/linkedin.js`: busca e leitura do HTML das vagas.

## API

`GET /api/vagas?terms=termo1|termo2&location=São Paulo, Brasil&period=week&pages=3`

- `period`: `24h`, `week`, `month` ou `any`
- `pages`: páginas de cerca de 10 vagas por termo (1 a 6, padrão 3)

## Rodar os testes

```
npm test
```

O LinkedIn pode limitar ou bloquear consultas automáticas, e o uso deve respeitar os termos de uso do site.
