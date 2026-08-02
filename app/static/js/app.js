const Views = { gerencial: Gerencial, estoque: Estoque, clientes: Clientes, vendas: Vendas, parcelas: Parcelas };
const viewsInicializadas = new Set();

function fecharSidebarMobile() {
  document.getElementById("sidebar").classList.add("mobile-closed");
  document.getElementById("sidebar-overlay").classList.add("hidden");
}

function mostrarView(nome) {
  if (!Views[nome]) nome = "gerencial";

  document.querySelectorAll(".view").forEach((el) => el.classList.add("hidden"));
  document.getElementById(`view-${nome}`).classList.remove("hidden");

  document.querySelectorAll(".nav-link").forEach((el) => {
    const ativo = el.dataset.view === nome;
    el.classList.toggle("bg-slate-800", ativo);
    el.classList.toggle("text-white", ativo);
  });

  const link = document.querySelector(`.nav-link[data-view="${nome}"]`);
  document.getElementById("page-title").textContent = link?.dataset.label ?? "";

  if (!viewsInicializadas.has(nome)) {
    Views[nome].init();
    viewsInicializadas.add(nome);
  } else {
    Views[nome].carregar();
  }

  window.location.hash = nome;
  fecharSidebarMobile();
}

function rotaAtual() {
  const hash = window.location.hash.replace("#", "");
  return Views[hash] ? hash : "gerencial";
}

document.addEventListener("DOMContentLoaded", () => {
  Modals.init();

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      mostrarView(link.dataset.view);
    });
  });

  document.getElementById("btn-menu-toggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("mobile-closed");
    document.getElementById("sidebar-overlay").classList.toggle("hidden");
  });
  document.getElementById("sidebar-overlay").addEventListener("click", fecharSidebarMobile);

  window.addEventListener("hashchange", () => mostrarView(rotaAtual()));

  mostrarView(rotaAtual());
});
