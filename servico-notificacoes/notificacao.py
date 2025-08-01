from models import Notificacao, TipoNotificacao
from database import salvar_notificacao
import json


def processar_notificacao(data):
    pedido_id = data.get("pedido_id")
    mensagem = data.get("mensagem")
    tipo_str = data.get("tipo", "sistema")
    detalhes = data.get("detalhes")

    if not pedido_id or not mensagem:
        return None, "Campos obrigatórios ausentes: pedido_id e mensagem"

    # Convert string to enum
    try:
        if isinstance(tipo_str, str):
            tipo = TipoNotificacao(tipo_str)
        else:
            tipo = TipoNotificacao.SISTEMA
    except ValueError:
        tipo = TipoNotificacao.SISTEMA

    # Convert detalhes to JSON string if it's a dict
    detalhes_json = None
    if detalhes:
        if isinstance(detalhes, dict):
            detalhes_json = json.dumps(detalhes)
        else:
            detalhes_json = str(detalhes)

    # Create notification using proper initialization
    notificacao = Notificacao()
    notificacao.pedido_id = pedido_id
    notificacao.tipo = tipo
    notificacao.mensagem = mensagem
    notificacao.detalhes = detalhes_json

    salvar_notificacao(notificacao)

    # Enhanced logging with emoji based on type
    emoji = {
        TipoNotificacao.PEDIDO_CRIADO: "📝",
        TipoNotificacao.PEDIDO_ACEITO: "✅",
        TipoNotificacao.PEDIDO_RECUSADO: "❌",
        TipoNotificacao.PEDIDO_FINALIZADO: "🍽️",
        TipoNotificacao.SISTEMA: "🔔"
    }.get(tipo, "🔔")

    print(f"{emoji} [{tipo.value.upper()}] Pedido {pedido_id}: {mensagem}")
    return notificacao, None
