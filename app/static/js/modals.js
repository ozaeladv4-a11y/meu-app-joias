const Modals = {
  pecasDisponiveis: [],

  init() {
    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", () => this.fechar(btn.dataset.closeModal));
    });
    document.querySelectorAll(".modal-overlay").forEach((overlay) => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) this.fechar(overlay.id);
      });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      document.querySelectorAll(".modal-overlay:not(.hidden)").forEach((overlay) => this.fechar(overlay.id));
    });

    document.getElementById("form-peca").addEventListener("submit", (e) => this.salvarPeca(e));
    document.getElementById("form-cliente").addEventListener("submit", (e) => this.salvarCliente(e));
    document.getElementById("form-venda").addEventListener("submit", (e) => this.salvarVenda(e));
    document.getElementById("form-baixa-parcela").addEventListener("submit", (e) => this.salvarBaixaParcela(e));

    document.getElementById("venda-peca").addEventListener("change", () => this.onPecaSelecionada());
    ["venda-valor", "venda-entrada", "venda-parcelas"].forEach((id) =>
      document.getElementById(id).addEventListener("input", () => this.atualizarResumoVenda())
    );
  },

  abrir(id) {
    document.getElementById(id).classList.remove("hidden");
  },

  fechar(id) {
    document.getElementById(id).classList.add("hidden");
  },

  // ---------------- Peça ----------------
  abrirPeca(peca = null) {
    const form = document.getElementById("form-peca");
    form.reset();
    document.getElementById("peca-id").value = peca?.id ?? "";
    document.getElementById("modal-peca-titulo").textContent = peca ? "Editar Peça" : "Nova Peça";
    if (peca) {
      document.getElementById("peca-descricao").value = peca.descricao ?? "";
      document.getElementById("peca-categoria").value = peca.categoria ?? "";
      document.getElementById("peca-peso").value = peca.peso_g ?? "";
      document.getElementById("peca-custo").value = peca.preco_custo ?? "";
      document.getElementById("peca-venda-preco").value = peca.preco_venda ?? "";
    }
    this.abrir("modal-peca");
  },

  async salvarPeca(e) {
    e.preventDefault();
    const id = document.getElementById("peca-id").value;
    const dados = {
      descricao: document.getElementById("peca-descricao").value.trim(),
      categoria: document.getElementById("peca-categoria").value.trim() || null,
      peso_g: Utils.numOrNull(document.getElementById("peca-peso").value),
      preco_custo: Utils.numOrNull(document.getElementById("peca-custo").value),
      preco_venda: Utils.numOrNull(document.getElementById("peca-venda-preco").value),
    };
    try {
      if (id) await Api.estoque.atualizar(id, dados);
      else await Api.estoque.criar(dados);
      Utils.showToast("Peça salva com sucesso");
      this.fechar("modal-peca");
      Estoque.carregar();
    } catch (err) {
      Utils.showToast(err.message, "error");
    }
  },

  // ---------------- Cliente ----------------
  abrirCliente(cliente = null) {
    const form = document.getElementById("form-cliente");
    form.reset();
    document.getElementById("cliente-id").value = cliente?.id ?? "";
    document.getElementById("modal-cliente-titulo").textContent = cliente ? "Editar Cliente" : "Novo Cliente";
    if (cliente) {
      document.getElementById("cliente-nome").value = cliente.nome ?? "";
      document.getElementById("cliente-cpf").value = cliente.cpf ?? "";
      document.getElementById("cliente-telefone").value = cliente.telefone ?? "";
      document.getElementById("cliente-endereco").value = cliente.endereco ?? "";
    }
    this.abrir("modal-cliente");
  },

  async salvarCliente(e) {
    e.preventDefault();
    const id = document.getElementById("cliente-id").value;
    const dados = {
      nome: document.getElementById("cliente-nome").value.trim(),
      cpf: document.getElementById("cliente-cpf").value.trim() || null,
      telefone: document.getElementById("cliente-telefone").value.trim() || null,
      endereco: document.getElementById("cliente-endereco").value.trim() || null,
    };
    try {
      if (id) await Api.clientes.atualizar(id, dados);
      else await Api.clientes.criar(dados);
      Utils.showToast("Cliente salvo com sucesso");
      this.fechar("modal-cliente");
      Clientes.carregar();
    } catch (err) {
      Utils.showToast(err.message, "error");
    }
  },

  // ---------------- Venda ----------------
  async abrirVenda() {
    document.getElementById("modal-venda-titulo").textContent = "Nova Venda";
    document.getElementById("form-venda").reset();
    document.getElementById("venda-primeira-parcela").value = Utils.todayISO();
    document.getElementById("venda-intervalo").value = 30;
    document.getElementById("venda-resultado").classList.add("hidden");
    document.getElementById("venda-form-area").classList.remove("hidden");
    this.atualizarResumoVenda();

    try {
      const [clientes, pecas] = await Promise.all([
        Api.clientes.listar(),
        Api.estoque.listar({ status: "Disponível" }),
      ]);

      if (!clientes.length) {
        Utils.showToast("Cadastre ao menos um cliente antes de registrar uma venda", "error");
      }
      if (!pecas.length) {
        Utils.showToast("Nenhuma peça disponível em estoque para venda", "error");
      }

      document.getElementById("venda-cliente").innerHTML = clientes
        .map((c) => `<option value="${c.id}">${Utils.escapeHtml(c.nome)}</option>`)
        .join("");

      this.pecasDisponiveis = pecas;
      document.getElementById("venda-peca").innerHTML = pecas
        .map((p) => `<option value="${p.id}">${Utils.escapeHtml(p.descricao)} — ${Utils.formatCurrency(p.preco_venda)}</option>`)
        .join("");

      this.onPecaSelecionada();
    } catch (err) {
      Utils.showToast(err.message, "error");
    }

    this.abrir("modal-venda");
  },

  onPecaSelecionada() {
    const pecaId = document.getElementById("venda-peca").value;
    const peca = this.pecasDisponiveis.find((p) => p.id === pecaId);
    if (peca) {
      document.getElementById("venda-valor").value = peca.preco_venda ?? "";
    }
    this.atualizarResumoVenda();
  },

  atualizarResumoVenda() {
    const valor = parseFloat(document.getElementById("venda-valor").value) || 0;
    const entrada = parseFloat(document.getElementById("venda-entrada").value) || 0;
    const parcelas = parseInt(document.getElementById("venda-parcelas").value, 10) || 0;
    const financiado = Math.max(valor - entrada, 0);
    const porParcela = parcelas > 0 ? financiado / parcelas : 0;
    document.getElementById("venda-resumo-financiado").textContent = Utils.formatCurrency(financiado);
    document.getElementById("venda-resumo-parcela").textContent = parcelas > 0 ? Utils.formatCurrency(porParcela) : "-";
  },

  async salvarVenda(e) {
    e.preventDefault();
    const dados = {
      cliente_id: document.getElementById("venda-cliente").value,
      peca_id: document.getElementById("venda-peca").value,
      valor_venda: parseFloat(document.getElementById("venda-valor").value),
      entrada: parseFloat(document.getElementById("venda-entrada").value) || 0,
      qtd_parcelas: parseInt(document.getElementById("venda-parcelas").value, 10) || 0,
      data_primeira_parcela: document.getElementById("venda-primeira-parcela").value || null,
      intervalo_dias: parseInt(document.getElementById("venda-intervalo").value, 10) || 30,
    };
    if (!dados.cliente_id || !dados.peca_id) {
      Utils.showToast("Selecione o cliente e a peça", "error");
      return;
    }
    try {
      const resultado = await Api.vendas.registrar(dados);
      Utils.showToast("Venda registrada com sucesso");
      this.mostrarCarne(resultado);
      Vendas.carregar();
      Estoque.carregar();
    } catch (err) {
      Utils.showToast(err.message, "error");
    }
  },

  mostrarCarne(venda) {
    document.getElementById("venda-form-area").classList.add("hidden");
    document.getElementById("venda-resultado").classList.remove("hidden");
    const parcelas = venda.parcelas || [];
    document.getElementById("venda-carne-corpo").innerHTML = parcelas.length
      ? parcelas
          .map(
            (p) => `
        <tr class="border-b border-slate-100">
          <td class="py-1.5 px-3">${p.numero_parcela}ª</td>
          <td class="py-1.5 px-3">${Utils.formatDate(p.data_vencimento)}</td>
          <td class="py-1.5 px-3">${Utils.formatCurrency(p.valor_parcela)}</td>
        </tr>
      `
          )
          .join("")
      : `<tr><td colspan="3" class="text-center text-slate-400 py-3">Venda quitada à vista, sem parcelas</td></tr>`;
  },

  abrirCarne(venda) {
    document.getElementById("modal-venda-titulo").textContent = "Detalhes da Venda";
    document.getElementById("venda-form-area").classList.add("hidden");
    document.getElementById("venda-resultado").classList.remove("hidden");
    this.mostrarCarne(venda);
    this.abrir("modal-venda");
  },

  // ---------------- Baixa de Parcela ----------------
  abrirBaixaParcela(parcela) {
    document.getElementById("baixa-parcela-id").value = parcela.id;
    document.getElementById("baixa-parcela-info").textContent =
      `Parcela ${parcela.numero_parcela}ª — vencimento ${Utils.formatDate(parcela.data_vencimento)}`;
    document.getElementById("baixa-valor-pago").value = parcela.valor_parcela;
    document.getElementById("baixa-data-pagamento").value = Utils.todayISO();
    document.getElementById("baixa-forma-pagamento").value = "";
    document.getElementById("baixa-observacoes").value = "";
    this.abrir("modal-baixa-parcela");
  },

  async salvarBaixaParcela(e) {
    e.preventDefault();
    const id = document.getElementById("baixa-parcela-id").value;
    const dados = {
      valor_pago: parseFloat(document.getElementById("baixa-valor-pago").value),
      forma_pagamento: document.getElementById("baixa-forma-pagamento").value.trim() || null,
      data_pagamento: document.getElementById("baixa-data-pagamento").value || null,
      observacoes: document.getElementById("baixa-observacoes").value.trim() || null,
    };
    try {
      await Api.parcelas.baixa(id, dados);
      Utils.showToast("Baixa registrada com sucesso");
      this.fechar("modal-baixa-parcela");
      Parcelas.carregar();
    } catch (err) {
      Utils.showToast(err.message, "error");
    }
  },
};
