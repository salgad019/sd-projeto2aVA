from flask import Blueprint, request, jsonify
from notificacao import processar_notificacao

routes = Blueprint('routes', __name__)

@routes.route('/notificar', methods=['POST'])
def notificar():
    data = request.get_json()
    notificacao, erro = processar_notificacao(data)

    if erro:
        return jsonify({"erro": erro}), 400

    return jsonify({"status": "notificado", **notificacao.to_dict()}), 200
