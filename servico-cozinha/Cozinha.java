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
    public static void main(String[] args) throws IOException {
        int porta = 9000;
        HttpServer server = HttpServer.create(new InetSocketAddress(porta), 0);
        System.out.println("🍳 Servidor da Cozinha rodando na porta " + porta);

        server.createContext("/preparar", new PrepararHandler());
        server.createContext("/status", new StatusHandler());
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
                respostaJson = """
                {
                    "status": "em_preparo",
                    "tempo_estimado_min": 25,
                    "cozinheiro_responsavel": "Chef Silva"
                }
                """;
                
                // Notify about order preparation
                notificarPedido(body, "Pedido em preparação na cozinha");
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
    }

    static class StatusHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!exchange.getRequestMethod().equalsIgnoreCase("GET")) {
                exchange.sendResponseHeaders(405, -1);
                return;
            }

            String respostaJson = """
            {
                "status": "operacional",
                "pedidos_em_preparo": 3,
                "tempo_medio_preparo": 25
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
