const Estoque = {
  dados: [],

  async init() {
    document.getElementById("btn-nova-peca").addEventListener("click", () => Modals.abrirPeca());
    document.getElementById("estoque-filtro-status").addEventListener("change", () => this.carregar());
    document.getElementById("tbody-estoque").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const { action, id } = btn.dataset;
      const peca = this.dados.find((p) => p.id === id);
      if (action === "editar") Modals.abrirPeca(peca);
      if (action === "baixa") this.darBaixa(id);
      if (action === "excluir") this.excluir(id);
    });
    await this.carregar();
  },

  async carregar() {
    const status = document.getElementById("estoque-filtro-status").value;
    try {
      this.dados = await Api.estoque.listar(status ? { status } : {});
      this.render(this.dados);
    } catch (err) {
      Utils.showToast(err.message, "error");
    }
  },

  render(pecas) {
    const tbody = document.getElementById("tbody-estoque");
    if (!pecas.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center text-slate-400 py-6">Nenhuma peça cadastrada</td></tr>`;
      return;
    }
    tbody.innerHTML = pecas
      .map(
        (p) => `
      <tr class="border-b border-slate-100 hover:bg-slate-50">
        <td class="py-2 px-3">${Utils.escapeHtml(p.descricao)}</td>
        <td class="py-2 px-3">${Utils.escapeHtml(p.categoria ?? "-")}</td>
        <td class="py-2 px-3">${p.peso_g ?? "-"}</td>
        <td class="py-2 px-3">${Utils.formatCurrency(p.preco_custo)}</td>
        <td class="py-2 px-3">${Utils.formatCurrency(p.preco_venda)}</td>
        <td class="py-2 px-3">${p.margem_pct != null ? p.margem_pct.toFixed(1) + "%" : "-"}</td>
        <td class="py-2 px-3">${this.badgeStatus(p.status)}</td>
        <td class="py-2 px-3">${Utils.formatDate(p.data_entrada)}</td>
        <td class="py-2 px-3 space-x-2 whitespace-nowrap">
          <button data-action="editar" data-id="${p.id}" class="text-blue-600 hover:underline">Editar</button>
          ${p.status === "Disponível" ? `<button data-action="baixa" data-id="${p.id}" class="text-amber-600 hover:underline">Baixa</button>` : ""}
          <button data-action="excluir" data-id="${p.id}" class="text-red-600 hover:underline">Excluir</button>
        </td>
      </tr>
    `
      )
      .join("");
  },

  badgeStatus(status) {
    const cores = { Disponível: "bg-green-100 text-green-700", Vendido: "bg-blue-100 text-blue-700" };
    const cor = cores[status] || "bg-slate-100 text-slate-700";
    return `<span class="px-2 py-0.5 rounded-full text-xs font-medium ${cor}">${Utils.escapeHtml(status)}</span>`;
  },

  async darBaixa(id) {
    if (!Utils.confirmAction("Confirma a baixa manual desta peça (remoção do estoque sem venda)?")) return;
    try {
      await Api.estoque.baixa(id, "Baixado");
      Utils.showToast("Peça baixada com sucesso");
      this.carregar();
    } catch (err) {
      Utils.showToast(err.message, "error");
    }
  },

  async excluir(id) {
    if (!Utils.confirmAction("Excluir esta peça definitivamente?")) return;
    try {
      await Api.estoque.excluir(id);
      Utils.showToast("Peça excluída");
      this.carregar();
    } catch (err) {
      Utils.showToast(err.message, "error");
    }
  },
};
