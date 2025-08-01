from flask import Flask, request, jsonify
from database import SessionLocal, engine
from models import Base, Ingrediente
from sqlalchemy import text
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)


def create_tables_with_retry():
    """Create database tables with retry logic"""
    max_retries = 30
    retry_interval = 2

    for attempt in range(max_retries):
        try:
            logger.info(
                f"Attempting to create database tables (attempt {attempt + 1}/{max_retries})")
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables created successfully!")
            break
        except Exception as e:
            logger.warning(f"Failed to create tables: {e}")
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_interval} seconds...")
                time.sleep(retry_interval)
            else:
                logger.error(
                    "Failed to create database tables after all retries")
                raise


# Initialize database tables
create_tables_with_retry()


@app.route('/cadastrar', methods=['POST'])
def cadastrar_ingrediente():
    db = SessionLocal()
    dados = request.get_json()
    if not dados or "produto" not in dados or "quantidade" not in dados:
        db.close()
        return jsonify({"erro": "Informe 'produto' e 'quantidade'"}), 400

    produto = dados["produto"]
    quantidade = dados["quantidade"]

    if not isinstance(quantidade, int) or quantidade <= 0:
        db.close()
        return jsonify({"erro": "A quantidade deve ser um inteiro positivo"}), 400

    ingrediente = db.query(Ingrediente).filter_by(nome=produto).first()
    if ingrediente:
        ingrediente.quantidade += quantidade
    else:
        ingrediente = Ingrediente(nome=produto, quantidade=quantidade)
        db.add(ingrediente)
    db.commit()

    ingredientes = db.query(Ingrediente).all()
    estoque = {i.nome: i.quantidade for i in ingredientes}
    db.close()
    return jsonify({"mensagem": f"{quantidade} unidade(s) de '{produto}' cadastrada(s) com sucesso!", "estoque": estoque}), 201


@app.route('/disponivel', methods=['GET'])
def verificar_disponibilidade_geral():
    """Check general stock availability for kitchen operations"""
    db = SessionLocal()
    try:
        ingredientes = db.query(Ingrediente).all()
        total_ingredientes = len(ingredientes)
        ingredientes_disponiveis = len(
            [i for i in ingredientes if i.quantidade > 0])

        # Consider stock available if we have at least 80% of ingredients with quantity > 0
        disponivel = (ingredientes_disponiveis / total_ingredientes *
                      100) >= 80 if total_ingredientes > 0 else False

        return jsonify({
            "disponivel": disponivel,
            "total_ingredientes": total_ingredientes,
            "ingredientes_disponiveis": ingredientes_disponiveis,
            "percentual_disponibilidade": round((ingredientes_disponiveis / total_ingredientes * 100) if total_ingredientes > 0 else 0, 2)
        }), 200
    finally:
        db.close()


@app.route('/disponivel', methods=['POST'])
def verificar_disponibilidade():
    db = SessionLocal()
    itens = request.get_json()
    if not itens:
        db.close()
        return jsonify({"erro": "Nenhum item informado"}), 400

    indisponiveis = []
    for item, quantidade in itens.items():
        ingrediente = db.query(Ingrediente).filter_by(nome=item).first()
        if not ingrediente or ingrediente.quantidade < quantidade:
            indisponiveis.append(item)

    db.close()
    if indisponiveis:
        return jsonify({"disponivel": False, "faltando": indisponiveis}), 200
    else:
        return jsonify({"disponivel": True}), 200


@app.route('/consumir', methods=['POST'])
def consumir_ingredientes():
    """Consume ingredients for an order"""
    db = SessionLocal()
    try:
        itens = request.get_json()
        if not itens:
            return jsonify({"erro": "Nenhum item informado"}), 400

        # Check availability first
        indisponiveis = []
        for item, quantidade in itens.items():
            ingrediente = db.query(Ingrediente).filter_by(nome=item).first()
            if not ingrediente or ingrediente.quantidade < quantidade:
                indisponiveis.append(item)

        if indisponiveis:
            return jsonify({"erro": "Ingredientes insuficientes", "faltando": indisponiveis}), 400

        # Consume ingredients
        for item, quantidade in itens.items():
            ingrediente = db.query(Ingrediente).filter_by(nome=item).first()
            ingrediente.quantidade -= quantidade

        db.commit()
        return jsonify({"mensagem": "Ingredientes consumidos com sucesso"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"erro": str(e)}), 500
    finally:
        db.close()


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return jsonify({
            "status": "healthy",
            "service": "estoque",
            "database": "connected"
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "service": "estoque",
            "database": "disconnected",
            "error": str(e)
        }), 500


@app.route('/listar', methods=['GET'])
def listar_estoque():
    db = SessionLocal()
    ingredientes = db.query(Ingrediente).all()
    estoque = {i.nome: i.quantidade for i in ingredientes}
    db.close()
    return jsonify(estoque), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=6000)
