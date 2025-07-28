import json
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    def __init__(self):
        # Carrega do arquivo JSON ou variáveis de ambiente
        if os.path.exists('config.json'):
            with open('config.json') as f:
                config = json.load(f)
            self.COZINHA_HOST = config.get('cozinha_host', '127.0.0.1')
            self.COZINHA_PORTA = config.get('cozinha_porta', 5000)
            self.COZINHA_ENDPOINT = config.get('cozinha_endpoint', '/preparar')
        else:
            self.COZINHA_HOST = os.getenv('COZINHA_HOST', '127.0.0.1')
            self.COZINHA_PORTA = os.getenv('COZINHA_PORTA', 5000)
            self.COZINHA_ENDPOINT = os.getenv('COZINHA_ENDPOINT', '/preparar')
        
        self.COZINHA_URL = f"http://{self.COZINHA_HOST}:{self.COZINHA_PORTA}{self.COZINHA_ENDPOINT}"

config = Config()