"""
AI Provider Factory.
Reads AI_PROVIDER env var and returns the correct provider.
Adding a new provider: create a class that extends BaseAIProvider,
then add an entry here — zero changes anywhere else in the codebase.
"""
from functools import lru_cache
from app.ai.base import BaseAIProvider
from app.core.config import settings


@lru_cache(maxsize=1)
def get_ai_provider() -> BaseAIProvider:
    provider = settings.AI_PROVIDER.lower()

    if provider == "gemini":
        from app.ai.gemini_provider import GeminiProvider
        return GeminiProvider()
    elif provider in ("openai", "gpt"):
        from app.ai.openai_provider import OpenAIProvider
        return OpenAIProvider()

    raise ValueError(f"Unknown AI provider: '{provider}'. Set AI_PROVIDER in .env")
