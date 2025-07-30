from models import Notificacao
from database import salvar_notificacao

def processar_notificacao(data):
    pedido_id = data.get("pedido_id")
    mensagem = data.get("mensagem")

    if not pedido_id or not mensagem:
        return None, "Campos obrigatórios ausentes"

    notificacao = Notificacao(pedido_id, mensagem)
    salvar_notificacao(notificacao)

    print(f"🔔 Pedido {pedido_id}: {mensagem}")
    return notificacao, None
