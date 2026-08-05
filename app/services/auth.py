import base64
import hashlib
import hmac
import os
import time

from dotenv import load_dotenv

load_dotenv()

COOKIE_NAME = "gj_session"
SESSION_MAX_AGE = 60 * 60 * 24 * 30  # 30 dias


def _get_password() -> str:
    senha = os.environ.get("APP_PASSWORD")
    if not senha:
        raise RuntimeError("APP_PASSWORD não está configurada nas variáveis de ambiente.")
    return senha


def _signing_key() -> bytes:
    return hashlib.sha256(_get_password().encode("utf-8")).digest()


def verify_password(senha: str) -> bool:
    return hmac.compare_digest((senha or "").encode("utf-8"), _get_password().encode("utf-8"))


def create_session_token() -> str:
    payload = base64.urlsafe_b64encode(str(int(time.time())).encode()).rstrip(b"=")
    assinatura = hmac.new(_signing_key(), payload, hashlib.sha256).digest()
    assinatura_encoded = base64.urlsafe_b64encode(assinatura).rstrip(b"=")
    return f"{payload.decode()}.{assinatura_encoded.decode()}"


def verify_session_token(token: str | None) -> bool:
    if not token or "." not in token:
        return False

    payload_part, assinatura_part = token.split(".", 1)
    assinatura_esperada = hmac.new(_signing_key(), payload_part.encode("utf-8"), hashlib.sha256).digest()
    assinatura_esperada_encoded = base64.urlsafe_b64encode(assinatura_esperada).rstrip(b"=").decode()

    if not hmac.compare_digest(assinatura_part, assinatura_esperada_encoded):
        return False

    try:
        padded = payload_part + "=" * (-len(payload_part) % 4)
        emitido_em = int(base64.urlsafe_b64decode(padded.encode()).decode())
    except (ValueError, UnicodeDecodeError):
        return False

    return (time.time() - emitido_em) < SESSION_MAX_AGE
