# Radar Aviação SP

Busca vagas de aviação (manutenção, planejamento, MRO, engenharia e afins) no LinkedIn, Indeed, Gupy e Vagas.com.br, por período e região de São Paulo, e mostra tudo numa lista única sem repetidas, com opção de baixar em CSV.

- `index.html`: front end estático.
- `api/vagas.js`: função da Vercel que consulta cada fonte para cada termo e junta os resultados (a mesma vaga em várias fontes vira um item só, com o link de cada fonte).
- `lib/sources/`: uma fonte por arquivo.
  - `linkedin.js`: página pública de vagas (sem login).
  - `indeed.js`: API GraphQL do app do Indeed, como no [JobSpy](https://github.com/speedyapply/JobSpy).
  - `gupy.js`: API pública do portal da Gupy.
  - `vagas.js`: página de busca do Vagas.com.br.
- `lib/locations.js`: regiões e como cada fonte as entende.

## API

`GET /api/vagas?sources=linkedin,indeed,gupy,vagas&terms=termo1|termo2&loc=sp&period=week&pages=3`

- `sources`: fontes separadas por vírgula
- `loc`: `sp`, `gru`, `cps`, `sjc`, `estado` ou `br`
- `period`: `24h`, `week`, `month` ou `any`
- `pages`: páginas de cerca de 10 vagas por termo (1 a 6, padrão 3)

## Rodar os testes

```
npm test
```

Os sites podem limitar ou bloquear consultas automáticas, e o uso deve respeitar os termos de uso do site.
