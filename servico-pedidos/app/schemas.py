from pydantic import BaseModel
from typing import Optional, Any, List
from datetime import datetime


class ItemPedido(BaseModel):
    nome: str
    quantidade: int
    preco: float


class PedidoRequest(BaseModel):
    pedido_id: str
    itens: List[ItemPedido]
    cliente_id: Optional[str] = None
    mesa: Optional[int] = None


class PedidoResponse(BaseModel):
    status: str
    pedido_id: str
    resposta_cozinha: Optional[dict] = None
    erro: Optional[str] = None
    total: Optional[float] = None
    timestamp: Optional[str] = None


class PedidoCompleto(BaseModel):
    pedido_id: str
    itens: List[ItemPedido]
    cliente_id: Optional[str] = None
    mesa: Optional[int] = None
    status: str
    total: float
    created_at: datetime
    updated_at: datetime
