from bs4 import BeautifulSoup
from typing import List, Dict, Optional


def parse_listings(html: str) -> List[Dict]:
    soup = BeautifulSoup(html, "html.parser")
    items: List[Dict] = []
    # Container for each listing
    listing_containers = soup.select("div.MuiGrid2-root.MuiGrid2-container.MuiGrid2-direction-xs-row.mui-1qrjc3g")
    
    for container in listing_containers:
        # Find the link to detail page (usually in an <a> tag)
        url_el = container.select_one("a")
        if not url_el or not url_el.get("href"):
            continue
        
        url = url_el["href"]
        # Make URL absolute if relative
        if url.startswith("/"):
            url = f"https://www.nehnutelnosti.sk{url}"
        
        # Extract external_id from URL (usually in format like /inzerat/123456/)
        external_id = _extract_id_from_url(url)
        if not external_id:
            continue
        
        # Title - try multiple selectors as HTML structure may vary
        title = ""
        title_selectors = [
            "h2.MuiTypography-root.MuiTypography-h4.MuiTypography-noWrap.mui-ibivuk",
            "h2.MuiTypography-h4",
            "h2.MuiTypography-root",
            "h2",
            "a[href] h2",
            "a[href] h3",
        ]
        for selector in title_selectors:
            title_el = container.select_one(selector)
            if title_el and title_el.text.strip():
                title = title_el.text.strip()
                break
        
        # Location
        location_el = container.select_one("p.MuiTypography-root.MuiTypography-body2.MuiTypography-noWrap.mui-1jfsjra")
        location = location_el.text.strip() if location_el else ""
        
        # Area in m²
        area_el = container.select_one("p.MuiTypography-root.MuiTypography-body2.mui-5c21y4")
        area_text = area_el.text.strip() if area_el else ""
        area = _extract_number(area_text)
        
        # Price
        price_el = container.select_one("p.MuiTypography-root.MuiTypography-h5.mui-ce5ndv")
        price_text = price_el.text.strip() if price_el else ""
        price = None
        if price_el and any(c.isdigit() for c in price_text):
            price = _extract_number(price_text)
        
        # Price per m²
        price_per_m2_el = container.select_one("p.MuiTypography-root.MuiTypography-label1.mui-u7akpj")
        price_per_m2_text = price_per_m2_el.text.strip() if price_per_m2_el else ""
        price_per_m2 = _extract_number(price_per_m2_text) if price_per_m2_el else None
        
        # Description
        desc_el = container.select_one("p.MuiTypography-root.MuiTypography-body2.mui-ce8onx")
        description = desc_el.text.strip() if desc_el else ""
        
        # Seller
        seller_el = container.select_one("p.MuiTypography-root.MuiTypography-label1.MuiTypography-noWrap.mui-srzmk6")
        seller = seller_el.text.strip() if seller_el else ""
        
        # Rooms from dedicated element
        rooms_el = container.select_one("p.MuiTypography-root.MuiTypography-body2.MuiTypography-noWrap.mui-1u9yyor")
        rooms_text = rooms_el.text.strip() if rooms_el else ""
        rooms = None
        if rooms_el:
            # Extract number from text like "3 izbový byt" or "4 izby"
            rooms = _extract_rooms_from_text(rooms_text)
        
        items.append(
            {
                "external_id": str(external_id),
                "url": url,
                "title": title,
                "location": location,
                "price_eur": price,
                "area_m2": area,
                "price_per_m2": price_per_m2,
                "rooms": rooms,
                "description": description,
                "seller": seller,
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


def parse_detail_for_title(html: str) -> Optional[str]:
    """Extract title from detail page HTML."""
    soup = BeautifulSoup(html, "html.parser")
    
    # Try multiple selectors for title on detail page
    title_selectors = [
        "h1",
        "h1.MuiTypography-root",
        "h1.MuiTypography-h3",
        "h1.MuiTypography-h4",
        ".property-title",
        "[data-testid='property-title']",
        "title",  # Fallback to page title tag
    ]
    
    for selector in title_selectors:
        title_el = soup.select_one(selector)
        if title_el and title_el.text.strip():
            title = title_el.text.strip()
            # If it's the page title tag, might have extra text like " | nehnutelnosti.sk"
            if selector == "title":
                title = title.split("|")[0].strip()
            if title:
                return title
    
    return None


def _extract_number(text: str) -> Optional[float]:
    import re

    if not text:
        return None
    
    # Match sequences of digits with separators (spaces, commas, dots, non-breaking spaces)
    # Use a simple, flexible pattern that matches the entire number
    # This will match: digits followed by any combination of separators and more digits
    pattern = r"[0-9]+(?:[\s\xa0\,\.][0-9]+)*"
    match = re.search(pattern, text)
    if not match:
        return None
    
    s = match.group(0)
    
    # Detect format: European (comma as decimal) vs American (dot as decimal)
    # European: "1 473 734,96" or "1473734,96" - comma followed by 1-2 digits at end (typically 2 for cents)
    # American: "1,473,734.96" or "1473734.96" - dot followed by 1-2 digits at end
    
    # Check if comma is decimal separator:
    # - In European format with spaces: comma after space/digits followed by 1-2 digits at end
    # - Without spaces: comma followed by 1-2 digits at end (not 3, as that would be thousands)
    has_spaces = ' ' in s or '\xa0' in s
    comma_match = re.search(r',(\d{1,2})$', s)  # 1-2 digits (not 3, as 3 would be thousands)
    # Check if dot is decimal separator (followed by 1-2 digits at the end)
    dot_match = re.search(r'\.(\d{1,2})$', s)
    
    # Comma is decimal if:
    # 1. It's followed by 1-2 digits at end AND (there are spaces in the number OR no other commas before it)
    # 2. This distinguishes "1 473 734,96" (decimal) from "1,234,567" (thousands)
    has_comma_decimal = comma_match is not None and (has_spaces or s.count(',') == 1)
    has_dot_decimal = dot_match is not None
    
    if has_comma_decimal and not has_dot_decimal:
        # European format: spaces are thousands, comma is decimal
        # Remove all spaces (thousands separators)
        s = s.replace("\xa0", "").replace(" ", "")
        # Replace comma with dot for decimal separator
        s = s.replace(",", ".")
    elif has_dot_decimal:
        # American format: dots or commas can be thousands, dot is decimal
        # Remove spaces and commas (thousands separators)
        s = s.replace("\xa0", "").replace(" ", "").replace(",", "")
        # If multiple dots, keep only the last one as decimal
        if s.count(".") > 1:
            parts = s.split(".")
            s = "".join(parts[:-1]) + "." + parts[-1]
    else:
        # No decimal part detected - all separators are thousands separators
        # Remove all separators (spaces, commas, dots)
        s = s.replace("\xa0", "").replace(" ", "").replace(",", "").replace(".", "")
    
    try:
        return float(s)
    except ValueError:
        return None


def _extract_id_from_url(url: str) -> Optional[str]:
    """Extract property ID from URL like /inzerat/123456/ or /detail/JuT21KC6jyn/..."""
    import re
    import hashlib
    
    # Try to find numeric ID in URL (pattern: /inzerat/123456/)
    match = re.search(r"/inzerat/(\d+)/?", url)
    if match:
        return match.group(1)
    
    # Try to find alphanumeric ID in URL (pattern: /detail/JuT21KC6jyn/...)
    match = re.search(r"/detail/([A-Za-z0-9_-]+)/?", url)
    if match:
        id_str = match.group(1)
        # Ensure it's not too long (max 100 chars)
        if len(id_str) <= 100:
            return id_str
        # If too long, use first 100 chars
        return id_str[:100]
    
    # Fallback: use URL hash or last numeric segment
    match = re.search(r"/(\d+)/?$", url)
    if match:
        return match.group(1)
    
    # Last resort: use hash of URL to ensure it fits in 100 chars
    url_hash = hashlib.md5(url.encode()).hexdigest()
    return url_hash[:100]


def _extract_rooms_from_text(text: str) -> Optional[int]:
    """Extract number of rooms from text (e.g., '3 izbový byt' -> 3, 'garzónka' -> 0)."""
    import re
    if not text:
        return None
    # Handle garzónka (studio apartment) - typically 0 or 1 room
    if "garzónka" in text.lower():
        return 0
    # Match patterns like "3 izbový", "4-izbový", "2 izby", "1 izba"
    match = re.search(r"(\d+)[\s-]*(?:izbový|izby|izb|izba)", text, re.IGNORECASE)
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            pass
    return None



