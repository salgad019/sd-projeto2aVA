class Notificacao:
    def __init__(self, pedido_id, mensagem):
        self.pedido_id = pedido_id
        self.mensagem = mensagem

    def to_dict(self):
        return {
            "pedido_id": self.pedido_id,
            "mensagem": self.mensagem
        }
