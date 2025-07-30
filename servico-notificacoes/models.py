from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()


class TipoNotificacao(enum.Enum):
    PEDIDO_CRIADO = "pedido_criado"
    PEDIDO_ACEITO = "pedido_aceito"
    PEDIDO_RECUSADO = "pedido_recusado"
    PEDIDO_FINALIZADO = "pedido_finalizado"
    SISTEMA = "sistema"


class Notificacao(Base):
    __tablename__ = "notificacoes"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(String, nullable=False, index=True)
    tipo = Column(Enum(TipoNotificacao), nullable=False,
                  default=TipoNotificacao.SISTEMA)
    mensagem = Column(String, nullable=False)
    # JSON string for additional details
    detalhes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "pedido_id": self.pedido_id,
            "tipo": self.tipo.value if self.tipo else "sistema",
            "mensagem": self.mensagem,
            "detalhes": self.detalhes,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
