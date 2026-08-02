const Vendas = {
  dados: [],

  async init() {
    document.getElementById("btn-nova-venda").addEventListener("click", () => Modals.abrirVenda());
    document.getElementById("vendas-filtro-status").addEventListener("change", () => this.carregar());
    document.getElementById("tbody-vendas").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const { action, id } = btn.dataset;
      if (action === "ver-carne") this.verCarne(id);
    });
    await this.carregar();
  },

  async carregar() {
    const status_venda = document.getElementById("vendas-filtro-status").value;
    try {
      this.dados = await Api.vendas.listar(status_venda ? { status_venda } : {});
      this.render(this.dados);
    } catch (err) {
      Utils.showToast(err.message, "error");
    }
  },

  render(vendas) {
    const tbody = document.getElementById("tbody-vendas");
    if (!vendas.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-slate-400 py-6">Nenhuma venda registrada</td></tr>`;
      return;
    }
    tbody.innerHTML = vendas
      .map(
        (v) => `
      <tr class="border-b border-slate-100 hover:bg-slate-50">
        <td class="py-2 px-3">${Utils.formatDate(v.data_venda)}</td>
        <td class="py-2 px-3">${Utils.escapeHtml(v.clientes?.nome ?? "-")}</td>
        <td class="py-2 px-3">${Utils.escapeHtml(v.estoque?.descricao ?? "-")}</td>
        <td class="py-2 px-3">${Utils.formatCurrency(v.valor_venda)}</td>
        <td class="py-2 px-3">${Utils.formatCurrency(v.entrada)}</td>
        <td class="py-2 px-3">${v.qtd_parcelas ?? 0}x</td>
        <td class="py-2 px-3">${this.badgeStatus(v.status_venda)}</td>
        <td class="py-2 px-3"><button data-action="ver-carne" data-id="${v.id}" class="text-blue-600 hover:underline">Ver Carnê</button></td>
      </tr>
    `
      )
      .join("");
  },

  badgeStatus(status) {
    const cores = { Quitada: "bg-green-100 text-green-700", "Em Andamento": "bg-amber-100 text-amber-700" };
    const cor = cores[status] || "bg-slate-100 text-slate-700";
    return `<span class="px-2 py-0.5 rounded-full text-xs font-medium ${cor}">${Utils.escapeHtml(status ?? "-")}</span>`;
  },

  async verCarne(id) {
    try {
      const venda = await Api.vendas.obter(id);
      Modals.abrirCarne(venda);
    } catch (err) {
      Utils.showToast(err.message, "error");
    }
  },
};
