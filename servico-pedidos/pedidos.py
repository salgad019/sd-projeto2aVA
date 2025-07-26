import json
import requests
from flask import Flask, request, jsonify

# Carregar config.json
with open('config.json') as f:
    config = json.load(f)

COZINHA_URL = f"http://{config['cozinha_host']}:{config['cozinha_porta']}{config['cozinha_endpoint']}"

app = Flask(__name__)

@app.route('/novo-pedido', methods=['POST'])
def novo_pedido():
    pedido = request.get_json()

    try:
        print(f"Enviando pedido à cozinha: {pedido['pedido_id']}")
        resposta = requests.post(COZINHA_URL, json=pedido, timeout=5)

        if resposta.status_code == 200:
            dados = resposta.json()
            print(f"✅ Resposta da cozinha: {dados}")
            return jsonify({
                "status": "enviado_para_cozinha",
                "resposta_cozinha": dados
            }), 200
        else:
            print(f"Erro na resposta da cozinha: {resposta.status_code}")
            return jsonify({"erro": "Cozinha retornou erro"}), 500

    except requests.exceptions.RequestException as e:
        print(f"Erro de comunicação com a cozinha: {e}")
        return jsonify({"erro": "Não foi possível contatar a cozinha"}), 503


if __name__ == '__main__':
    app.run(host="127.0.0.1", port=4000)
