"""
OpenAI Provider implementation.
Uses the official AsyncOpenAI client. API key stays server-side.
"""
from app.ai.base import BaseAIProvider
from app.core.config import settings
from openai import AsyncOpenAI


class OpenAIProvider(BaseAIProvider):

    def __init__(self):
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            raise ValueError("OPENAI_API_KEY is not set in environment or .env file.")
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=4096,
        )
        return response.choices[0].message.content or ""
