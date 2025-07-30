from flask import Blueprint, request, jsonify
from notificacao import processar_notificacao
from database import SessionLocal
from models import Notificacao
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
    """List all notifications"""
    db = SessionLocal()
    try:
        notificacoes = db.query(Notificacao).order_by(
            Notificacao.created_at.desc()).all()
        return jsonify([n.to_dict() for n in notificacoes]), 200
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
