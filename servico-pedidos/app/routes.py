from flask import Blueprint, request, jsonify
from app.services import CozinhaService
from app.schemas import PedidoRequest, PedidoResponse
from app.exceptions import ComunicacaoError
from pydantic import ValidationError

pedidos_bp = Blueprint('pedidos', __name__)

@pedidos_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "Pedidos service is running"})

@pedidos_bp.route('/novo-pedido', methods=['POST'])
def novo_pedido():
    try:
        # Validação dos dados de entrada
        pedido_data = request.get_json()
        pedido = PedidoRequest(**pedido_data)
        
        # Processamento do pedido
        resposta = CozinhaService.enviar_pedido(pedido)
        
        return jsonify(resposta.dict()), 200
        
    except ValidationError as e:
        return jsonify({"erro": "Dados inválidos", "detalhes": e.errors()}), 400
        
    except ComunicacaoError as e:
        return jsonify({"erro": e.message}), e.status_code
        
    except Exception as e:
        print(f"Erro interno: {e}")
        return jsonify({"erro": "Erro interno do servidor"}), 500