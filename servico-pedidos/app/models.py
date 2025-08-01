from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Pedido(Base):
    __tablename__ = "pedidos"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(String, unique=True, index=True, nullable=False)
    cliente_id = Column(String, nullable=True)
    mesa = Column(Integer, nullable=True)
    status = Column(String, nullable=False, default="processando")
    total = Column(Float, nullable=False)
    resposta_cozinha = Column(Text, nullable=True)  # JSON as text
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship with items
    itens = relationship("ItemPedido", back_populates="pedido",
                         cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "pedido_id": self.pedido_id,
            "cliente_id": self.cliente_id,
            "mesa": self.mesa,
            "status": self.status,
            "total": self.total,
            "resposta_cozinha": self.resposta_cozinha,
            "timestamp": self.created_at.isoformat() if self.created_at else None,
            "itens": [item.to_dict() for item in self.itens]
        }


class ItemPedido(Base):
    __tablename__ = "itens_pedido"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id_fk = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    nome = Column(String, nullable=False)
    quantidade = Column(Integer, nullable=False)
    preco = Column(Float, nullable=False)

    # Relationship with pedido
    pedido = relationship("Pedido", back_populates="itens")

    def to_dict(self):
        return {
            "nome": self.nome,
            "quantidade": self.quantidade,
            "preco": self.preco
        }
