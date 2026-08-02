const Parcelas = {
  dados: [],

  async init() {
    document.getElementById("parcelas-filtro-status").addEventListener("change", () => this.carregar());
    document.getElementById("tbody-parcelas").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const { action, id } = btn.dataset;
      if (action === "baixa") {
        const parcela = this.dados.find((p) => p.id === id);
        Modals.abrirBaixaParcela(parcela);
      }
    });
    await this.carregar();
  },

  async carregar() {
    const status = document.getElementById("parcelas-filtro-status").value;
    try {
      this.dados = await Api.parcelas.listar(status ? { status } : {});
      this.render(this.dados);
    } catch (err) {
      Utils.showToast(err.message, "error");
    }
  },

  render(parcelas) {
    const tbody = document.getElementById("tbody-parcelas");
    if (!parcelas.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-slate-400 py-6">Nenhuma parcela encontrada</td></tr>`;
      return;
    }
    const hoje = Utils.todayISO();
    tbody.innerHTML = parcelas
      .map((p) => {
        const atrasada = p.status === "Pendente" && p.data_vencimento < hoje;
        const cliente = p.vendas?.clientes?.nome ?? "-";
        const peca = p.vendas?.estoque?.descricao ?? "-";
        return `
        <tr class="border-b border-slate-100 hover:bg-slate-50">
          <td class="py-2 px-3">${Utils.escapeHtml(cliente)}</td>
          <td class="py-2 px-3">${Utils.escapeHtml(peca)}</td>
          <td class="py-2 px-3">${p.numero_parcela}ª</td>
          <td class="py-2 px-3">${Utils.formatDate(p.data_vencimento)}</td>
          <td class="py-2 px-3">${Utils.formatCurrency(p.valor_parcela)}</td>
          <td class="py-2 px-3">${this.badgeStatus(p.status, atrasada)}</td>
          <td class="py-2 px-3">${
            p.status === "Pendente"
              ? `<button data-action="baixa" data-id="${p.id}" class="text-amber-600 hover:underline">Dar Baixa</button>`
              : Utils.formatDate(p.data_pagamento)
          }</td>
        </tr>
      `;
      })
      .join("");
  },

  badgeStatus(status, atrasada) {
    if (status === "Paga") return `<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Paga</span>`;
    if (atrasada) return `<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Atrasada</span>`;
    return `<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Pendente</span>`;
  },
};
