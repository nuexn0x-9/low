import json
import asyncio
from typing import Dict, Any, Optional, Tuple
from app.core.config import settings
from app.services.ai.provider_base import BaseAIProvider
from app.services.ai.prompt_builder import build_system_prompt


class OpenAIAIProvider(BaseAIProvider):
    """
    Hardened OpenAI API Provider using JSON mode with retry, exponential backoff,
    timeout handling, safety limits, and strict error sanitization.
    """
    provider_name: str = "openai"

    @property
    def model_name(self) -> str:
        return settings.AI_MODEL

    async def generate_low_patch(
        self,
        prompt: str,
        result_type: str,
        frame_preset: Optional[Dict[str, Any]] = None,
    ) -> Tuple[Dict[str, Any], Optional[Dict[str, Any]]]:
        api_key = settings.OPENAI_API_KEY.strip() if settings.OPENAI_API_KEY else ""
        if not api_key:
            raise ValueError("OPENAI_API_KEY is not configured. Please set OPENAI_API_KEY or switch to AI_PROVIDER=mock")

        import httpx

        sys_prompt = build_system_prompt(result_type, frame_preset)
        user_content = f"User request: '{prompt}'. Generate design for a {result_type}."

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        body = {
            "model": settings.AI_MODEL,
            "messages": [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": user_content},
            ],
            "response_format": {"type": "json_object"},
            "max_tokens": settings.AI_MAX_OUTPUT_TOKENS,
            "temperature": 0.3,
        }

        max_retries = max(0, settings.AI_MAX_RETRIES)
        timeout_sec = float(settings.AI_REQUEST_TIMEOUT_SECONDS)
        last_error = None

        for attempt in range(max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=timeout_sec) as client:
                    res = await client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers=headers,
                        json=body,
                    )

                # Check HTTP statuses and sanitize messages
                if res.status_code == 401:
                    raise ValueError("OPENAI API key is invalid or unauthorized.")
                elif res.status_code == 429:
                    if attempt < max_retries:
                        await asyncio.sleep(1.5 * (attempt + 1))
                        continue
                    raise ValueError("OpenAIrate limit reached. Please try again later.")
                elif res.status_code >= 500:
                    if attempt < max_retries:
                        await asyncio.sleep(1.0 * (attempt + 1))
                        continue
                    raise ValueError(f"OpenAI service temporarily unavailable (status{res.status_code}).")
                elif res.status_code != 200:
                    err_msg = "OpenAI API request failed."
                    try:
                        raw_json = res.json()
                        err_json = await raw_json if asyncio.iscoroutine(raw_json) else raw_json
                        if isinstance(err_json, dict) and "error" in err_json and "message" in err_json["error"]:
                            safe_msg = err_json["error"]["message"]
                            if api_key:
                                safe_msg = safe_msg.replace(api_key, "[REDACTED]")
                            err_msg = f"OpenAI API error: {safe_msg}"
                    except Exception:
                        pass
                    raise ValueError(err_msg)

                # Prevent unbounded large responses
                if len(res.content) > 1024 * 1024:
                    raise ValueError("OpenAI response exceeded 1 MB limit.")

                data = res.json()
                choices = data.get("choices", [])
                if not choices:
                    raise ValueError("OpenAI returned no response choices.")

                content_str = choices[0].get("message", {}).get("content", "")
                if not content_str or not content_str.strip():
                    raise ValueError("OpenAI returned empty message content.")

                try:
                    patch = json.loads(content_str)
                except json.JSONDecodeError as je:
                    raise ValueError(f"OpenAI output is not valid JSON: {str(je)}")

                usage_raw = data.get("usage", {})
                usage_info = {
                    "prompt_tokens": usage_raw.get("prompt_tokens", 0),
                    "completion_tokens": usage_raw.get("completion_tokens", 0),
                    "total_tokens": usage_raw.get("total_tokens", 0),
                }

                return patch, usage_info


            except httpx.TimeoutException:
                last_error = ValueError(f"OpenAI request timed out after {timeout_sec}s.")
                if attempt < max_retries:
                    await asyncio.sleep(1.0 * (attempt + 1))
                    continue
            except httpx.NetworkError as ne:
                last_error = ValueError("Network error connecting to OpenAI API.")
                if attempt < max_retries:
                    await asyncio.sleep(1.0 * (attempt + 1))
                    continue
            except Exception as e:
                msg = str(e)
                if api_key:
                    msg = msg.replace(api_key, "[REDACTED]")
                last_error = ValueError(msg)
                if attempt < max_retries and "rate limit" in msg.lower():
                    await asyncio.sleep(1.5 * (attempt + 1))
                    continue
                break

        raise last_error or ValueError("Failed to generate Information from OpenAI.")
