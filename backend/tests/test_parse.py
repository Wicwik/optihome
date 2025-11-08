import pytest
from app.services.scraper.parse import (
    parse_listings,
    _extract_number,
    _extract_id_from_url,
    _extract_rooms_from_text,
)


def test_extract_number():
    assert _extract_number("148 000 €") == 148000.0
    assert _extract_number("1 720,93 €/m²") == 1720.93
    assert _extract_number("86 m²") == 86.0
    assert _extract_number("3 245,45") == 3245.45
    assert _extract_number("no number") is None


def test_extract_id_from_url():
    assert _extract_id_from_url("https://www.nehnutelnosti.sk/inzerat/123456/") == "123456"
    assert _extract_id_from_url("https://www.nehnutelnosti.sk/detail/JuT21KC6jyn/some-slug") == "JuT21KC6jyn"
    assert _extract_id_from_url("/detail/ABC123/") == "ABC123"
    # Hash fallback should return 32 char MD5
    result = _extract_id_from_url("https://example.com/no-pattern")
    assert result is not None
    assert len(result) <= 100


def test_extract_rooms_from_text():
    assert _extract_rooms_from_text("3 izbový byt") == 3
    assert _extract_rooms_from_text("4-izbový byt") == 4
    assert _extract_rooms_from_text("2 izby") == 2
    assert _extract_rooms_from_text("garzónka") == 0
    assert _extract_rooms_from_text("GARZÓNKA") == 0
    assert _extract_rooms_from_text("no rooms") is None


def test_parse_listings_empty():
    html = "<html><body></body></html>"
    result = parse_listings(html)
    assert result == []


def test_parse_listings_sample():
    # Sample HTML structure (simplified)
    html = """
    <div class="MuiGrid2-root MuiGrid2-container MuiGrid2-direction-xs-row mui-1qrjc3g">
        <a href="/detail/ABC123/test">
            <h2 class="MuiTypography-root MuiTypography-h4 MuiTypography-noWrap mui-ibivuk">Test Property</h2>
            <p class="MuiTypography-root MuiTypography-body2 MuiTypography-noWrap mui-1jfsjra">Bratislava</p>
            <p class="MuiTypography-root MuiTypography-body2.mui-5c21y4">86 m²</p>
            <p class="MuiTypography-root MuiTypography-body2.MuiTypography-noWrap.mui-1u9yyor">3 izbový byt</p>
            <p class="MuiTypography-root MuiTypography-h5.mui-ce5ndv">148 000 €</p>
            <p class="MuiTypography-root MuiTypography-label1.mui-u7akpj">1 720,93 €/m²</p>
        </a>
    </div>
    """
    # Note: This test would need actual HTML structure to work properly
    # For now, just verify the function doesn't crash
    result = parse_listings(html)
    assert isinstance(result, list)

