// Restaurant Management System - Frontend Integration
class RestaurantAPI {
  constructor() {
    this.baseURL = "http://localhost:8080"; // API Gateway
    this.services = {
      funcionarios: `${this.baseURL}/funcionarios`,
      estoque: `${this.baseURL}/estoque`,
      cozinha: `${this.baseURL}/cozinha`,
      pedidos: `${this.baseURL}/pedidos`,
      notificacoes: `${this.baseURL}/notificacoes`,
    };
    this.init();
  }

  async init() {
    console.log("🚀 Inicializando Sistema de Gestão do Restaurante");
    await this.checkAllServices();
    this.setupAutoRefresh();
  }

  // Service Health Checks
  async checkServiceHealth(serviceName, url) {
    try {
      const response = await fetch(`${url}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      this.updateServiceStatus(serviceName, true, data);
      return { online: true, data };
    } catch (error) {
      console.error(`❌ ${serviceName} offline:`, error);
      this.updateServiceStatus(serviceName, false, { error: error.message });
      return { online: false, error: error.message };
    }
  }

  async checkAllServices() {
    console.log("🔍 Verificando status de todos os serviços...");

    const checks = await Promise.all([
      this.checkServiceHealth("funcionarios", this.services.funcionarios),
      this.checkServiceHealth("estoque", this.services.estoque),
      this.checkServiceHealth("cozinha", this.services.cozinha),
      this.checkServiceHealth("pedidos", this.services.pedidos),
      this.checkServiceHealth("notificacoes", this.services.notificacoes),
    ]);

    const onlineServices = checks.filter((check) => check.online).length;
    console.log(`✅ ${onlineServices}/5 serviços online`);

    // Load initial data for online services
    if (checks[0].online) this.loadFuncionarios();
    if (checks[1].online) this.loadEstoque();
    if (checks[4].online) this.loadNotificacoes();
  }

  updateServiceStatus(serviceName, isOnline, data) {
    const card = document.getElementById(`${serviceName}-card`);
    const status = document.getElementById(`${serviceName}-status`);
    const info = document.getElementById(`${serviceName}-info`);

    if (card && status && info) {
      if (isOnline) {
        card.classList.remove("offline");
        card.classList.add("online");
        status.classList.remove("status-offline");
        status.classList.add("status-online");

        if (data.status) {
          info.innerHTML = `
                        <p class="text-success mb-1"><i class="fas fa-check-circle"></i> Online</p>
                        <small class="text-muted">${
                          data.service || serviceName
                        } - ${data.message || "Operacional"}</small>
                    `;
        }
      } else {
        card.classList.remove("online");
        card.classList.add("offline");
        status.classList.remove("status-online");
        status.classList.add("status-offline");
        info.innerHTML = `
                    <p class="text-danger mb-1"><i class="fas fa-times-circle"></i> Offline</p>
                    <small class="text-muted">Serviço indisponível</small>
                `;
      }
    }
  }

  setupAutoRefresh() {
    // Auto-refresh service status every 30 seconds
    setInterval(() => {
      this.checkAllServices();
    }, 30000);

    // Auto-refresh notifications every 10 seconds
    setInterval(() => {
      this.loadNotificacoes();
    }, 10000);
  }

  // API Methods
  async apiCall(url, method = "GET", body = null) {
    try {
      const options = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API Call Error:", error);
      throw error;
    }
  }

  // Funcionarios Methods
  async loadFuncionarios() {
    try {
      const funcionarios = await this.apiCall(`${this.services.funcionarios}/`);
      const info = document.getElementById("funcionarios-info");

      info.innerHTML = `
                <p class="text-success mb-1"><i class="fas fa-users"></i> ${funcionarios.length} funcionários cadastrados</p>
                <small class="text-muted">Sistema de autenticação ativo</small>
            `;
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);
    }
  }

  async createFuncionario() {
    const nome = document.getElementById("funcionario-nome").value;
    const email = document.getElementById("funcionario-email").value;
    const password = document.getElementById("funcionario-senha").value;

    if (!nome || !email || !password) {
      this.showAlert("Por favor, preencha todos os campos", "warning");
      return;
    }

    try {
      const funcionario = await this.apiCall(
        `${this.services.funcionarios}/`,
        "POST",
        {
          name: nome,
          email: email,
          password: password,
        }
      );

      this.showAlert("✅ Funcionário criado com sucesso!", "success");
      bootstrap.Modal.getInstance(
        document.getElementById("funcionariosModal")
      ).hide();
      document.getElementById("funcionarioForm").reset();
      this.loadFuncionarios();
    } catch (error) {
      this.showAlert(
        `❌ Erro ao criar funcionário: ${error.message}`,
        "danger"
      );
    }
  }

  async checkStaffAvailability() {
    try {
      const availability = await this.apiCall(
        `${this.services.funcionarios}/disponivel-funcionarios`
      );

      this.showResult(
        "Disponibilidade de Funcionários",
        `
                <div class="metric-card">
                    <h3>${availability.total_funcionarios}</h3>
                    <p>Total de Funcionários</p>
                </div>
                <div class="metric-card">
                    <h3>${availability.funcionarios_disponiveis}</h3>
                    <p>Funcionários Disponíveis</p>
                </div>
                <div class="alert ${
                  availability.disponivel ? "alert-success" : "alert-warning"
                }">
                    <i class="fas ${
                      availability.disponivel
                        ? "fa-check"
                        : "fa-exclamation-triangle"
                    }"></i>
                    ${
                      availability.disponivel
                        ? "Equipe disponível para atender pedidos"
                        : "Equipe insuficiente - considere chamar mais funcionários"
                    }
                </div>
                <div class="mt-3">
                    <h5>Funcionários Ativos:</h5>
                    ${availability.funcionarios_ativos
                      .map(
                        (f) => `
                        <div class="order-item">
                            <strong>${f.name}</strong> - ${f.email}
                        </div>
                    `
                      )
                      .join("")}
                </div>
            `
      );
    } catch (error) {
      this.showAlert(
        `❌ Erro ao verificar disponibilidade: ${error.message}`,
        "danger"
      );
    }
  }

  // Estoque Methods
  async loadEstoque() {
    try {
      const estoque = await this.apiCall(`${this.services.estoque}/listar`);
      const totalItens = Object.keys(estoque).length;
      const itensDisponiveis = Object.values(estoque).filter(
        (qtd) => qtd > 0
      ).length;

      const info = document.getElementById("estoque-info");
      info.innerHTML = `
                <p class="text-info mb-1"><i class="fas fa-boxes"></i> ${totalItens} itens no estoque</p>
                <small class="text-muted">${itensDisponiveis} itens disponíveis</small>
            `;

      // Also update the results area if visible
      if (
        document
          .getElementById("results-area")
          .innerHTML.includes("Estoque Atual")
      ) {
        this.showEstoqueDetails();
      }
    } catch (error) {
      console.error("Erro ao carregar estoque:", error);
    }
  }

  async showEstoqueDetails() {
    try {
      const estoque = await this.apiCall(`${this.services.estoque}/listar`);

      const estoqueItems = Object.entries(estoque)
        .map(
          ([item, quantidade]) => `
                <div class="order-item">
                    <div class="row align-items-center">
                        <div class="col-8">
                            <strong>${item}</strong>
                        </div>
                        <div class="col-4 text-end">
                            <span class="badge ${
                              quantidade > 10
                                ? "bg-success"
                                : quantidade > 0
                                ? "bg-warning"
                                : "bg-danger"
                            }">
                                ${quantidade} unidades
                            </span>
                        </div>
                    </div>
                </div>
            `
        )
        .join("");

      this.showResult(
        "📦 Estoque Atual",
        estoqueItems || '<p class="text-muted">Nenhum item no estoque</p>'
      );
    } catch (error) {
      this.showAlert(`❌ Erro ao carregar estoque: ${error.message}`, "danger");
    }
  }

  async addEstoque() {
    const produto = document.getElementById("estoque-produto").value;
    const quantidade = parseInt(
      document.getElementById("estoque-quantidade").value
    );

    if (!produto || !quantidade || quantidade <= 0) {
      this.showAlert(
        "Por favor, preencha todos os campos corretamente",
        "warning"
      );
      return;
    }

    try {
      const result = await this.apiCall(
        `${this.services.estoque}/cadastrar`,
        "POST",
        {
          produto: produto,
          quantidade: quantidade,
        }
      );

      this.showAlert("✅ Item adicionado ao estoque com sucesso!", "success");
      bootstrap.Modal.getInstance(
        document.getElementById("estoqueModal")
      ).hide();
      document.getElementById("estoqueForm").reset();
      this.loadEstoque();
    } catch (error) {
      this.showAlert(`❌ Erro ao adicionar item: ${error.message}`, "danger");
    }
  }

  // Cozinha Methods
  async getCozinhaStatus() {
    try {
      const status = await this.apiCall(`${this.services.cozinha}/status`);

      this.showResult(
        "🍳 Status da Cozinha",
        `
                <div class="metric-card">
                    <h3>${status.pedidos_em_preparo}</h3>
                    <p>Pedidos em Preparo</p>
                </div>
                <div class="metric-card">
                    <h3>${status.tempo_medio_preparo} min</h3>
                    <p>Tempo Médio de Preparo</p>
                </div>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> Status: ${status.status}
                </div>
            `
      );
    } catch (error) {
      this.showAlert(
        `❌ Erro ao obter status da cozinha: ${error.message}`,
        "danger"
      );
    }
  }

  // Pedidos Methods
  async createPedido() {
    const pedidoId = document.getElementById("pedido-id").value;
    const mesa = document.getElementById("pedido-mesa").value;
    const clienteId = document.getElementById("pedido-cliente").value;

    if (!pedidoId) {
      this.showAlert("Por favor, informe o ID do pedido", "warning");
      return;
    }

    // Collect items
    const itemRows = document.querySelectorAll("#pedido-itens .row");
    const itens = [];

    for (let row of itemRows) {
      const nome = row.querySelector('[name="item-nome"]').value;
      const quantidade = parseInt(
        row.querySelector('[name="item-quantidade"]').value
      );
      const preco = parseFloat(row.querySelector('[name="item-preco"]').value);

      if (nome && quantidade && preco) {
        itens.push({ nome, quantidade, preco });
      }
    }

    if (itens.length === 0) {
      this.showAlert(
        "Por favor, adicione pelo menos um item ao pedido",
        "warning"
      );
      return;
    }

    try {
      const pedido = {
        pedido_id: pedidoId,
        itens: itens,
        cliente_id: clienteId || null,
        mesa: mesa ? parseInt(mesa) : null,
      };

      const result = await this.apiCall(
        `${this.services.pedidos}/novo-pedido`,
        "POST",
        pedido
      );

      this.showAlert("✅ Pedido criado com sucesso!", "success");
      bootstrap.Modal.getInstance(
        document.getElementById("pedidoModal")
      ).hide();
      document.getElementById("pedidoForm").reset();

      // Reset items
      document.getElementById("pedido-itens").innerHTML = `
                <div class="row mb-2">
                    <div class="col-md-5">
                        <input type="text" class="form-control" placeholder="Nome do item" name="item-nome">
                    </div>
                    <div class="col-md-3">
                        <input type="number" class="form-control" placeholder="Qtd" name="item-quantidade" min="1">
                    </div>
                    <div class="col-md-3">
                        <input type="number" class="form-control" placeholder="Preço" name="item-preco" step="0.01" min="0">
                    </div>
                    <div class="col-md-1">
                        <button type="button" class="btn btn-success btn-sm" onclick="restaurantAPI.addPedidoItem()">+</button>
                    </div>
                </div>
            `;

      this.loadPedidos();
    } catch (error) {
      this.showAlert(`❌ Erro ao criar pedido: ${error.message}`, "danger");
    }
  }

  addPedidoItem() {
    const container = document.getElementById("pedido-itens");
    const newRow = document.createElement("div");
    newRow.className = "row mb-2";
    newRow.innerHTML = `
            <div class="col-md-5">
                <input type="text" class="form-control" placeholder="Nome do item" name="item-nome">
            </div>
            <div class="col-md-3">
                <input type="number" class="form-control" placeholder="Qtd" name="item-quantidade" min="1">
            </div>
            <div class="col-md-3">
                <input type="number" class="form-control" placeholder="Preço" name="item-preco" step="0.01" min="0">
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.remove()">-</button>
            </div>
        `;
    container.appendChild(newRow);
  }

  async loadPedidos() {
    try {
      const pedidos = await this.apiCall(`${this.services.pedidos}/listar`);

      if (pedidos && pedidos.length > 0) {
        const pedidosHtml = pedidos
          .map(
            (pedido) => `
                    <div class="order-item">
                        <div class="row">
                            <div class="col-md-8">
                                <strong>Pedido #${pedido.pedido_id}</strong>
                                ${
                                  pedido.mesa
                                    ? `<span class="badge bg-primary ms-2">Mesa ${pedido.mesa}</span>`
                                    : ""
                                }
                                <br>
                                <small class="text-muted">
                                    ${
                                      pedido.itens ? pedido.itens.length : 0
                                    } item(s) - 
                                    Total: R$ ${
                                      pedido.total
                                        ? pedido.total.toFixed(2)
                                        : "0.00"
                                    }
                                </small>
                            </div>
                            <div class="col-md-4 text-end">
                                <span class="badge bg-info">${
                                  pedido.status || "Processando"
                                }</span>
                            </div>
                        </div>
                    </div>
                `
          )
          .join("");

        this.showResult("🧾 Pedidos Recentes", pedidosHtml);
      } else {
        this.showResult(
          "🧾 Pedidos Recentes",
          '<p class="text-muted">Nenhum pedido encontrado</p>'
        );
      }
    } catch (error) {
      this.showAlert(`❌ Erro ao carregar pedidos: ${error.message}`, "danger");
    }
  }

  // Notificações Methods
  async loadNotificacoes() {
    try {
      const notificacoes = await this.apiCall(
        `${this.services.notificacoes}/notificacoes`
      );

      const info = document.getElementById("notificacoes-info");
      info.innerHTML = `
                <p class="text-warning mb-1"><i class="fas fa-bell"></i> ${notificacoes.length} notificações</p>
                <small class="text-muted">Sistema de alertas ativo</small>
            `;

      // Show in results area if requested
      if (
        document
          .getElementById("results-area")
          .innerHTML.includes("Notificações Recentes")
      ) {
        this.showNotificacoesDetails(notificacoes);
      }
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    }
  }

  async showNotificacoesDetails(notificacoes = null) {
    try {
      if (!notificacoes) {
        notificacoes = await this.apiCall(
          `${this.services.notificacoes}/notificacoes`
        );
      }

      const notificacoesHtml = notificacoes
        .slice(0, 10)
        .map(
          (notif) => `
                <div class="notification-item">
                    <div class="row">
                        <div class="col-md-8">
                            <strong>Pedido #${notif.pedido_id}</strong><br>
                            <span>${notif.mensagem}</span>
                        </div>
                        <div class="col-md-4 text-end">
                            <small class="text-muted">
                                ${new Date(notif.created_at).toLocaleString(
                                  "pt-BR"
                                )}
                            </small>
                        </div>
                    </div>
                </div>
            `
        )
        .join("");

      this.showResult(
        "🔔 Notificações Recentes",
        notificacoesHtml ||
          '<p class="text-muted">Nenhuma notificação encontrada</p>'
      );
    } catch (error) {
      this.showAlert(
        `❌ Erro ao carregar notificações: ${error.message}`,
        "danger"
      );
    }
  }

  // Integration Demo
  async simulateRestaurantFlow() {
    this.showAlert(
      "🚀 Iniciando simulação do fluxo completo do restaurante...",
      "info"
    );

    try {
      // Step 1: Check all services
      await this.checkAllServices();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 2: Add ingredients to stock
      this.showAlert("📦 Adicionando ingredientes ao estoque...", "info");
      await this.apiCall(`${this.services.estoque}/cadastrar`, "POST", {
        produto: "Frango",
        quantidade: 10,
      });
      await this.apiCall(`${this.services.estoque}/cadastrar`, "POST", {
        produto: "Arroz",
        quantidade: 20,
      });
      await this.apiCall(`${this.services.estoque}/cadastrar`, "POST", {
        produto: "Feijão",
        quantidade: 15,
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 3: Create employee
      this.showAlert("👥 Criando funcionário...", "info");
      try {
        await this.apiCall(`${this.services.funcionarios}/`, "POST", {
          name: "Chef Silva",
          email: "chef@restaurante.com",
          password: "senha123",
        });
      } catch (error) {
        // Employee might already exist
        console.log("Funcionário já existe ou erro:", error.message);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 4: Create order
      this.showAlert("🧾 Criando pedido...", "info");
      const pedidoId = `PED${Date.now()}`;
      await this.apiCall(`${this.services.pedidos}/novo-pedido`, "POST", {
        pedido_id: pedidoId,
        itens: [
          { nome: "Frango Grelhado", quantidade: 1, preco: 25.9 },
          { nome: "Arroz Branco", quantidade: 1, preco: 8.0 },
          { nome: "Feijão Tropeiro", quantidade: 1, preco: 12.0 },
        ],
        mesa: 5,
        cliente_id: "CLI001",
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 5: Send to kitchen
      this.showAlert("🍳 Enviando pedido para a cozinha...", "info");
      try {
        await this.apiCall(`${this.services.cozinha}/preparar`, "POST", {
          pedido_id: pedidoId,
          itens: ["Frango", "Arroz", "Feijão"],
        });
      } catch (error) {
        console.log("Erro na cozinha:", error.message);
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Step 6: Show final results
      this.showAlert(
        "✅ Simulação concluída! Verificando resultados...",
        "success"
      );

      await this.loadEstoque();
      await this.loadNotificacoes();
      await this.getCozinhaStatus();

      this.showResult(
        "🎉 Simulação Completa",
        `
                <div class="alert alert-success">
                    <h5><i class="fas fa-check-circle"></i> Fluxo Simulado com Sucesso!</h5>
                    <p>O sistema demonstrou integração entre todos os microserviços:</p>
                    <ul>
                        <li>✅ Estoque atualizado com ingredientes</li>
                        <li>✅ Funcionário cadastrado</li>
                        <li>✅ Pedido criado e processado</li>
                        <li>✅ Cozinha verificou disponibilidade</li>
                        <li>✅ Notificações geradas automaticamente</li>
                    </ul>
                    <p class="mb-0"><strong>Todos os serviços estão comunicando corretamente!</strong></p>
                </div>
            `
      );
    } catch (error) {
      this.showAlert(`❌ Erro na simulação: ${error.message}`, "danger");
    }
  }

  // Utility Methods
  showResult(title, content) {
    const resultsArea = document.getElementById("results-area");
    resultsArea.innerHTML = `
            <div class="service-card">
                <h3 class="section-title">${title}</h3>
                ${content}
            </div>
        `;
    resultsArea.scrollIntoView({ behavior: "smooth" });
  }

  showAlert(message, type) {
    const alertDiv = document.createElement("div");
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText =
      "top: 20px; right: 20px; z-index: 1050; max-width: 400px;";
    alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.parentNode.removeChild(alertDiv);
      }
    }, 5000);
  }
}

// Global functions for HTML onclick events
let restaurantAPI;

function showFuncionariosModal() {
  new bootstrap.Modal(document.getElementById("funcionariosModal")).show();
}

function showEstoqueModal() {
  new bootstrap.Modal(document.getElementById("estoqueModal")).show();
}

function showPedidoModal() {
  // Generate a random order ID
  document.getElementById("pedido-id").value = `PED${Date.now()}`;
  new bootstrap.Modal(document.getElementById("pedidoModal")).show();
}

function createFuncionario() {
  restaurantAPI.createFuncionario();
}

function addEstoque() {
  restaurantAPI.addEstoque();
}

function createPedido() {
  restaurantAPI.createPedido();
}

function addPedidoItem() {
  restaurantAPI.addPedidoItem();
}

function checkStaffAvailability() {
  restaurantAPI.checkStaffAvailability();
}

function loadEstoque() {
  restaurantAPI.showEstoqueDetails();
}

function getCozinhaStatus() {
  restaurantAPI.getCozinhaStatus();
}

function loadPedidos() {
  restaurantAPI.loadPedidos();
}

function loadNotificacoes() {
  restaurantAPI.showNotificacoesDetails();
}

function simulateRestaurantFlow() {
  restaurantAPI.simulateRestaurantFlow();
}

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  restaurantAPI = new RestaurantAPI();
});
