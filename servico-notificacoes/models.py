from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class Notificacao(Base):
    __tablename__ = "notificacoes"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(String, nullable=False, index=True)
    mensagem = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "pedido_id": self.pedido_id,
            "mensagem": self.mensagem,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
