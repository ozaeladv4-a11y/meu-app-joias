import sys
from pathlib import Path

# Adiciona a raiz do projeto ao sys.path para garantir resolução dos módulos em ambiente serverless
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from main import app

