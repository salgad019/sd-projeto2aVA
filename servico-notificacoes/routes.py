from flask import Blueprint, request, jsonify
from notificacao import processar_notificacao
from database import SessionLocal
from models import Notificacao, TipoNotificacao
from sqlalchemy import text

routes = Blueprint('routes', __name__)


@routes.route('/notificar', methods=['POST'])
def notificar():
    data = request.get_json()
    notificacao, erro = processar_notificacao(data)

    if erro:
        return jsonify({"erro": erro}), 400

    return jsonify({"status": "notificado", **notificacao.to_dict()}), 200


@routes.route('/notificacoes', methods=['GET'])
def listar_notificacoes():
    """List all notifications with optional filtering"""
    db = SessionLocal()
    try:
        # Get filter parameters
        tipo = request.args.get('tipo')
        pedido_id = request.args.get('pedido_id')
        limit = request.args.get('limit', 50, type=int)

        query = db.query(Notificacao)

        # Apply filters
        if tipo:
            try:
                tipo_enum = TipoNotificacao(tipo)
                query = query.filter(Notificacao.tipo == tipo_enum)
            except ValueError:
                return jsonify({"erro": f"Tipo inválido: {tipo}"}), 400

        if pedido_id:
            query = query.filter(Notificacao.pedido_id == pedido_id)

        # Order by most recent and limit results
        notificacoes = query.order_by(
            Notificacao.created_at.desc()).limit(limit).all()

        return jsonify({
            "notificacoes": [n.to_dict() for n in notificacoes],
            "total": len(notificacoes),
            "filtros_aplicados": {
                "tipo": tipo,
                "pedido_id": pedido_id,
                "limit": limit
            }
        }), 200
    finally:
        db.close()


@routes.route('/notificacoes/tipos', methods=['GET'])
def listar_tipos():
    """List available notification types"""
    tipos = [tipo.value for tipo in TipoNotificacao]
    return jsonify({
        "tipos_disponiveis": tipos,
        "descricoes": {
            "pedido_criado": "Notificação quando um novo pedido é criado",
            "pedido_aceito": "Notificação quando um pedido é aceito pela cozinha",
            "pedido_recusado": "Notificação quando um pedido é recusado",
            "pedido_finalizado": "Notificação quando um pedido é finalizado",
            "sistema": "Notificações gerais do sistema"
        }
    }), 200


@routes.route('/notificacoes/resumo', methods=['GET'])
def resumo_notificacoes():
    """Get summary of notifications by type"""
    db = SessionLocal()
    try:
        resumo = {}
        for tipo in TipoNotificacao:
            count = db.query(Notificacao).filter(
                Notificacao.tipo == tipo).count()
            resumo[tipo.value] = count

        total = db.query(Notificacao).count()

        return jsonify({
            "resumo_por_tipo": resumo,
            "total_notificacoes": total
        }), 200
    finally:
        db.close()


@routes.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Test database connectivity
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return jsonify({
            "status": "healthy",
            "service": "notificacoes",
            "database": "connected"
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "service": "notificacoes",
            "database": "disconnected",
            "error": str(e)
        }), 500
