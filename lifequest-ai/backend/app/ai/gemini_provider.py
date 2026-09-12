"""
Google Gemini AI Provider implementation.
Uses the google-genai SDK. API key stays server-side — never exposed to frontend.
"""
from app.ai.base import BaseAIProvider
from app.core.config import settings
from google import genai
from google.genai import types


class GeminiProvider(BaseAIProvider):

    def __init__(self):
        self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self._model = "gemini-2.0-flash"

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        response = self._client.models.generate_content(
            model=self._model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.7,
                max_output_tokens=4096,
            ),
        )
        return response.text or ""
