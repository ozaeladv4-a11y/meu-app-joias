const API_BASE = "/api";

function qs(params) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (!entries.length) return "";
  return "?" + new URLSearchParams(entries).toString();
}

async function apiRequest(path, options = {}) {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!resp.ok) {
    let detail = `Erro ${resp.status}`;
    try {
      const body = await resp.json();
      if (body.detail) {
        detail = Array.isArray(body.detail) ? body.detail.map((d) => d.msg).join(", ") : body.detail;
      }
    } catch (_) {
      // resposta sem corpo JSON
    }
    throw new Error(detail);
  }

  if (resp.status === 204) return null;
  return resp.json();
}

const Api = {
  clientes: {
    listar: () => apiRequest("/clientes"),
    obter: (id) => apiRequest(`/clientes/${id}`),
    criar: (dados) => apiRequest("/clientes", { method: "POST", body: JSON.stringify(dados) }),
    atualizar: (id, dados) => apiRequest(`/clientes/${id}`, { method: "PUT", body: JSON.stringify(dados) }),
    excluir: (id) => apiRequest(`/clientes/${id}`, { method: "DELETE" }),
  },
  estoque: {
    listar: (params = {}) => apiRequest(`/estoque${qs(params)}`),
    obter: (id) => apiRequest(`/estoque/${id}`),
    criar: (dados) => apiRequest("/estoque", { method: "POST", body: JSON.stringify(dados) }),
    atualizar: (id, dados) => apiRequest(`/estoque/${id}`, { method: "PUT", body: JSON.stringify(dados) }),
    excluir: (id) => apiRequest(`/estoque/${id}`, { method: "DELETE" }),
    baixa: (id, status) => apiRequest(`/estoque/${id}/baixa`, { method: "POST", body: JSON.stringify({ status }) }),
  },
  vendas: {
    listar: (params = {}) => apiRequest(`/vendas${qs(params)}`),
    obter: (id) => apiRequest(`/vendas/${id}`),
    registrar: (dados) => apiRequest("/vendas", { method: "POST", body: JSON.stringify(dados) }),
  },
  parcelas: {
    listar: (params = {}) => apiRequest(`/parcelas${qs(params)}`),
    baixa: (id, dados) => apiRequest(`/parcelas/${id}/baixa`, { method: "POST", body: JSON.stringify(dados) }),
  },
  gerencial: {
    resumo: (data_inicio, data_fim) =>
      apiRequest("/gerencial/resumo", { method: "POST", body: JSON.stringify({ data_inicio, data_fim }) }),
    estoqueParado: () => apiRequest("/gerencial/estoque-parado"),
    vendasCategoria: (params = {}) => apiRequest(`/gerencial/vendas-categoria${qs(params)}`),
    inadimplencia: () => apiRequest("/gerencial/inadimplencia"),
  },
};
