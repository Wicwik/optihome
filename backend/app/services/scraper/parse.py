from bs4 import BeautifulSoup
from typing import List, Dict, Optional


def parse_listings(html: str) -> List[Dict]:
    soup = BeautifulSoup(html, "html.parser")
    items: List[Dict] = []
    # NOTE: Placeholder selectors — to be refined against actual site structure.
    for card in soup.select(".advertisement-item"):
        url_el = card.select_one("a")
        title_el = card.select_one("h2, .title")
        price_el = card.select_one(".price")
        area_el = card.select_one(".area")
        rooms_el = card.select_one(".rooms")
        external_id = card.get("data-id") or (url_el["href"] if url_el else None)
        if not external_id or not url_el:
            continue
        price = _extract_number(price_el.text) if price_el else None
        area = _extract_number(area_el.text) if area_el else None
        rooms = int(_extract_number(rooms_el.text)) if rooms_el else None
        items.append(
            {
                "external_id": str(external_id),
                "url": url_el["href"],
                "title": title_el.text.strip() if title_el else "",
                "price_eur": price,
                "area_m2": area,
                "rooms": rooms,
            }
        )
    return items


def parse_detail_for_year(html: str) -> Optional[int]:
    soup = BeautifulSoup(html, "html.parser")
    # Placeholder logic; refine with real selectors
    for row in soup.select(".property-attributes li, .facts li"):
        text = row.get_text(" ", strip=True)
        if "rok" in text.lower() and any(ch.isdigit() for ch in text):
            num = _extract_number(text)
            if num and 1800 < num < 2100:
                return int(num)
    return None


def _extract_number(text: str) -> Optional[float]:
    import re

    nums = re.findall(r"[0-9]+(?:[\s\,\.][0-9]{3})*(?:[\.,][0-9]+)?", text)
    if not nums:
        return None
    s = nums[0]
    s = s.replace("\xa0", " ").replace(" ", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None



