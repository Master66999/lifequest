"""
AI Abstraction Layer — Base class.
All AI providers must implement this interface.
This allows swapping Gemini → OpenAI → Anthropic → any future provider
by changing a single environment variable: AI_PROVIDER
"""
from abc import ABC, abstractmethod
from typing import Any


class BaseAIProvider(ABC):

    @abstractmethod
    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        """
        Send a prompt to the LLM and return the raw text response.
        System prompt = persistent persona/instructions (AURA).
        User prompt = the specific request.
        """
        ...
