// Paleta categórica validada (ordem fixa — ver skill de dataviz).
const PALETA_CATEGORICA = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const COR_TEXTO_SECUNDARIO = "#52514e";
const COR_GRADE = "#e1e0d9";
const COR_SUPERFICIE = "#fcfcfb";

// Cor por entidade (categoria), atribuída na primeira vez que aparece e
// mantida estável pelo resto da sessão — nunca recolorida por posição/rank.
const categoriaCores = {};
function corParaCategoria(nome) {
  if (!(nome in categoriaCores)) {
    const usadas = Object.keys(categoriaCores).length;
    categoriaCores[nome] = PALETA_CATEGORICA[usadas % PALETA_CATEGORICA.length];
  }
  return categoriaCores[nome];
}

function hexParaRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

let evolucaoChart = null;
let categoriaChart = null;

function renderEvolucaoChart(serieDiaria) {
  const ctx = document.getElementById("chart-evolucao");
  const corVendas = PALETA_CATEGORICA[0];
  const corLucro = PALETA_CATEGORICA[1];

  const labels = serieDiaria.map((d) => Utils.formatDate(d.data));
  const faturamento = serieDiaria.map((d) => d.faturamento);
  const lucro = serieDiaria.map((d) => d.lucro);

  const dataset = (label, data, cor) => ({
    label,
    data,
    borderColor: cor,
    backgroundColor: hexParaRgba(cor, 0.1),
    pointBackgroundColor: cor,
    pointBorderColor: COR_SUPERFICIE,
    pointBorderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
    borderWidth: 2,
    tension: 0.3,
    fill: true,
  });

  if (evolucaoChart) evolucaoChart.destroy();
  evolucaoChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [dataset("Vendas", faturamento, corVendas), dataset("Lucro", lucro, corLucro)],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "bottom", labels: { color: COR_TEXTO_SECUNDARIO, usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: (item) => `${item.dataset.label}: ${Utils.formatCurrency(item.parsed.y)}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: COR_TEXTO_SECUNDARIO } },
        y: {
          grid: { color: COR_GRADE },
          ticks: { color: COR_TEXTO_SECUNDARIO, callback: (v) => Utils.formatCurrencyCompact(v) },
        },
      },
    },
  });
}

function renderCategoriaChart(dados) {
  const ctx = document.getElementById("chart-categoria");
  const labels = dados.map((d) => d.categoria);
  const valores = dados.map((d) => d.faturamento);
  const cores = labels.map((nome) => corParaCategoria(nome));

  if (categoriaChart) categoriaChart.destroy();
  categoriaChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data: valores, backgroundColor: cores, borderColor: COR_SUPERFICIE, borderWidth: 2 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { color: COR_TEXTO_SECUNDARIO, usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: (item) => `${item.label}: ${Utils.formatCurrency(item.parsed)}`,
          },
        },
      },
    },
  });
}
