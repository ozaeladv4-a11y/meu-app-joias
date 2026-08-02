const Gerencial = {
  async init() {
    document.getElementById("periodo-select").addEventListener("change", (e) => this.onPeriodoChange(e));
    document.getElementById("periodo-aplicar").addEventListener("click", () => this.carregar());
    await this.carregar();
  },

  onPeriodoChange(e) {
    const personalizado = document.getElementById("periodo-personalizado");
    personalizado.classList.toggle("hidden", e.target.value !== "personalizado");
    if (e.target.value !== "personalizado") this.carregar();
  },

  getPeriodo() {
    const select = document.getElementById("periodo-select").value;
    const hoje = new Date();
    let inicio;
    let fim = hoje;

    if (select === "mes_atual") {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    } else if (select === "30_dias") {
      inicio = new Date();
      inicio.setDate(inicio.getDate() - 29);
    } else if (select === "ano_atual") {
      inicio = new Date(hoje.getFullYear(), 0, 1);
    } else {
      const ini = document.getElementById("periodo-inicio").value;
      const f = document.getElementById("periodo-fim").value;
      if (!ini || !f) return null;
      return { data_inicio: ini, data_fim: f };
    }

    return { data_inicio: inicio.toISOString().slice(0, 10), data_fim: fim.toISOString().slice(0, 10) };
  },

  async carregar() {
    const periodo = this.getPeriodo();
    if (!periodo) return;

    try {
      const [resumo, categoria, estoqueParado, inadimplencia] = await Promise.all([
        Api.gerencial.resumo(periodo.data_inicio, periodo.data_fim),
        Api.gerencial.vendasCategoria(periodo),
        Api.gerencial.estoqueParado(),
        Api.gerencial.inadimplencia(),
      ]);

      document.getElementById("card-faturamento").textContent = Utils.formatCurrency(resumo.faturamento_total);
      document.getElementById("card-cmv").textContent = Utils.formatCurrency(resumo.cmv);
      document.getElementById("card-lucro").textContent = Utils.formatCurrency(resumo.lucro_bruto_real);
      document.getElementById("card-margem").textContent = `${resumo.margem_media_pct.toFixed(1)}%`;

      renderEvolucaoChart(resumo.serie_diaria);
      renderCategoriaChart(categoria);

      this.renderEstoqueParado(estoqueParado.pecas);
      this.renderInadimplencia(inadimplencia);
    } catch (err) {
      Utils.showToast(err.message, "error");
    }
  },

  renderEstoqueParado(pecas) {
    const alerta = pecas.filter((p) => p.dias_parado >= 60);
    const tbody = document.getElementById("tbody-estoque-parado");
    const totalEl = document.getElementById("total-imobilizado-parado");

    if (!alerta.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-slate-400 py-4">Nenhuma peça parada há mais de 60 dias 🎉</td></tr>`;
      totalEl.textContent = Utils.formatCurrency(0);
      return;
    }

    tbody.innerHTML = alerta
      .map(
        (p) => `
      <tr class="border-b border-slate-100">
        <td class="py-2 px-3">${Utils.escapeHtml(p.descricao)}</td>
        <td class="py-2 px-3">${Utils.escapeHtml(p.categoria ?? "-")}</td>
        <td class="py-2 px-3">${Utils.formatDate(p.data_entrada)}</td>
        <td class="py-2 px-3"><span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">${p.dias_parado} dias</span></td>
        <td class="py-2 px-3">${Utils.formatCurrency(p.preco_custo)}</td>
      </tr>
    `
      )
      .join("");

    const total = alerta.reduce((acc, p) => acc + (p.preco_custo || 0), 0);
    totalEl.textContent = Utils.formatCurrency(total);
  },

  renderInadimplencia(dados) {
    document.getElementById("inadimplencia-valor-atrasado").textContent = Utils.formatCurrency(dados.valor_total_atrasado);
    document.getElementById("inadimplencia-indice").textContent = `${dados.indice_atraso_pct.toFixed(1)}%`;
    document.getElementById("inadimplencia-qtd").textContent = dados.qtd_parcelas_atrasadas;
  },
};
