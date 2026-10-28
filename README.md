# Portal 137 — Explorador do Multiverso

Site acadêmico em **HTML, CSS e JavaScript puro**, integrado à [Rick and Morty API](https://rickandmortyapi.com/documentation).

## Funcionalidades

- Busca de personagens por nome, status e espécie diretamente na API.
- Cards dinâmicos com imagem, nome, status, espécie e localização.
- Paginação conforme os metadados da API (até 20 personagens por página).
- Detalhes de personagens em janela modal.
- Favoritos persistidos no navegador com `localStorage`.
- Estados de carregamento, sem resultados e erro de rede.
- Layout responsivo para celular e desktop; sem frameworks.

## Executar

Abra `index.html` no navegador com acesso à internet. Se preferir um servidor local, na pasta do site execute:

```bash
python -m http.server 8000
```

Acesse `http://localhost:8000`.

## Como provar o consumo da API

1. Abra o site e pressione `F12`.
2. Vá em **Rede (Network)** > **Fetch/XHR** e atualize a página.
3. Observe a requisição `GET` a `https://rickandmortyapi.com/api/character/?page=1`.
4. Na aba **Elementos**, veja a `div#gradePersonagens` populada por `article.character-card`.
5. No código `js/script.js`, veja `fetch`, `response.json`, `createElement` e `appendChild`.

## Estrutura

```
site/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── assets/
│   └── favicon.svg
└── README.md
```

## API e créditos

Fonte: [Rick and Morty API](https://rickandmortyapi.com/). API REST pública (GET/HTTPS), dados em JSON e paginação com até 20 resultados por página. As imagens e personagens pertencem aos respectivos titulares. Projeto educacional sem finalidade comercial.
