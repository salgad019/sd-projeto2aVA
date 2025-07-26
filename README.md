# 🍽️ Sistema Distribuído de Pedidos de Restaurante

Projeto acadêmico desenvolvido para a disciplina de **Sistemas Distribuídos** (UFRPE), cujo objetivo é implementar um sistema realista e modular, com processos que se comunicam via **IP e porta**, mesmo executando localmente.

---

## 📦 Descrição Geral

O sistema simula o funcionamento de um restaurante digital, em que os clientes realizam pedidos e os módulos internos lidam com a preparação, verificação de estoque, notificações, gerenciamento da equipe e persistência dos dados.

Cada funcionalidade é implementada como um **módulo/processo independente**, que se comunica via rede (TCP/HTTP).

---

## 🎯 Objetivos de Aprendizagem

- Aplicar os fundamentos de **sistemas distribuídos** com múltiplos processos
- Implementar comunicação via **IP e porta**
- Simular uma arquitetura de **microserviços**
- Integrar **múltiplas linguagens** no backend (Python e Java)
- Utilizar o modelo **cliente-servidor distribuído**

---

## 🔌 Módulos, Portas e Responsabilidades

| Módulo                      | Porta | Linguagem  | Função Principal |
|-----------------------------|-------|------------|------------------|
| **Interface Web**           | 3000  | JavaScript | Cliente faz pedido e acompanha o status |
| **Serviço de Pedidos**      | 4000  | Python     | Orquestrador do sistema, coordena os demais serviços |
| **Serviço de Cozinha**      | 5000  | Java       | Prepara pedidos, consulta estoque e equipe |
| **Serviço de Estoque**      | 6000  | Python     | Verifica disponibilidade de ingredientes |
| **Serviço de Notificações** | 7000  | Java       | Notifica cliente sobre o status |
| **Microserviço de Banco**   | 8000  | Java       | Persistência de dados dos pedidos e históricos |
| **Serviço de Funcionários** | 9000  | Python     | Informa disponibilidade da equipe de cozinha |

---

## 🔁 Fluxo de Comunicação

1. O cliente realiza um pedido via **Interface Web**
2. A Interface envia `POST /novo-pedido` para o **Serviço de Pedidos**
3. O **Serviço de Pedidos** envia `POST /preparar` para o **Serviço de Cozinha**
4. A **Cozinha** consulta:
   - `GET /disponivel` no **Serviço de Estoque**
   - `GET /disponivel-funcionarios` no **Serviço de Funcionários**
5. A Cozinha responde com `em_preparo` ou `recusado`
6. O **Serviço de Pedidos**:
   - Envia `POST` para o **Serviço de Notificações**
   - Envia `POST` para o **Microserviço de Banco de Dados**

---

## 🧭 Mapa Visual do Fluxo

```plaintext
[ Interface Web ] → POST /novo-pedido
         ↓
[ Serviço de Pedidos ] → POST /preparar → [ Serviço de Cozinha ]
                                   ↓
         [ Estoque ] ← GET /disponivel
         [ Funcionários ] ← GET /disponivel-funcionarios
                                   ↓
 ← Resposta: em_preparo / recusado
         ↓
[ Banco de Dados ] ← POST /registrar
[ Notificações ] ← POST /notificar
```

---

## 📬 Formatos de Mensagens

### Pedido enviado à Cozinha

```json
{
  "pedido_id": "abc123",
  "itens": [
    { "produto": "Pizza Margherita", "quantidade": 1 },
    { "produto": "Suco", "quantidade": 2 }
  ],
  "prioridade": "normal"
}
```

### Resposta da Cozinha

```json
{
  "pedido_id": "abc123",
  "status": "em_preparo",
  "tempo_estimado_min": 25
}
```

### Notificação

```json
{
  "pedido_id": "abc123",
  "mensagem": "Seu pedido está sendo preparado!"
}
```

---

## 🛠️ Tecnologias Utilizadas

- **Python**: `Flask`, `requests`, `socket`
- **Java**: `HttpServer`, `Spring Boot`, `sockets`
- **JavaScript**: `React`, `Node.js + Express`
- **Banco de Dados**: SQLite ou PostgreSQL
- Comunicação entre módulos via `127.0.0.1:<porta>` (rede local)
