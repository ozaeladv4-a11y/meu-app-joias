import os
from functools import lru_cache

from dotenv import load_dotenv
from supabase import Client, ClientOptions, create_client

load_dotenv()


@lru_cache
def get_supabase() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    schema = os.environ.get("SUPABASE_SCHEMA", "joias")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL e SUPABASE_KEY não estão configuradas nas variáveis de ambiente."
        )
    options = ClientOptions(schema=schema) if schema else ClientOptions()
    return create_client(url, key, options=options)
