from flask import Flask
from app.routes import pedidos_bp
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)
    
    # Registrar blueprints
    app.register_blueprint(pedidos_bp)
    
    logger.info("🍕 Serviço de Pedidos iniciado")
    return app

app = create_app()

if __name__ == '__main__':
    app.run(host="127.0.0.1", port=4000, debug=True)