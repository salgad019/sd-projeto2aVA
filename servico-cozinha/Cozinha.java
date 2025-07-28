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

public class Cozinha {
    public static void main(String[] args) throws IOException {
        int porta = 5000;
        HttpServer server = HttpServer.create(new InetSocketAddress(porta), 0);
        System.out.println("🍳 Servidor da Cozinha rodando na porta " + porta);

        server.createContext("/preparar", new PrepararHandler());
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

            boolean estoqueOk = consultarServico("http://localhost:6000/disponivel");
            boolean funcionariosOk = consultarServico("http://localhost:9000/disponivel-funcionarios");

            String respostaJson;
            if (estoqueOk && funcionariosOk) {
                respostaJson = """
                {
                    "status": "em_preparo",
                    "tempo_estimado_min": 25
                }
                """;
            } else {
                respostaJson = """
                {
                    "status": "recusado",
                    "motivo": "Recusado por falta de %s"
                }
                """.formatted(!estoqueOk ? "estoque" : "funcionários");
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
                            return resposta.contains("\"disponivel\": true");
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
    }
}
