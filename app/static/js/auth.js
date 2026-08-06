const Auth = {
  async init() {
    let autenticado = false;
    try {
      const resp = await fetch("/api/auth/status");
      const dados = await resp.json();
      autenticado = !!dados.authenticated;
    } catch (_) {
      autenticado = false;
    }

    if (autenticado) {
      this.desbloquear(true);
    } else {
      this.bloquear();
    }

    document.getElementById("form-lock-screen").addEventListener("submit", (e) => this.tentarLogin(e));
    document.getElementById("btn-recuperar-senha").addEventListener("click", () => this.mostrarRecuperacao());
    document.getElementById("btn-sair").addEventListener("click", () => this.sair());
  },

  bloquear() {
    document.getElementById("lock-screen").classList.remove("hidden");
    document.body.classList.add("locked");
    document.getElementById("lock-senha").focus();
  },

  desbloquear(iniciar) {
    document.getElementById("lock-screen").classList.add("hidden");
    document.body.classList.remove("locked");
    if (iniciar) iniciarApp();
  },

  async tentarLogin(e) {
    e.preventDefault();
    const senha = document.getElementById("lock-senha").value;
    const erro = document.getElementById("lock-erro");
    const botao = document.getElementById("btn-entrar");

    erro.classList.add("hidden");
    botao.disabled = true;
    botao.textContent = "Entrando...";

    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.detail || "Senha incorreta");
      }
      document.getElementById("lock-senha").value = "";
      this.desbloquear(true);
    } catch (err) {
      erro.textContent = err.message;
      erro.classList.remove("hidden");
    } finally {
      botao.disabled = false;
      botao.textContent = "Entrar";
    }
  },

  async sair() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (_) {
      // ignora falha de rede, tela de bloqueio é exibida de qualquer forma
    }
    window.location.reload();
  },

  mostrarRecuperacao() {
    Utils.showToast("Para redefinir, altere a variável APP_PASSWORD no arquivo .env e reinicie o servidor.", "error");
  },
};

document.addEventListener("DOMContentLoaded", () => Auth.init());
