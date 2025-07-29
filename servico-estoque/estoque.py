from flask import Flask, request, jsonify
from .database import SessionLocal, engine
from .models import Base, Ingrediente

app = Flask(__name__)

Base.metadata.create_all(bind=engine)

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

@app.route('/listar', methods=['GET'])
def listar_estoque():
    db = SessionLocal()
    ingredientes = db.query(Ingrediente).all()
    estoque = {i.nome: i.quantidade for i in ingredientes}
    db.close()
    return jsonify(estoque), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=6000)