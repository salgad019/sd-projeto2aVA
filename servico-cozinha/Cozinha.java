import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Scanner;
import java.util.List;
import java.util.ArrayList;
import java.util.regex.Pattern;
import java.util.regex.Matcher;

public class Cozinha {
    // Static list to track active orders in the kitchen
    private static final List<PedidoAtivo> pedidosAtivos = new ArrayList<>();
    
    // Inner class to represent an active order
    static class PedidoAtivo {
        String pedidoId;
        String status;
        long tempoInicio;
        int tempoEstimadoMin;
        String cozinheiroResponsavel;
        
        PedidoAtivo(String pedidoId, String status, int tempoEstimadoMin, String cozinheiroResponsavel) {
            this.pedidoId = pedidoId;
            this.status = status;
            this.tempoInicio = System.currentTimeMillis();
            this.tempoEstimadoMin = tempoEstimadoMin;
            this.cozinheiroResponsavel = cozinheiroResponsavel;
        }
        
        // Get elapsed time in minutes
        int getTempoDecorridoMin() {
            return (int) ((System.currentTimeMillis() - tempoInicio) / (1000 * 60));
        }
        
        // Check if order is finished (elapsed time >= estimated time)
        boolean isFinished() {
            return getTempoDecorridoMin() >= tempoEstimadoMin;
        }
    }

    public static void main(String[] args) throws IOException {
        int porta = 9000;
        HttpServer server = HttpServer.create(new InetSocketAddress(porta), 0);
        System.out.println("🍳 Servidor da Cozinha rodando na porta " + porta);

        server.createContext("/preparar", new PrepararHandler());
        server.createContext("/status", new StatusHandler());
        server.createContext("/pedidos-ativos", new PedidosAtivosHandler());
        server.createContext("/health", new HealthHandler());
        server.setExecutor(null); // usa um executor padrão
        server.start();
    }

    static class PrepararHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                exchange.sendResponseHeaders(405, -1);
                return;
            }

            InputStream is = exchange.getRequestBody();
            String body;
            try (Scanner scanner = new Scanner(is, StandardCharsets.UTF_8)) {
                body = scanner.useDelimiter("\\A").next();
            }

            System.out.println("📥 Pedido recebido:\n" + body);

            // Extract items from the order to check stock
            boolean estoqueOk = verificarEstoqueItens(body);
            boolean funcionariosOk = consultarServico("http://servico-funcionarios:8000/disponivel-funcionarios");

            String respostaJson;
            if (estoqueOk && funcionariosOk) {
                // Consume ingredients from stock before accepting the order
                boolean consumoOk = consumirEstoqueItens(body);
                
                if (consumoOk) {
                    // Extract pedido_id from the order
                    String pedidoId = extrairPedidoId(body);
                    int tempoEstimado = 1; // Changed to 1 minute for testing notifications
                    String cozinheiro = "Chef Silva";
                    
                    // Add to active orders list
                    synchronized (pedidosAtivos) {
                        pedidosAtivos.add(new PedidoAtivo(pedidoId, "em_preparo", tempoEstimado, cozinheiro));
                        System.out.println("🍳 Pedido " + pedidoId + " adicionado à lista de preparo. Total ativo: " + pedidosAtivos.size());
                    }
                    
                    respostaJson = """
                    {
                        "status": "em_preparo",
                        "tempo_estimado_min": %d,
                        "cozinheiro_responsavel": "%s"
                    }
                    """.formatted(tempoEstimado, cozinheiro);
                    
                    // Notify about order preparation
                    notificarPedido(body, "Pedido em preparação na cozinha");
                } else {
                    // Stock consumption failed - treat as stock unavailable
                    respostaJson = """
                    {
                        "status": "recusado",
                        "motivo": "Recusado por falha no consumo do estoque"
                    }
                    """;
                    
                    // Notify about order rejection
                    notificarPedido(body, "Pedido recusado: falha no consumo do estoque");
                }
            } else {
                respostaJson = """
                {
                    "status": "recusado",
                    "motivo": "Recusado por falta de %s"
                }
                """.formatted(!estoqueOk ? "estoque" : "funcionários");
                
                // Notify about order rejection
                notificarPedido(body, "Pedido recusado: " + (!estoqueOk ? "falta de estoque" : "falta de funcionários"));
            }

            byte[] respostaBytes = respostaJson.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, respostaBytes.length);

            try (OutputStream os = exchange.getResponseBody()) {
                os.write(respostaBytes);
            }
        }

        private boolean consultarServico(String urlStr) {
            HttpURLConnection conexao = null;
            try {
                URI uri = URI.create(urlStr);
                URL url = uri.toURL();
                conexao = (HttpURLConnection) url.openConnection();
                conexao.setRequestMethod("GET");
                conexao.setConnectTimeout(5000);
                conexao.setReadTimeout(5000);
                
                int status = conexao.getResponseCode();

                if (status == 200) {
                    try (InputStream is = conexao.getInputStream();
                         Scanner scanner = new Scanner(is, StandardCharsets.UTF_8)) {
                        if (scanner.hasNext()) {
                            String resposta = scanner.useDelimiter("\\A").next();
                            return resposta.contains("\"disponivel\":true");
                        }
                    }
                }
            } catch (IOException e) {
                System.out.println("❌ Erro ao consultar: " + urlStr + " -> " + e.getMessage());
            } finally {
                if (conexao != null) {
                    conexao.disconnect();
                }
            }
            return false;
        }

        private boolean verificarEstoqueItens(String pedidoJson) {
            try {
                // Extract items from the actual order JSON
                String itensJson = extrairItensParaEstoque(pedidoJson);
                if (itensJson == null) {
                    System.out.println("❌ Não foi possível extrair itens do pedido");
                    return false;
                }

                URI uri = URI.create("http://servico-estoque:6000/disponivel");
                URL url = uri.toURL();
                HttpURLConnection conexao = (HttpURLConnection) url.openConnection();
                conexao.setRequestMethod("POST");
                conexao.setRequestProperty("Content-Type", "application/json");
                conexao.setDoOutput(true);
                conexao.setConnectTimeout(5000);
                conexao.setReadTimeout(5000);

                System.out.println("📦 Verificando disponibilidade dos itens: " + itensJson);

                try (OutputStream os = conexao.getOutputStream()) {
                    os.write(itensJson.getBytes(StandardCharsets.UTF_8));
                }

                int status = conexao.getResponseCode();
                if (status == 200) {
                    try (InputStream is = conexao.getInputStream();
                         Scanner scanner = new Scanner(is, StandardCharsets.UTF_8)) {
                        if (scanner.hasNext()) {
                            String resposta = scanner.useDelimiter("\\A").next();
                            System.out.println("📦 Resposta do estoque: " + resposta);
                            return resposta.contains("\"disponivel\":true");
                        }
                    }
                } else {
                    System.out.println("❌ Erro HTTP " + status + " ao verificar estoque");
                }
                conexao.disconnect();
            } catch (Exception e) {
                System.out.println("❌ Erro ao verificar estoque: " + e.getMessage());
            }
            return false;
        }

        private boolean consumirEstoqueItens(String pedidoJson) {
            try {
                // Extract items from the actual order JSON
                String itensJson = extrairItensParaEstoque(pedidoJson);
                if (itensJson == null) {
                    System.out.println("❌ Não foi possível extrair itens do pedido para consumo");
                    return false;
                }

                URI uri = URI.create("http://servico-estoque:6000/consumir");
                URL url = uri.toURL();
                HttpURLConnection conexao = (HttpURLConnection) url.openConnection();
                conexao.setRequestMethod("POST");
                conexao.setRequestProperty("Content-Type", "application/json");
                conexao.setDoOutput(true);
                conexao.setConnectTimeout(5000);
                conexao.setReadTimeout(5000);

                System.out.println("🍽️ Consumindo ingredientes do estoque: " + itensJson);

                try (OutputStream os = conexao.getOutputStream()) {
                    os.write(itensJson.getBytes(StandardCharsets.UTF_8));
                }

                int status = conexao.getResponseCode();
                if (status == 200) {
                    try (InputStream is = conexao.getInputStream();
                         Scanner scanner = new Scanner(is, StandardCharsets.UTF_8)) {
                        if (scanner.hasNext()) {
                            String resposta = scanner.useDelimiter("\\A").next();
                            System.out.println("✅ Ingredientes consumidos com sucesso: " + resposta);
                            return true;
                        }
                    }
                } else {
                    try (InputStream is = conexao.getErrorStream();
                         Scanner scanner = new Scanner(is, StandardCharsets.UTF_8)) {
                        if (scanner.hasNext()) {
                            String erro = scanner.useDelimiter("\\A").next();
                            System.out.println("❌ Erro HTTP " + status + " ao consumir estoque: " + erro);
                        }
                    }
                }
                conexao.disconnect();
            } catch (Exception e) {
                System.out.println("❌ Erro ao consumir estoque: " + e.getMessage());
            }
            return false;
        }

        private String extrairItensParaEstoque(String pedidoJson) {
            try {
                // For this demo, let's use a simple regex-based approach to extract items
                // In production, you'd use a proper JSON library like Jackson or Gson
                
                StringBuilder estoqueJson = new StringBuilder("{");
                boolean first = true;
                
                // Pattern to match: "nome": "value"
                String nomePattern = "\"nome\"\\s*:\\s*\"([^\"]+)\"";
                String quantidadePattern = "\"quantidade\"\\s*:\\s*(\\d+)";
                
                java.util.regex.Pattern nomeRegex = java.util.regex.Pattern.compile(nomePattern);
                java.util.regex.Pattern quantidadeRegex = java.util.regex.Pattern.compile(quantidadePattern);
                
                java.util.regex.Matcher nomeMatcher = nomeRegex.matcher(pedidoJson);
                java.util.regex.Matcher quantidadeMatcher = quantidadeRegex.matcher(pedidoJson);
                
                // Collect all matches
                java.util.List<String> nomes = new java.util.ArrayList<>();
                java.util.List<String> quantidades = new java.util.ArrayList<>();
                
                while (nomeMatcher.find()) {
                    nomes.add(nomeMatcher.group(1));
                }
                
                while (quantidadeMatcher.find()) {
                    quantidades.add(quantidadeMatcher.group(1));
                }
                
                // Match names with quantities
                int maxItems = Math.min(nomes.size(), quantidades.size());
                for (int i = 0; i < maxItems; i++) {
                    if (!first) {
                        estoqueJson.append(", ");
                    }
                    estoqueJson.append("\"").append(nomes.get(i)).append("\": ").append(quantidades.get(i));
                    first = false;
                }
                
                estoqueJson.append("}");
                
                String result = estoqueJson.toString();
                System.out.println("🔄 Itens convertidos para estoque: " + result);
                return result;
                
            } catch (Exception e) {
                System.out.println("❌ Erro ao extrair itens: " + e.getMessage());
                return null;
            }
        }

        private String extrairPedidoId(String pedidoJson) {
            try {
                // Simple regex to extract pedido_id
                String pattern = "\"pedido_id\"\\s*:\\s*\"([^\"]+)\"";
                java.util.regex.Pattern regex = java.util.regex.Pattern.compile(pattern);
                java.util.regex.Matcher matcher = regex.matcher(pedidoJson);
                
                if (matcher.find()) {
                    return matcher.group(1);
                }
            } catch (Exception e) {
                System.out.println("❌ Erro ao extrair pedido_id: " + e.getMessage());
            }
            return "unknown_" + System.currentTimeMillis();
        }

        private void notificarPedido(String pedidoData, String mensagem) {
            try {
                String notificationJson = String.format("""
                {
                    "pedido_id": "temp_id",
                    "mensagem": "%s"
                }
                """, mensagem);

                URI uri = URI.create("http://servico-notificacoes:7000/notificar");
                URL url = uri.toURL();
                HttpURLConnection conexao = (HttpURLConnection) url.openConnection();
                conexao.setRequestMethod("POST");
                conexao.setRequestProperty("Content-Type", "application/json");
                conexao.setDoOutput(true);

                try (OutputStream os = conexao.getOutputStream()) {
                    os.write(notificationJson.getBytes(StandardCharsets.UTF_8));
                }

                int status = conexao.getResponseCode();
                System.out.println("📢 Notificação enviada, status: " + status);
                conexao.disconnect();

            } catch (Exception e) {
                System.out.println("❌ Erro ao enviar notificação: " + e.getMessage());
            }
        }

        private void notificarPedidoFinalizado(String pedidoId, String cozinheiro, int tempoTotal) {
            try {
                String notificationJson = String.format("""
                {
                    "pedido_id": "%s",
                    "tipo": "pedido_finalizado",
                    "mensagem": "Pedido finalizado e pronto para entrega",
                    "detalhes": {
                        "cozinheiro_responsavel": "%s",
                        "tempo_preparo_min": %d,
                        "status": "pronto"
                    }
                }
                """, pedidoId, cozinheiro, tempoTotal);

                URI uri = URI.create("http://servico-notificacoes:7000/notificar");
                URL url = uri.toURL();
                HttpURLConnection conexao = (HttpURLConnection) url.openConnection();
                conexao.setRequestMethod("POST");
                conexao.setRequestProperty("Content-Type", "application/json");
                conexao.setDoOutput(true);
                conexao.setConnectTimeout(5000);
                conexao.setReadTimeout(5000);

                try (OutputStream os = conexao.getOutputStream()) {
                    os.write(notificationJson.getBytes(StandardCharsets.UTF_8));
                }

                int status = conexao.getResponseCode();
                System.out.println("🍽️ Notificação de pedido finalizado enviada, status: " + status);
                conexao.disconnect();

            } catch (Exception e) {
                System.out.println("❌ Erro ao enviar notificação de finalização: " + e.getMessage());
            }
        }
    }

    static class StatusHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!exchange.getRequestMethod().equalsIgnoreCase("GET")) {
                exchange.sendResponseHeaders(405, -1);
                return;
            }

            // Clean up finished orders and get current statistics
            synchronized (pedidosAtivos) {
                // Remove finished orders and send notifications
                pedidosAtivos.removeIf(pedido -> {
                    if (pedido.isFinished()) {
                        System.out.println("✅ Pedido " + pedido.pedidoId + " finalizado e removido da lista");
                        
                        // Send notification about finished order
                        notificarPedidoFinalizado(pedido.pedidoId, pedido.cozinheiroResponsavel, pedido.getTempoDecorridoMin());
                        
                        return true;
                    }
                    return false;
                });
                
                // Calculate average preparation time from active orders
                int pedidosEmPreparo = pedidosAtivos.size();
                int tempoMedio = pedidosAtivos.isEmpty() ? 1 : 
                    (int) pedidosAtivos.stream().mapToInt(p -> p.tempoEstimadoMin).average().orElse(1);
                
                String respostaJson = """
                {
                    "status": "operacional",
                    "pedidos_em_preparo": %d,
                    "tempo_medio_preparo": %d
                }
                """.formatted(pedidosEmPreparo, tempoMedio);

                byte[] respostaBytes = respostaJson.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, respostaBytes.length);

                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(respostaBytes);
                }
            }
        }

        private void notificarPedidoFinalizado(String pedidoId, String cozinheiro, int tempoTotal) {
            try {
                String notificationJson = String.format("""
                {
                    "pedido_id": "%s",
                    "tipo": "pedido_finalizado",
                    "mensagem": "Pedido finalizado e pronto para entrega",
                    "detalhes": {
                        "cozinheiro_responsavel": "%s",
                        "tempo_preparo_min": %d,
                        "status": "pronto"
                    }
                }
                """, pedidoId, cozinheiro, tempoTotal);

                URI uri = URI.create("http://servico-notificacoes:7000/notificar");
                URL url = uri.toURL();
                HttpURLConnection conexao = (HttpURLConnection) url.openConnection();
                conexao.setRequestMethod("POST");
                conexao.setRequestProperty("Content-Type", "application/json");
                conexao.setDoOutput(true);
                conexao.setConnectTimeout(5000);
                conexao.setReadTimeout(5000);

                try (OutputStream os = conexao.getOutputStream()) {
                    os.write(notificationJson.getBytes(StandardCharsets.UTF_8));
                }

                int status = conexao.getResponseCode();
                System.out.println("🍽️ Notificação de pedido finalizado enviada, status: " + status);
                conexao.disconnect();

            } catch (Exception e) {
                System.out.println("❌ Erro ao enviar notificação de finalização: " + e.getMessage());
            }
        }
    }

    static class PedidosAtivosHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!exchange.getRequestMethod().equalsIgnoreCase("GET")) {
                exchange.sendResponseHeaders(405, -1);
                return;
            }

            synchronized (pedidosAtivos) {
                // Clean up finished orders first and send notifications
                pedidosAtivos.removeIf(pedido -> {
                    if (pedido.isFinished()) {
                        System.out.println("✅ Pedido " + pedido.pedidoId + " finalizado e removido da lista");
                        
                        // Send notification about finished order
                        notificarPedidoFinalizado(pedido.pedidoId, pedido.cozinheiroResponsavel, pedido.getTempoDecorridoMin());
                        
                        return true;
                    }
                    return false;
                });
                
                StringBuilder jsonBuilder = new StringBuilder();
                jsonBuilder.append("{\n  \"pedidos_ativos\": [\n");
                
                for (int i = 0; i < pedidosAtivos.size(); i++) {
                    PedidoAtivo pedido = pedidosAtivos.get(i);
                    if (i > 0) jsonBuilder.append(",\n");
                    
                    jsonBuilder.append("    {\n");
                    jsonBuilder.append("      \"pedido_id\": \"").append(pedido.pedidoId).append("\",\n");
                    jsonBuilder.append("      \"status\": \"").append(pedido.status).append("\",\n");
                    jsonBuilder.append("      \"tempo_decorrido_min\": ").append(pedido.getTempoDecorridoMin()).append(",\n");
                    jsonBuilder.append("      \"tempo_estimado_min\": ").append(pedido.tempoEstimadoMin).append(",\n");
                    jsonBuilder.append("      \"cozinheiro_responsavel\": \"").append(pedido.cozinheiroResponsavel).append("\"\n");
                    jsonBuilder.append("    }");
                }
                
                jsonBuilder.append("\n  ],\n");
                jsonBuilder.append("  \"total\": ").append(pedidosAtivos.size()).append("\n");
                jsonBuilder.append("}");
                
                String respostaJson = jsonBuilder.toString();
                byte[] respostaBytes = respostaJson.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, respostaBytes.length);

                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(respostaBytes);
                }
            }
        }

        private void notificarPedidoFinalizado(String pedidoId, String cozinheiro, int tempoTotal) {
            try {
                String notificationJson = String.format("""
                {
                    "pedido_id": "%s",
                    "tipo": "pedido_finalizado",
                    "mensagem": "Pedido finalizado e pronto para entrega",
                    "detalhes": {
                        "cozinheiro_responsavel": "%s",
                        "tempo_preparo_min": %d,
                        "status": "pronto"
                    }
                }
                """, pedidoId, cozinheiro, tempoTotal);

                URI uri = URI.create("http://servico-notificacoes:7000/notificar");
                URL url = uri.toURL();
                HttpURLConnection conexao = (HttpURLConnection) url.openConnection();
                conexao.setRequestMethod("POST");
                conexao.setRequestProperty("Content-Type", "application/json");
                conexao.setDoOutput(true);
                conexao.setConnectTimeout(5000);
                conexao.setReadTimeout(5000);

                try (OutputStream os = conexao.getOutputStream()) {
                    os.write(notificationJson.getBytes(StandardCharsets.UTF_8));
                }

                int status = conexao.getResponseCode();
                System.out.println("🍽️ Notificação de pedido finalizado enviada, status: " + status);
                conexao.disconnect();

            } catch (Exception e) {
                System.out.println("❌ Erro ao enviar notificação de finalização: " + e.getMessage());
            }
        }
    }

    static class HealthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!exchange.getRequestMethod().equalsIgnoreCase("GET")) {
                exchange.sendResponseHeaders(405, -1);
                return;
            }

            String respostaJson = """
            {
                "status": "healthy",
                "service": "cozinha",
                "version": "1.0.0"
            }
            """;

            byte[] respostaBytes = respostaJson.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, respostaBytes.length);

            try (OutputStream os = exchange.getResponseBody()) {
                os.write(respostaBytes);
            }
        }
    }
}
