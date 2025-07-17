# sd-projeto2aVA
# 🍽️ Sistema Distribuído de Pedidos de Restaurante

Projeto acadêmico desenvolvido para a disciplina de **Sistemas Distribuídos** (UFRPE), cujo objetivo é implementar um sistema realista e modular, com processos que se comunicam via **IP e porta**, mesmo executando localmente.

---

## 📦 Descrição do Projeto

O sistema simula o funcionamento de um restaurante digital, no qual clientes realizam pedidos e os módulos internos cuidam da preparação, verificação de estoque, notificações, gerenciamento da equipe e persistência de dados. 

Cada funcionalidade é implementada como um **processo independente (módulo)**, que se comunica com os demais via rede.

---

## 🔗 Arquitetura Geral

O sistema é composto por **6 módulos distribuídos obrigatórios** + **1 microserviço de banco de dados** (que **não conta como módulo**, mas é essencial). Cada processo escuta em uma porta diferente e se comunica com os demais via TCP/HTTP.

| Módulo                        | Porta | Linguagem | Descrição |
|------------------------------|-------|-----------|-----------|
| **1. Interface Web**         | 3000  | JavaScript (Node.js ou React) | Permite ao cliente fazer pedidos e acompanhar o status |
| **2. Serviço de Pedidos**    | 4000  | Python     | Núcleo do sistema: recebe pedidos e orquestra os demais serviços |
| **3. Serviço de Cozinha**    | 5000  | Java       | Simula o preparo dos pedidos e consulta estoque e equipe |
| **4. Serviço de Estoque**    | 6000  | Python     | Verifica a disponibilidade de ingredientes |
| **5. Serviço de Notificações**| 7000 | Java       | Envia atualizações de status ao cliente |
| **6. Serviço de Funcionários**| 9000 | Python     | Gerencia turnos e disponibilidade da equipe |
| *Microserviço de Banco de Dados* | *8000* | *Java* | *Responsável por persistência de pedidos, estoque e registros* |

---

## 🎯 Objetivos de Aprendizagem

- Aplicar os fundamentos de **sistemas distribuídos** com múltiplos processos
- Implementar comunicação via **IP e porta** usando sockets ou requisições HTTP
- Simular um sistema baseado em **microserviços**
- Integrar **múltiplas linguagens de programação no backend** (Python e Java)
- Utilizar o modelo **cliente-servidor distribuído**

---

## 🛠️ Tecnologias Utilizadas

- **Python** (`socket`, `requests`, `Flask`)
- **Java** (`HttpServer`, `Spring Boot`, `sockets`)
- **JavaScript** (`React` ou `Node.js + Express`)
- **Banco de dados**: SQLite ou PostgreSQL (acessado via microserviço)
- **Comunicação entre módulos**: via rede local (`127.0.0.1:<porta>`)
