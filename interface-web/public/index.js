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
    // Store current notification filters for auto-refresh
    this.currentNotificationFilters = {
      tipo: "",
      pedido_id: "",
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

    // Auto-refresh notifications every 5 seconds for real-time updates
    setInterval(() => {
      this.loadNotificacoes();
    }, 5000);

    // IMPORTANT: Poll kitchen status every 10 seconds to trigger completion notifications
    // This is necessary because the kitchen only checks for finished orders when these endpoints are called
    setInterval(() => {
      // Silently poll kitchen status to trigger completion notifications
      this.apiCall(`${this.services.cozinha}/status`).catch(() => {});
      this.apiCall(`${this.services.cozinha}/pedidos-ativos`).catch(() => {});
    }, 10000);

    // Auto-refresh active orders display every 15 seconds if currently shown
    setInterval(() => {
      // Only refresh if the active orders view is currently shown
      if (
        document
          .getElementById("results-area")
          .innerHTML.includes("Pedidos Ativos")
      ) {
        this.getActivePedidos();
      }
    }, 15000);
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

  async getActivePedidos() {
    try {
      const activeOrders = await this.apiCall(
        `${this.services.cozinha}/pedidos-ativos`
      );

      if (activeOrders.total === 0) {
        this.showResult(
          "🍳 Pedidos Ativos na Cozinha",
          '<div class="alert alert-success"><i class="fas fa-check"></i> Nenhum pedido em preparo no momento</div>'
        );
        return;
      }

      const ordersHtml = activeOrders.pedidos_ativos
        .map(
          (order) => `
        <div class="order-item border-start border-warning border-3 ps-3 mb-3">
          <div class="row">
            <div class="col-md-8">
              <strong>Pedido #${order.pedido_id}</strong>
              <span class="badge bg-warning text-dark ms-2">EM PREPARO</span>
              <br>
              <small class="text-muted">
                Iniciado: ${new Date(order.inicio_preparo).toLocaleString(
                  "pt-BR"
                )}
              </small>
              <br>
              <small class="text-muted">
                Tempo estimado: ${order.tempo_estimado_min} min
              </small>
            </div>
            <div class="col-md-4 text-end">
              <div class="text-warning">
                <i class="fas fa-clock"></i>
                ${Math.round(
                  (new Date() - new Date(order.inicio_preparo)) / 60000
                )} min
              </div>
              <small class="text-muted">em preparo</small>
            </div>
          </div>
        </div>
      `
        )
        .join("");

      this.showResult(
        "🍳 Pedidos Ativos na Cozinha",
        `
          <div class="alert alert-warning">
            <strong>Total de pedidos em preparo:</strong> ${activeOrders.total}
          </div>
          ${ordersHtml}
        `
      );
    } catch (error) {
      this.showAlert(
        `❌ Erro ao obter pedidos ativos: ${error.message}`,
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
      const response = await this.apiCall(
        `${this.services.notificacoes}/notificacoes`
      );

      const notificacoes = response.notificacoes || response;
      // Ensure notificacoes is an array for length calculation
      const notificacoesArray = Array.isArray(notificacoes) ? notificacoes : [];
      const total = response.total || notificacoesArray.length;

      const info = document.getElementById("notificacoes-info");
      info.innerHTML = `
                <p class="text-warning mb-1"><i class="fas fa-bell"></i> ${total} notificações</p>
                <small class="text-muted">Sistema de alertas ativo</small>
            `;

      // Only auto-refresh if we're specifically showing the "Ver Todas" view, not other notification views
      if (
        document
          .getElementById("results-area")
          .innerHTML.includes("Central de Notificações")
      ) {
        // Apply current filters during auto-refresh to preserve user's filter selection
        this.refreshNotificationsWithCurrentFilters();
      }
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    }
  }

  async refreshNotificationsWithCurrentFilters() {
    try {
      let url = `${this.services.notificacoes}/notificacoes?`;
      const params = new URLSearchParams();

      // Apply current filters
      if (this.currentNotificationFilters.tipo) {
        params.append("tipo", this.currentNotificationFilters.tipo);
      }
      if (this.currentNotificationFilters.pedido_id) {
        params.append("pedido_id", this.currentNotificationFilters.pedido_id);
      }

      const response = await this.apiCall(url + params.toString());
      const notificacoes = response.notificacoes || response;
      const notificacoesArray = Array.isArray(notificacoes) ? notificacoes : [];

      // Use autoScroll=false for auto-refresh to prevent unwanted scrolling
      this.showNotificacoesDetailsInternal(notificacoesArray, false);
    } catch (error) {
      console.error("Erro ao atualizar notificações com filtros:", error);
    }
  }

  async showNotificacoesDetails(notificacoes = null) {
    // Reset filters when manually showing all notifications
    if (!notificacoes) {
      this.currentNotificationFilters.tipo = "";
      this.currentNotificationFilters.pedido_id = "";
    }
    return this.showNotificacoesDetailsInternal(notificacoes, true);
  }

  async showNotificacoesDetailsInternal(
    notificacoes = null,
    autoScroll = true
  ) {
    try {
      if (!notificacoes) {
        const response = await this.apiCall(
          `${this.services.notificacoes}/notificacoes`
        );
        notificacoes = response.notificacoes || response;
      }

      const getNotificationIcon = (tipo) => {
        switch (tipo) {
          case "pedido_criado":
            return "🆕";
          case "pedido_aceito":
            return "✅";
          case "pedido_recusado":
            return "❌";
          case "pedido_finalizado":
            return "🎉";
          case "sistema":
            return "ℹ️";
          default:
            return "📢";
        }
      };

      const getNotificationColor = (tipo) => {
        switch (tipo) {
          case "pedido_criado":
            return "border-primary";
          case "pedido_aceito":
            return "border-success";
          case "pedido_recusado":
            return "border-danger";
          case "pedido_finalizado":
            return "border-warning";
          case "sistema":
            return "border-info";
          default:
            return "border-secondary";
        }
      };

      // Ensure notificacoes is always an array
      const notificacoesArray = Array.isArray(notificacoes) ? notificacoes : [];
      console.log(
        "🔧 UPDATED JS: showNotificacoesDetails - notificacoes type:",
        typeof notificacoes,
        "isArray:",
        Array.isArray(notificacoes),
        "length:",
        notificacoesArray.length
      );

      const notificacoesHtml = notificacoesArray
        .slice(0, 15)
        .map((notif) => {
          let detalhesHtml = "";
          if (notif.detalhes) {
            try {
              const detalhes =
                typeof notif.detalhes === "string"
                  ? JSON.parse(notif.detalhes)
                  : notif.detalhes;

              if (Object.keys(detalhes).length > 0) {
                detalhesHtml = `
                    <div class="mt-2">
                      <small class="text-muted">
                        ${Object.entries(detalhes)
                          .map(
                            ([key, value]) =>
                              `<span class="badge bg-light text-dark me-1">${key}: ${value}</span>`
                          )
                          .join("")}
                      </small>
                    </div>
                  `;
              }
            } catch (e) {
              // If parsing fails, show as text
              detalhesHtml = `<div class="mt-1"><small class="text-muted">${notif.detalhes}</small></div>`;
            }
          }

          return `
              <div class="notification-item border ${getNotificationColor(
                notif.tipo
              )} mb-3 p-3 rounded">
                <div class="row">
                  <div class="col-md-8">
                    <div class="d-flex align-items-center mb-2">
                      <span class="me-2" style="font-size: 1.2em;">${getNotificationIcon(
                        notif.tipo
                      )}</span>
                      <strong>Pedido #${notif.pedido_id}</strong>
                      <span class="badge bg-secondary ms-2">${notif.tipo
                        .replace("_", " ")
                        .toUpperCase()}</span>
                    </div>
                    <span class="text-dark">${notif.mensagem}</span>
                    ${detalhesHtml}
                  </div>
                  <div class="col-md-4 text-end">
                    <small class="text-muted">
                      ${new Date(notif.created_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </small>
                  </div>
                </div>
              </div>
            `;
        })
        .join("");

      // Add filter controls
      const filterControls = `
        <div class="mb-4">
          <div class="row">
            <div class="col-md-6">
              <select class="form-select" id="notification-type-filter" onchange="restaurantAPI.filterNotifications()">
                <option value="">Todos os tipos</option>
                <option value="pedido_criado" ${
                  this.currentNotificationFilters.tipo === "pedido_criado"
                    ? "selected"
                    : ""
                }>🆕 Pedidos Criados</option>
                <option value="pedido_aceito" ${
                  this.currentNotificationFilters.tipo === "pedido_aceito"
                    ? "selected"
                    : ""
                }>✅ Pedidos Aceitos</option>
                <option value="pedido_recusado" ${
                  this.currentNotificationFilters.tipo === "pedido_recusado"
                    ? "selected"
                    : ""
                }>❌ Pedidos Recusados</option>
                <option value="pedido_finalizado" ${
                  this.currentNotificationFilters.tipo === "pedido_finalizado"
                    ? "selected"
                    : ""
                }>🎉 Pedidos Finalizados</option>
                <option value="sistema" ${
                  this.currentNotificationFilters.tipo === "sistema"
                    ? "selected"
                    : ""
                }>ℹ️ Sistema</option>
              </select>
            </div>
            <div class="col-md-6">
              <input type="text" class="form-control" id="notification-pedido-filter" 
                     placeholder="Filtrar por ID do pedido..." 
                     value="${this.currentNotificationFilters.pedido_id}"
                     onchange="restaurantAPI.filterNotifications()">
            </div>
          </div>
        </div>
      `;

      this.showResult(
        "🔔 Central de Notificações",
        `
          <div class="row mb-3">
            <div class="col-md-8">
              ${filterControls}
            </div>
            <div class="col-md-4">
              <div class="alert alert-info text-center">
                <strong>🔄 Atualizações em Tempo Real</strong><br>
                <small>As notificações são atualizadas automaticamente a cada 5s</small>
              </div>
            </div>
          </div>
          ${
            notificacoesHtml ||
            '<p class="text-muted">Nenhuma notificação encontrada</p>'
          }
        `,
        autoScroll
      );
    } catch (error) {
      this.showAlert(
        `❌ Erro ao carregar notificações: ${error.message}`,
        "danger"
      );
    }
  }

  async filterNotifications() {
    const typeFilter = document.getElementById(
      "notification-type-filter"
    )?.value;
    const pedidoFilter = document.getElementById(
      "notification-pedido-filter"
    )?.value;

    // Store current filters for auto-refresh
    this.currentNotificationFilters.tipo = typeFilter || "";
    this.currentNotificationFilters.pedido_id = pedidoFilter || "";

    try {
      let url = `${this.services.notificacoes}/notificacoes?`;
      const params = new URLSearchParams();

      if (typeFilter) params.append("tipo", typeFilter);
      if (pedidoFilter) params.append("pedido_id", pedidoFilter);

      const response = await this.apiCall(url + params.toString());
      const notificacoes = response.notificacoes || response;

      // Ensure we pass an array
      const notificacoesArray = Array.isArray(notificacoes) ? notificacoes : [];
      this.showNotificacoesDetailsInternal(notificacoesArray, true);
    } catch (error) {
      this.showAlert(
        `❌ Erro ao filtrar notificações: ${error.message}`,
        "danger"
      );
    }
  }

  async getNotificationSummary() {
    try {
      const summary = await this.apiCall(
        `${this.services.notificacoes}/notificacoes/resumo`
      );

      this.showResult(
        "📊 Resumo de Notificações",
        `
          <div class="row">
            ${Object.entries(summary.resumo_por_tipo)
              .map(
                ([tipo, count]) => `
              <div class="col-md-6 col-lg-4 mb-3">
                <div class="metric-card">
                  <h3>${count}</h3>
                  <p>${tipo.replace("_", " ").toUpperCase()}</p>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
          <div class="alert alert-info mt-3">
            <strong>Total de Notificações:</strong> ${
              summary.total_notificacoes
            }
          </div>
        `
      );
    } catch (error) {
      this.showAlert(`❌ Erro ao obter resumo: ${error.message}`, "danger");
    }
  }

  async trackOrder() {
    const orderId = document.getElementById("track-order-id").value;
    if (!orderId) {
      this.showAlert("Por favor, informe o ID do pedido", "warning");
      return;
    }

    try {
      const response = await this.apiCall(
        `${this.services.notificacoes}/notificacoes?pedido_id=${orderId}`
      );
      const notificacoes = response.notificacoes || response;

      // Ensure notificacoes is an array
      const notificacoesArray = Array.isArray(notificacoes) ? notificacoes : [];

      if (notificacoesArray.length === 0) {
        this.showResult(
          `🔍 Rastreamento do Pedido #${orderId}`,
          '<p class="text-muted">Nenhuma notificação encontrada para este pedido</p>'
        );
        return;
      }

      // Create timeline
      const timeline = notificacoesArray
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map((notif, index) => {
          const isLast = index === notificacoes.length - 1;
          return `
            <div class="timeline-item ${isLast ? "current" : ""}">
              <div class="timeline-marker"></div>
              <div class="timeline-content">
                <div class="d-flex justify-content-between align-items-center">
                  <h6 class="mb-1">${notif.tipo
                    .replace("_", " ")
                    .toUpperCase()}</h6>
                  <small class="text-muted">
                    ${new Date(notif.created_at).toLocaleString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </small>
                </div>
                <p class="mb-1">${notif.mensagem}</p>
                ${
                  notif.detalhes
                    ? `<small class="text-muted">${
                        typeof notif.detalhes === "string"
                          ? notif.detalhes
                          : JSON.stringify(JSON.parse(notif.detalhes), null, 2)
                      }</small>`
                    : ""
                }
              </div>
            </div>
          `;
        })
        .join("");

      this.showResult(
        `🔍 Rastreamento do Pedido #${orderId}`,
        `
          <div class="order-timeline">
            ${timeline}
          </div>
          <div class="mt-3 text-center">
            <button class="btn btn-primary" onclick="restaurantAPI.trackOrder()">
              🔄 Atualizar Rastreamento
            </button>
          </div>
          <style>
            .order-timeline {
              position: relative;
              padding-left: 30px;
            }
            .timeline-item {
              position: relative;
              padding-bottom: 20px;
              border-left: 2px solid #e9ecef;
            }
            .timeline-item.current {
              border-left-color: #28a745;
            }
            .timeline-marker {
              position: absolute;
              left: -6px;
              top: 0;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background-color: #6c757d;
              border: 2px solid white;
            }
            .timeline-item.current .timeline-marker {
              background-color: #28a745;
            }
            .timeline-content {
              margin-left: 20px;
              padding: 10px;
              background-color: #f8f9fa;
              border-radius: 5px;
            }
          </style>
        `
      );
    } catch (error) {
      this.showAlert(`❌ Erro ao rastrear pedido: ${error.message}`, "danger");
    }
  }

  async startLiveNotificationDashboard() {
    this.showResult(
      "📡 Dashboard de Notificações em Tempo Real",
      `
        <div class="alert alert-success text-center">
          <h5><i class="fas fa-broadcast-tower"></i> Dashboard Ativo</h5>
          <p>Acompanhe as notificações em tempo real com atualizações automáticas a cada 3 segundos</p>
        </div>
        <div id="live-notifications-container">
          <div class="text-center">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Carregando...</span>
            </div>
            <p class="mt-2">Carregando notificações...</p>
          </div>
        </div>
      `
    );

    // Start live updates
    this.liveNotificationInterval = setInterval(async () => {
      try {
        const response = await this.apiCall(
          `${this.services.notificacoes}/notificacoes?limit=10`
        );
        const notificacoes = response.notificacoes || response;
        console.log(notificacoes);
        // Ensure notificacoes is an array
        const notificacoesArray = Array.isArray(notificacoes)
          ? notificacoes
          : [];

        const container = document.getElementById(
          "live-notifications-container"
        );
        if (!container) return; // Dashboard was closed

        const notificacoesHtml = notificacoesArray
          .slice(0, 10)
          .map((notif) => {
            const timeDiff = Math.round(
              (new Date() - new Date(notif.created_at)) / 1000
            );
            const timeAgo =
              timeDiff < 60
                ? `${timeDiff}s atrás`
                : timeDiff < 3600
                ? `${Math.round(timeDiff / 60)}m atrás`
                : `${Math.round(timeDiff / 3600)}h atrás`;

            return `
              <div class="card mb-2 ${timeDiff < 30 ? "border-success" : ""}">
                <div class="card-body py-2">
                  <div class="row align-items-center">
                    <div class="col-md-8">
                      <small class="text-muted">${notif.tipo.toUpperCase()}</small>
                      <div><strong>Pedido #${notif.pedido_id}</strong></div>
                      <div>${notif.mensagem}</div>
                    </div>
                    <div class="col-md-4 text-end">
                      <small class="text-muted">${timeAgo}</small>
                      ${
                        timeDiff < 30
                          ? '<span class="badge bg-success">NOVO</span>'
                          : ""
                      }
                    </div>
                  </div>
                </div>
              </div>
            `;
          })
          .join("");

        container.innerHTML =
          notificacoesHtml ||
          '<p class="text-muted text-center">Nenhuma notificação encontrada</p>';
      } catch (error) {
        console.error("Erro no dashboard em tempo real:", error);
      }
    }, 3000);

    // Stop live updates after 5 minutes
    setTimeout(() => {
      if (this.liveNotificationInterval) {
        clearInterval(this.liveNotificationInterval);
        this.showAlert(
          "Dashboard de tempo real pausado após 5 minutos",
          "info"
        );
      }
    }, 300000);
  }

  stopLiveNotificationDashboard() {
    if (this.liveNotificationInterval) {
      clearInterval(this.liveNotificationInterval);
      this.liveNotificationInterval = null;
      this.showAlert("Dashboard de tempo real pausado", "info");
    }
  }

  // Utility Methods
  showResult(title, content, autoScroll = true) {
    const resultsArea = document.getElementById("results-area");
    resultsArea.innerHTML = `
            <div class="service-card">
                <h3 class="section-title">${title}</h3>
                ${content}
            </div>
        `;
    if (autoScroll) {
      resultsArea.scrollIntoView({ behavior: "smooth" });
    }
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

function getNotificationSummary() {
  restaurantAPI.getNotificationSummary();
}

function trackOrder() {
  restaurantAPI.trackOrder();
}

function getActivePedidos() {
  restaurantAPI.getActivePedidos();
}

function startLiveNotificationDashboard() {
  restaurantAPI.startLiveNotificationDashboard();
}

function stopLiveNotificationDashboard() {
  restaurantAPI.stopLiveNotificationDashboard();
}

function simulateRestaurantFlow() {
  restaurantAPI.simulateRestaurantFlow();
}

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  restaurantAPI = new RestaurantAPI();
});
