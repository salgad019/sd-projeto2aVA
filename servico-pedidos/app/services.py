import requests
from app.config import config
from app.schemas import PedidoRequest, PedidoResponse
from app.exceptions import ComunicacaoError

class CozinhaService:
    @staticmethod
    def enviar_pedido(pedido: PedidoRequest) -> PedidoResponse:
        try:
            print(f"Enviando pedido à cozinha: {pedido.pedido_id}")
            resposta = requests.post(
                config.COZINHA_URL, 
                json=pedido.model_dump(),  # Pydantic v2
                timeout=5
            )

            if resposta.status_code == 200:
                dados = resposta.json()
                print(f"✅ Resposta da cozinha: {dados}")
                
                # Processar próximos passos se status for "em_preparo"
                if dados.get("status") == "em_preparo":
                    BancoService.registrar_pedido(pedido, dados)
                    NotificacaoService.notificar_cliente(pedido.pedido_id, "Seu pedido está sendo preparado!")
                
                return PedidoResponse(
                    pedido_id=pedido.pedido_id,
                    status=dados.get("status"),
                    tempo_estimado_min=dados.get("tempo_estimado_min"),
                    motivo=dados.get("motivo"),
                    resposta_cozinha=dados
                )
            else:
                print(f"Erro na resposta da cozinha: {resposta.status_code}")
                raise ComunicacaoError("Cozinha retornou erro", resposta.status_code)

        except requests.exceptions.RequestException as e:
            print(f"Erro de comunicação com a cozinha: {e}")
            raise ComunicacaoError("Não foi possível contatar a cozinha", 503)

class BancoService:
    @staticmethod
    def registrar_pedido(pedido: PedidoRequest, resposta_cozinha: dict):
        # TODO: Implementar POST para porta 8000
        print(f"📝 Registrando pedido {pedido.pedido_id} no banco")

class NotificacaoService:
    @staticmethod
    def notificar_cliente(pedido_id: str, mensagem: str):
        # TODO: Implementar POST para porta 7000
        print(f"📱 Notificando cliente sobre pedido {pedido_id}: {mensagem}")