import time
from typing import Optional
import random
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential


HEADERS = {
    "User-Agent": "OptiHomeBot/0.1 (research; contact: example@example.com)",
}


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
async def fetch(url: str, timeout: float = 15.0, follow_redirects: bool = True) -> Optional[str]:
    async with httpx.AsyncClient(headers=HEADERS, timeout=timeout, follow_redirects=follow_redirects) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        # polite crawl
        time.sleep(0.5 + random.random())
        return resp.text



