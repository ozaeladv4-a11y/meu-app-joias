const Clientes = {
  dados: [],

  async init() {
    document.getElementById("btn-novo-cliente").addEventListener("click", () => Modals.abrirCliente());
    document.getElementById("clientes-busca").addEventListener("input", () => this.render(this.filtrar()));
    document.getElementById("tbody-clientes").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const { action, id } = btn.dataset;
      const cliente = this.dados.find((c) => c.id === id);
      if (action === "editar") Modals.abrirCliente(cliente);
      if (action === "excluir") this.excluir(id);
    });
    await this.carregar();
  },

  async carregar() {
    try {
      this.dados = await Api.clientes.listar();
      this.render(this.dados);
    } catch (err) {
      Utils.showToast(err.message, "error");
    }
  },

  filtrar() {
    const termo = document.getElementById("clientes-busca").value.trim().toLowerCase();
    if (!termo) return this.dados;
    return this.dados.filter(
      (c) => c.nome.toLowerCase().includes(termo) || (c.cpf ?? "").toLowerCase().includes(termo)
    );
  },

  render(clientes) {
    const tbody = document.getElementById("tbody-clientes");
    if (!clientes.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-slate-400 py-6">Nenhum cliente encontrado</td></tr>`;
      return;
    }
    tbody.innerHTML = clientes
      .map(
        (c) => `
      <tr class="border-b border-slate-100 hover:bg-slate-50">
        <td class="py-2 px-3">${Utils.escapeHtml(c.nome)}</td>
        <td class="py-2 px-3">${Utils.escapeHtml(c.cpf ?? "-")}</td>
        <td class="py-2 px-3">${Utils.escapeHtml(c.telefone ?? "-")}</td>
        <td class="py-2 px-3">${Utils.escapeHtml(c.endereco ?? "-")}</td>
        <td class="py-2 px-3">${Utils.formatDate(c.data_cadastro)}</td>
        <td class="py-2 px-3 space-x-2 whitespace-nowrap">
          <button data-action="editar" data-id="${c.id}" class="text-blue-600 hover:underline">Editar</button>
          <button data-action="excluir" data-id="${c.id}" class="text-red-600 hover:underline">Excluir</button>
        </td>
      </tr>
    `
      )
      .join("");
  },

  async excluir(id) {
    if (!Utils.confirmAction("Excluir este cliente definitivamente?")) return;
    try {
      await Api.clientes.excluir(id);
      Utils.showToast("Cliente excluído");
      this.carregar();
    } catch (err) {
      Utils.showToast(err.message, "error");
    }
  },
};
