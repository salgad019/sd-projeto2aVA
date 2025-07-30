from flask import Blueprint, request, jsonify
from app.services import CozinhaService
from app.schemas import PedidoRequest, PedidoResponse
from app.exceptions import ComunicacaoError
from pydantic import ValidationError
from datetime import datetime

pedidos_bp = Blueprint('pedidos', __name__)

# In-memory storage for pedidos (in production, use a database)
pedidos_storage = []


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

        # Save the order to storage
        pedido_persistido = {
            "pedido_id": pedido.pedido_id,
            "itens": [item.dict() for item in pedido.itens],
            "mesa": pedido.mesa,
            "cliente_id": pedido.cliente_id,
            "status": resposta.status if hasattr(resposta, 'status') else "processando",
            "total": sum(item.quantidade * item.preco for item in pedido.itens),
            "timestamp": datetime.now().isoformat(),
            "resposta_cozinha": resposta.dict() if hasattr(resposta, 'dict') else str(resposta)
        }

        pedidos_storage.append(pedido_persistido)
        print(
            f"💾 Pedido {pedido.pedido_id} salvo. Total de pedidos: {len(pedidos_storage)}")

        return jsonify(resposta.dict()), 200

    except ValidationError as e:
        return jsonify({"erro": "Dados inválidos", "detalhes": e.errors()}), 400

    except ComunicacaoError as e:
        return jsonify({"erro": e.message}), e.status_code

    except Exception as e:
        print(f"Erro interno: {e}")
        return jsonify({"erro": "Erro interno do servidor"}), 500


@pedidos_bp.route('/listar', methods=['GET'])
def listar_pedidos():
    """Lista todos os pedidos processados"""
    try:
        # Return actual stored orders
        if not pedidos_storage:
            return jsonify([]), 200

        # Return the most recent orders first
        pedidos_ordenados = sorted(
            pedidos_storage, key=lambda x: x['timestamp'], reverse=True)

        print(f"📋 Listando {len(pedidos_ordenados)} pedidos")
        return jsonify(pedidos_ordenados), 200

    except Exception as e:
        print(f"Erro ao listar pedidos: {e}")
        return jsonify({"erro": "Erro interno do servidor"}), 500
