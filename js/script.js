"use strict";

// API pública utilizada no projeto. Documentação: https://rickandmortyapi.com/documentation
const API_URL = "https://rickandmortyapi.com/api/character";
const FAVORITES_KEY = "portal137_favoritos_v1";
const ELEMENTOS = {
  grade: document.getElementById("gradePersonagens"),
  feedback: document.getElementById("feedback"),
  form: document.getElementById("filtrosForm"),
  busca: document.getElementById("busca"),
  status: document.getElementById("filtroStatus"),
  especie: document.getElementById("filtroEspecie"),
  todos: document.getElementById("botaoTodos"),
  favoritos: document.getElementById("botaoFavoritos"),
  atalhos: document.getElementById("atalhoFavoritos"),
  resultados: document.getElementById("contadorResultados"),
  legenda: document.getElementById("legendaResultados"),
  apiStatus: document.getElementById("apiStatus"),
  contadorFavoritos: document.getElementById("contadorFavoritos"),
  favoritosAba: document.getElementById("favoritosNaAba"),
  paginacao: document.getElementById("paginacao"),
  paginaAnterior: document.getElementById("paginaAnterior"),
  proximaPagina: document.getElementById("proximaPagina"),
  indicadorPagina: document.getElementById("indicadorPagina"),
  modal: document.getElementById("modalPersonagem"),
  modalConteudo: document.getElementById("modalConteudo"),
  fecharModal: document.getElementById("fecharModal")
};

let paginaAtual = 1;
let totalPaginas = 1;
let modoFavoritos = false;
let temporizadorBusca;
let requisicaoAtual;
let versaoRequisicao = 0;
let favoritos = carregarFavoritos();

function carregarFavoritos() {
  try {
    const dados = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return Array.isArray(dados) ? dados.filter(item => item && Number.isInteger(item.id)) : [];
  } catch (_) {
    return [];
  }
}

function salvarFavoritos() {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoritos)); }
  catch (_) { /* A navegação continua funcionando em modo privado/sem armazenamento. */ }
  ELEMENTOS.contadorFavoritos.textContent = String(favoritos.length);
  ELEMENTOS.favoritosAba.textContent = String(favoritos.length);
}

function tituloStatus(status) {
  return ({ Alive: "Vivo", Dead: "Morto", unknown: "Desconhecido" })[status] || "Desconhecido";
}

function classeStatus(status) {
  return ({ Alive: "status-alive", Dead: "status-dead" })[status] || "status-unknown";
}

function criarElemento(tag, classe, texto) {
  // createElement() cria um elemento HTML na memória; o card só entra na página com appendChild().
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function criarLinhaDetalhe(rotulo, valor) {
  const linha = criarElemento("div", "detail-line");
  linha.appendChild(criarElemento("span", "", rotulo));
  const conteudo = criarElemento("strong", "", valor || "Não informado");
  conteudo.title = valor || "Não informado";
  linha.appendChild(conteudo);
  return linha;
}

function criarCard(personagem) {
  const card = criarElemento("article", "character-card");
  const picture = criarElemento("div", "card-picture");
  const imagem = criarElemento("img");
  imagem.src = personagem.image;
  imagem.alt = `Imagem de ${personagem.name}`;
  imagem.loading = "lazy";
  imagem.width = 300;
  imagem.height = 300;
  picture.appendChild(imagem);
  picture.appendChild(criarElemento("span", "card-id", `#${String(personagem.id).padStart(3, "0")}`));

  const botaoFavorito = criarElemento("button", "favorite-button", "♥");
  botaoFavorito.type = "button";
  const estaFavorito = favoritos.some(item => item.id === personagem.id);
  botaoFavorito.classList.toggle("is-favorite", estaFavorito);
  botaoFavorito.setAttribute("aria-pressed", String(estaFavorito));
  botaoFavorito.setAttribute("aria-label", estaFavorito ? `Remover ${personagem.name} dos favoritos` : `Adicionar ${personagem.name} aos favoritos`);
  botaoFavorito.addEventListener("click", () => {
    if (favoritos.some(item => item.id === personagem.id)) {
      favoritos = favoritos.filter(item => item.id !== personagem.id);
    } else {
      favoritos.push(personagem);
    }
    salvarFavoritos();
    if (modoFavoritos) {
      paginaAtual = 1;
      carregarPersonagens();
    } else {
      const ativo = favoritos.some(item => item.id === personagem.id);
      botaoFavorito.classList.toggle("is-favorite", ativo);
      botaoFavorito.setAttribute("aria-pressed", String(ativo));
      botaoFavorito.setAttribute("aria-label", ativo ? `Remover ${personagem.name} dos favoritos` : `Adicionar ${personagem.name} aos favoritos`);
    }
  });
  picture.appendChild(botaoFavorito);
  card.appendChild(picture);

  const info = criarElemento("div", "card-content");
  info.appendChild(criarElemento("h3", "", personagem.name));
  info.appendChild(criarElemento("span", `status-chip ${classeStatus(personagem.status)}`, tituloStatus(personagem.status)));
  const detalhes = criarElemento("div", "card-details");
  detalhes.appendChild(criarLinhaDetalhe("Espécie", personagem.species));
  detalhes.appendChild(criarLinhaDetalhe("Localização", personagem.location?.name));
  info.appendChild(detalhes);
  const botaoDetalhes = criarElemento("button", "view-button");
  botaoDetalhes.type = "button";
  botaoDetalhes.appendChild(criarElemento("span", "", "VER FICHA COMPLETA"));
  botaoDetalhes.appendChild(criarElemento("span", "", "↗"));
  botaoDetalhes.addEventListener("click", () => abrirDetalhes(personagem));
  info.appendChild(botaoDetalhes);
  card.appendChild(info);
  return card;
}

function renderizarCards(personagens) {
  // O HTML original tem somente a div #gradePersonagens, SEM cards fixos.
  // Cada card é criado automaticamente com createElement() + appendChild().
  const fragmento = document.createDocumentFragment();
  personagens.forEach(personagem => fragmento.appendChild(criarCard(personagem)));
  ELEMENTOS.grade.replaceChildren();
  ELEMENTOS.grade.appendChild(fragmento);
  ELEMENTOS.grade.setAttribute("aria-busy", "false");
}

function mostrarCarregamento() {
  ELEMENTOS.grade.replaceChildren();
  ELEMENTOS.grade.setAttribute("aria-busy", "true");
  ELEMENTOS.feedback.hidden = true;
  ELEMENTOS.paginacao.hidden = true;
  for (let i = 0; i < 8; i++) {
    const card = criarElemento("div", "skeleton");
    card.setAttribute("aria-hidden", "true");
    card.appendChild(criarElemento("div", "skeleton-photo"));
    const corpo = criarElemento("div", "skeleton-body");
    corpo.appendChild(criarElemento("div", "skeleton-line medium"));
    corpo.appendChild(criarElemento("div", "skeleton-line short"));
    corpo.appendChild(criarElemento("div", "skeleton-line"));
    card.appendChild(corpo);
    ELEMENTOS.grade.appendChild(card);
  }
}

function mostrarMensagem(titulo, descricao, permitirRetry = false) {
  ELEMENTOS.grade.replaceChildren();
  ELEMENTOS.grade.setAttribute("aria-busy", "false");
  ELEMENTOS.feedback.hidden = false;
  ELEMENTOS.feedback.replaceChildren();
  ELEMENTOS.feedback.appendChild(criarElemento("strong", "", titulo));
  ELEMENTOS.feedback.appendChild(criarElemento("p", "", descricao));
  if (permitirRetry) {
    const botao = criarElemento("button", "", "Tentar novamente");
    botao.type = "button";
    botao.addEventListener("click", carregarPersonagens);
    ELEMENTOS.feedback.appendChild(botao);
  }
}

function atualizarPaginacao() {
  ELEMENTOS.paginacao.hidden = totalPaginas <= 1;
  ELEMENTOS.indicadorPagina.textContent = `Página ${paginaAtual} de ${totalPaginas}`;
  ELEMENTOS.paginaAnterior.disabled = paginaAtual <= 1;
  ELEMENTOS.proximaPagina.disabled = paginaAtual >= totalPaginas;
}

function filtrarFavoritos() {
  const nome = ELEMENTOS.busca.value.trim().toLocaleLowerCase("pt-BR");
  const status = ELEMENTOS.status.value.toLowerCase();
  const especie = ELEMENTOS.especie.value.toLowerCase();
  return favoritos.filter(item =>
    (!nome || item.name.toLocaleLowerCase("pt-BR").includes(nome)) &&
    (!status || item.status.toLowerCase() === status) &&
    (!especie || item.species.toLowerCase().includes(especie))
  );
}

async function carregarPersonagens() {
  // Evita que uma resposta antiga substitua resultados de uma pesquisa mais recente.
  if (requisicaoAtual) requisicaoAtual.abort();
  const minhaVersao = ++versaoRequisicao;
  mostrarCarregamento();
  ELEMENTOS.legenda.textContent = modoFavoritos ? "Mostrando itens salvos neste navegador" : "Consultando a API em tempo real...";

  if (modoFavoritos) {
    const lista = filtrarFavoritos();
    totalPaginas = Math.max(1, Math.ceil(lista.length / 20));
    paginaAtual = Math.min(paginaAtual, totalPaginas);
    ELEMENTOS.resultados.textContent = lista.length.toLocaleString("pt-BR");
    ELEMENTOS.legenda.textContent = `${lista.length} favorito(s) encontrado(s)`;
    if (lista.length === 0) mostrarMensagem("Nenhum favorito por aqui", "Clique no coração dos personagens para guardar seus favoritos, ou ajuste os filtros.");
    else renderizarCards(lista.slice((paginaAtual - 1) * 20, paginaAtual * 20));
    atualizarPaginacao();
    return;
  }

  requisicaoAtual = new AbortController();
  const parametros = new URLSearchParams();
  parametros.set("page", String(paginaAtual));
  if (ELEMENTOS.busca.value.trim()) parametros.set("name", ELEMENTOS.busca.value.trim());
  if (ELEMENTOS.status.value) parametros.set("status", ELEMENTOS.status.value);
  if (ELEMENTOS.especie.value) parametros.set("species", ELEMENTOS.especie.value);
  const url = `${API_URL}/?${parametros.toString()}`;

  try {
    // fetch() faz a requisição GET, response.json() interpreta a resposta JSON.
    const response = await fetch(url, { signal: requisicaoAtual.signal });
    if (minhaVersao !== versaoRequisicao) return;
    if (response.status === 404) {
      totalPaginas = 1;
      ELEMENTOS.resultados.textContent = "0";
      ELEMENTOS.legenda.textContent = "Nenhum resultado para estes filtros";
      ELEMENTOS.apiStatus.textContent = "Conexão estabelecida com a API";
      mostrarMensagem("Ninguém nesta dimensão", "Não encontramos personagens com esses filtros. Tente outro nome, status ou espécie.");
      atualizarPaginacao();
      return;
    }
    if (!response.ok) throw new Error(`API retornou HTTP ${response.status}`);
    const dados = await response.json();
    if (minhaVersao !== versaoRequisicao) return;
    const personagens = Array.isArray(dados.results) ? dados.results : [];
    totalPaginas = Math.max(1, Number(dados.info?.pages) || 1);
    ELEMENTOS.resultados.textContent = Number(dados.info?.count || 0).toLocaleString("pt-BR");
    ELEMENTOS.legenda.textContent = `${personagens.length} personagens nesta página • dados da API`;
    ELEMENTOS.apiStatus.textContent = "Conectado à API pública";
    renderizarCards(personagens);
    atualizarPaginacao();
  } catch (erro) {
    if (erro.name === "AbortError" || minhaVersao !== versaoRequisicao) return;
    ELEMENTOS.apiStatus.textContent = "Não foi possível conectar à API";
    ELEMENTOS.resultados.textContent = "—";
    ELEMENTOS.legenda.textContent = "Falha na consulta";
    mostrarMensagem("Portal temporariamente indisponível", "Confira sua conexão com a internet e tente novamente. Os cards precisam de dados ao vivo da API.", true);
    console.error("Erro ao buscar personagens:", erro);
  }
}

function trocarModo(favoritosAtivos) {
  modoFavoritos = favoritosAtivos;
  paginaAtual = 1;
  ELEMENTOS.todos.classList.toggle("active", !modoFavoritos);
  ELEMENTOS.favoritos.classList.toggle("active", modoFavoritos);
  ELEMENTOS.todos.setAttribute("aria-pressed", String(!modoFavoritos));
  ELEMENTOS.favoritos.setAttribute("aria-pressed", String(modoFavoritos));
  carregarPersonagens();
}

function adicionarFato(container, titulo, valor) {
  const fato = criarElemento("div", "dialog-fact");
  fato.appendChild(criarElemento("span", "", titulo));
  fato.appendChild(criarElemento("strong", "", valor || "Não informado"));
  container.appendChild(fato);
}

function abrirDetalhes(personagem) {
  ELEMENTOS.modalConteudo.replaceChildren();
  const img = criarElemento("img", "dialog-photo");
  img.src = personagem.image;
  img.alt = `Retrato de ${personagem.name}`;
  img.width = 300;
  img.height = 300;
  ELEMENTOS.modalConteudo.appendChild(img);
  const corpo = criarElemento("div", "dialog-body");
  corpo.appendChild(criarElemento("span", "dialog-eyebrow", `PERSONAGEM #${personagem.id} / REGISTRO DO MULTIVERSO`));
  const titulo = criarElemento("h2", "", personagem.name);
  titulo.id = "modalTitulo";
  corpo.appendChild(titulo);
  corpo.appendChild(criarElemento("span", `status-chip ${classeStatus(personagem.status)}`, tituloStatus(personagem.status)));
  const fatos = criarElemento("div", "dialog-facts");
  adicionarFato(fatos, "Espécie", personagem.species);
  adicionarFato(fatos, "Gênero", ({ Male: "Masculino", Female: "Feminino", Genderless: "Sem gênero", unknown: "Desconhecido" })[personagem.gender] || personagem.gender);
  adicionarFato(fatos, "Origem", personagem.origin?.name);
  adicionarFato(fatos, "Última localização", personagem.location?.name);
  adicionarFato(fatos, "Episódios", String(personagem.episode?.length ?? 0));
  adicionarFato(fatos, "Tipo", personagem.type || "Não informado");
  corpo.appendChild(fatos);
  corpo.appendChild(criarElemento("p", "dialog-note", "Informações obtidas diretamente da API pública Rick and Morty."));
  ELEMENTOS.modalConteudo.appendChild(corpo);
  ELEMENTOS.modal.showModal();
}

ELEMENTOS.form.addEventListener("submit", evento => evento.preventDefault());
ELEMENTOS.busca.addEventListener("input", () => {
  clearTimeout(temporizadorBusca);
  temporizadorBusca = setTimeout(() => { paginaAtual = 1; carregarPersonagens(); }, 420);
});
[ELEMENTOS.status, ELEMENTOS.especie].forEach(campo => campo.addEventListener("change", () => {
  paginaAtual = 1;
  carregarPersonagens();
}));
ELEMENTOS.form.addEventListener("reset", () => {
  clearTimeout(temporizadorBusca);
  // Espera o reset nativo do formulário aplicar os valores antes de buscar.
  setTimeout(() => { paginaAtual = 1; carregarPersonagens(); }, 0);
});
ELEMENTOS.todos.addEventListener("click", () => trocarModo(false));
ELEMENTOS.favoritos.addEventListener("click", () => trocarModo(true));
ELEMENTOS.atalhos.addEventListener("click", () => { trocarModo(true); });
ELEMENTOS.paginaAnterior.addEventListener("click", () => { if (paginaAtual > 1) { paginaAtual--; carregarPersonagens(); document.getElementById("personagens").scrollIntoView({ behavior: "smooth" }); } });
ELEMENTOS.proximaPagina.addEventListener("click", () => { if (paginaAtual < totalPaginas) { paginaAtual++; carregarPersonagens(); document.getElementById("personagens").scrollIntoView({ behavior: "smooth" }); } });
ELEMENTOS.fecharModal.addEventListener("click", () => ELEMENTOS.modal.close());
ELEMENTOS.modal.addEventListener("click", evento => { if (evento.target === ELEMENTOS.modal) ELEMENTOS.modal.close(); });
document.addEventListener("keydown", evento => {
  if (evento.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName) && !ELEMENTOS.modal.open) {
    evento.preventDefault();
    ELEMENTOS.busca.focus();
  }
});

salvarFavoritos();
carregarPersonagens();
