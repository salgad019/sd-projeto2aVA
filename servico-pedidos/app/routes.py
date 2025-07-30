from flask import Blueprint, request, jsonify
from app.services import CozinhaService
from app.schemas import PedidoRequest, PedidoResponse
from app.exceptions import ComunicacaoError
from app.database import SessionLocal, create_tables, test_connection
from app.models import Pedido, ItemPedido
from pydantic import ValidationError
from datetime import datetime
import json
import requests

pedidos_bp = Blueprint('pedidos', __name__)

# Initialize database tables on startup
create_tables()
test_connection()


def enviar_notificacao(pedido_id, tipo, mensagem, detalhes=None):
    """Envia notificação para o serviço de notificações"""
    try:
        notification_data = {
            "pedido_id": pedido_id,
            "tipo": tipo,
            "mensagem": mensagem
        }

        if detalhes:
            notification_data["detalhes"] = detalhes

        response = requests.post(
            "http://servico-notificacoes:7000/notificar",
            json=notification_data,
            timeout=5
        )

        if response.status_code == 200:
            print(f"📲 Notificação enviada: {tipo} para pedido {pedido_id}")
        else:
            print(f"⚠️ Falha ao enviar notificação: {response.status_code}")

    except Exception as e:
        print(f"❌ Erro ao enviar notificação: {e}")


@pedidos_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "Pedidos service is running"})


@pedidos_bp.route('/novo-pedido', methods=['POST'])
def novo_pedido():
    db = SessionLocal()
    try:
        # Validação dos dados de entrada
        pedido_data = request.get_json()
        pedido = PedidoRequest(**pedido_data)

        # Send notification: order created
        enviar_notificacao(
            pedido.pedido_id,
            "pedido_criado",
            f"Novo pedido criado para mesa {pedido.mesa}",
            {
                "mesa": pedido.mesa,
                "cliente_id": pedido.cliente_id,
                "total_itens": len(pedido.itens),
                "itens": [{"nome": item.nome, "quantidade": item.quantidade} for item in pedido.itens]
            }
        )

        # Processamento do pedido
        resposta = CozinhaService.enviar_pedido(pedido)

        # Create new pedido in database
        novo_pedido_db = Pedido(
            pedido_id=pedido.pedido_id,
            cliente_id=pedido.cliente_id,
            mesa=pedido.mesa,
            status=resposta.status if hasattr(
                resposta, 'status') else "processando",
            total=sum(item.quantidade * item.preco for item in pedido.itens),
            resposta_cozinha=json.dumps(resposta.dict()) if hasattr(
                resposta, 'dict') else str(resposta)
        )

        # Add to database session
        db.add(novo_pedido_db)
        db.flush()  # Get the ID

        # Create items for the order
        for item in pedido.itens:
            item_db = ItemPedido(
                pedido_id_fk=novo_pedido_db.id,
                nome=item.nome,
                quantidade=item.quantidade,
                preco=item.preco
            )
            db.add(item_db)

        # Commit transaction
        db.commit()

        # Refresh to get the latest data with relationships
        db.refresh(novo_pedido_db)

        # Send notification based on kitchen response
        if hasattr(resposta, 'dict'):
            resposta_dict = resposta.dict()
            if 'resposta_cozinha' in resposta_dict and resposta_dict['resposta_cozinha']:
                cozinha_resposta = resposta_dict['resposta_cozinha']
                if cozinha_resposta.get('status') == 'em_preparo':
                    enviar_notificacao(
                        pedido.pedido_id,
                        "pedido_aceito",
                        f"Pedido aceito e em preparação (Tempo estimado: {cozinha_resposta.get('tempo_estimado_min', 'N/A')} min)",
                        {
                            "tempo_estimado": cozinha_resposta.get('tempo_estimado_min'),
                            "cozinheiro": cozinha_resposta.get('cozinheiro_responsavel'),
                            "mesa": pedido.mesa
                        }
                    )
                elif cozinha_resposta.get('status') == 'recusado':
                    enviar_notificacao(
                        pedido.pedido_id,
                        "pedido_recusado",
                        f"Pedido recusado: {cozinha_resposta.get('motivo', 'Motivo não especificado')}",
                        {
                            "motivo": cozinha_resposta.get('motivo'),
                            "mesa": pedido.mesa
                        }
                    )

        print(
            f"💾 Pedido {pedido.pedido_id} salvo no PostgreSQL com ID {novo_pedido_db.id}")

        return jsonify(resposta.dict()), 200

    except ValidationError as e:
        db.rollback()
        return jsonify({"erro": "Dados inválidos", "detalhes": e.errors()}), 400

    except ComunicacaoError as e:
        db.rollback()
        return jsonify({"erro": e.message}), e.status_code

    except Exception as e:
        db.rollback()
        print(f"Erro interno: {e}")
        return jsonify({"erro": "Erro interno do servidor"}), 500

    finally:
        db.close()


@pedidos_bp.route('/listar', methods=['GET'])
def listar_pedidos():
    """Lista todos os pedidos processados"""
    db = SessionLocal()
    try:
        # Query all orders from database, ordered by creation date (most recent first)
        pedidos = db.query(Pedido).order_by(Pedido.created_at.desc()).all()

        if not pedidos:
            return jsonify([]), 200

        # Convert to dictionary format
        pedidos_list = [pedido.to_dict() for pedido in pedidos]

        print(f"📋 Listando {len(pedidos_list)} pedidos do PostgreSQL")
        return jsonify(pedidos_list), 200

    except Exception as e:
        print(f"Erro ao listar pedidos: {e}")
        return jsonify({"erro": "Erro interno do servidor"}), 500

    finally:
        db.close()
