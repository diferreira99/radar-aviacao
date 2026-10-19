# Radar Emprego Novo

Junta as vagas do LinkedIn, Indeed, Gupy e Vagas.com.br numa lista só, sem repetidas, com as mais importantes do nicho no topo, status de candidatura, alerta diário no WhatsApp e busca de posts de recrutadores.

O nicho padrão é **aviação** (manutenção, planejamento, MRO, engenharia). O nicho **Livre** busca qualquer termo, sem filtro. Para abrir um nicho novo, acrescente uma entrada em `lib/niches.js` (termos padrão, vocabulário do cargo e da empresa, faixas de destaque).

## Estrutura

- `index.html`: o site (também instalável como app: `manifest.json`, `sw.js`, `icon*.png`).
- `api/vagas.js`: busca nas fontes escolhidas e junta a mesma vaga encontrada em mais de uma, com o link de cada fonte. O site chama uma fonte por vez, em paralelo, para mostrar o que já chegou.
- `api/detalhe.js` + `lib/details.js`: abre o anúncio e resume licenças, inglês, experiência, salário, regime e requisitos.
- `api/nichos.js` + `lib/niches.js`: nichos disponíveis.
- `api/sync.js`: guarda e lê os status (vista, candidatei, entrevista, descartada) por código de sincronização, num webhook do n8n.
- `api/saude.js`: confere se cada fonte e a leitura de anúncios estão respondendo.
- `lib/sources/`: uma fonte por arquivo.
  - `linkedin.js`: página pública de vagas (sem login).
  - `indeed.js`: API GraphQL do app do Indeed, como no [JobSpy](https://github.com/speedyapply/JobSpy).
  - `gupy.js`: busca do portal da Gupy (`portal.gupy.io/api/job-search/jobs`).
  - `vagas.js`: página de busca do Vagas.com.br.
- `lib/locations.js`: regiões e como cada fonte as entende.
- `lib/relevance.js`: marca se a vaga é do nicho (pelo cargo ou pela empresa) e dá a nota para ordenar.

A seção "Posts de recrutadores no LinkedIn" só monta links de busca de posts: quem abre é o navegador da pessoa, já logado, sem automação na conta.

No navegador ficam guardados os filtros, o currículo, a última busca, as vagas já vistas (para marcar as novas) e os status. Com um código de sincronização, os status também vão para o n8n e aparecem em outros aparelhos.

## API

`GET /api/vagas?sources=linkedin,indeed,gupy,vagas&terms=termo1|termo2&loc=sp&period=week&pages=3&niche=aviacao`

- `sources`: fontes separadas por vírgula
- `loc`: `sp`, `gru`, `cps`, `sjc`, `jun`, `sor`, `bau`, `tau`, `estado` ou `br`
- `period`: `24h`, `week`, `month` ou `any`
- `pages`: páginas de cerca de 10 vagas por termo (1 a 6, padrão 3)
- `niche`: chave de `lib/niches.js` (padrão `aviacao`)
- `debug=1`: inclui um trecho da resposta de cada fonte

`GET /api/saude?termo=manutenção` · `GET /api/nichos` · `GET /api/detalhe?source=linkedin&url=…` · `POST /api/sync`

Variáveis de ambiente opcionais: `SYNC_WEBHOOK_URL` e `SYNC_TOKEN` (substituem os valores do webhook de sincronização).

## Rodar os testes

```
npm test
```

Os sites podem limitar ou bloquear consultas automáticas, e o uso deve respeitar os termos de uso de cada site.
