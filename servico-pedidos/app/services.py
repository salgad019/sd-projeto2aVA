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
                json=pedido.dict(), 
                timeout=5
            )

            if resposta.status_code == 200:
                dados = resposta.json()
                print(f"✅ Resposta da cozinha: {dados}")
                return PedidoResponse(
                    status="enviado_para_cozinha",
                    resposta_cozinha=dados
                )
            else:
                print(f"Erro na resposta da cozinha: {resposta.status_code}")
                raise ComunicacaoError("Cozinha retornou erro", resposta.status_code)

        except requests.exceptions.RequestException as e:
            print(f"Erro de comunicação com a cozinha: {e}")
            raise ComunicacaoError("Não foi possível contatar a cozinha", 503)