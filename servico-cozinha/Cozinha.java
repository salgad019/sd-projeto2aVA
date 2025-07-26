import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
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
                exchange.sendResponseHeaders(405, -1); // Method Not Allowed
                return;
            }

            // Lê o corpo da requisição (JSON do pedido)
            InputStream is = exchange.getRequestBody();
            String body;
            try (Scanner scanner = new Scanner(is, StandardCharsets.UTF_8)) {
                body = scanner.useDelimiter("\\A").next();
            }
            System.out.println("📥 Pedido recebido:\n" + body);

            // Simulação de lógica: se tiver "Pizza", aceita. Senão, recusa.
            String respostaJson;
            if (body.toLowerCase().contains("pizza")) {
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
                    "motivo": "ingredientes indisponíveis"
                }
                """;
            }

            // Envia a resposta
            byte[] respostaBytes = respostaJson.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, respostaBytes.length);

            try (OutputStream os = exchange.getResponseBody()) {
                os.write(respostaBytes);
            }
        }
    }
}
