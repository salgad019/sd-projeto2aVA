def salvar_notificacao(notificacao):
    with open("notificacoes.log", "a") as f:
        f.write(f"{notificacao.pedido_id}: {notificacao.mensagem}\n")
