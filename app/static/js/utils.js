const Utils = {
  formatCurrency(value) {
    return (value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  },

  formatCurrencyCompact(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value ?? 0);
  },

  formatDate(isoString) {
    if (!isoString) return "-";
    const [y, m, d] = isoString.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  },

  todayISO() {
    return new Date().toISOString().slice(0, 10);
  },

  numOrNull(value) {
    if (value === "" || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  },

  confirmAction(message) {
    return window.confirm(message);
  },

  showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const cores = { success: "bg-emerald-600", error: "bg-red-600" };
    const toast = document.createElement("div");
    toast.className = `${cores[type] || cores.success} text-white px-4 py-3 rounded-md shadow-lg text-sm animate-fade-in max-w-xs`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  },
};
