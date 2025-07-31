from pydantic import BaseModel
from typing import Optional, List

class ItemPedido(BaseModel):
    produto: str
    quantidade: int

class PedidoRequest(BaseModel):
    pedido_id: str
    itens: List[ItemPedido]
    prioridade: Optional[str] = "normal"
    cliente_id: Optional[str] = None

class PedidoResponse(BaseModel):
    pedido_id: str
    status: str
    tempo_estimado_min: Optional[int] = None
    motivo: Optional[str] = None
    resposta_cozinha: Optional[dict] = None
    erro: Optional[str] = None