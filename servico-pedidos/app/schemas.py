from pydantic import BaseModel
from typing import Optional, Any

class PedidoRequest(BaseModel):
    pedido_id: str
    itens: list
    cliente_id: Optional[str] = None

class PedidoResponse(BaseModel):
    status: str
    resposta_cozinha: Optional[dict] = None
    erro: Optional[str] = None