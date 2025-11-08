import pytest
from app.services.pareto import skyline, is_dominated


def test_is_dominated():
    # a: (price, price_per_m2, rooms, year)
    a = (100000, 2000, 2, 1990)
    b = (90000, 1800, 3, 2000)  # Better in all objectives
    assert is_dominated(a, b) is True
    assert is_dominated(b, a) is False
    
    # Equal in all - neither dominates
    c = (100000, 2000, 2, 1990)
    assert is_dominated(a, c) is False


def test_skyline_basic():
    # Simple case: one item dominates another
    records = [
        (1, 100000, 2000, 2, 1990),  # Dominated
        (2, 90000, 1800, 3, 2000),   # Pareto optimal
    ]
    result = skyline(records)
    assert 2 in result
    assert 1 not in result


def test_skyline_multiple_optimal():
    # Multiple Pareto-optimal items
    records = [
        (1, 100000, 2000, 2, 1990),  # Cheaper but fewer rooms
        (2, 120000, 1800, 4, 2000),  # More expensive but more rooms
        (3, 150000, 2500, 1, 1980),  # Dominated by both
    ]
    result = skyline(records)
    assert 1 in result
    assert 2 in result
    assert 3 not in result


def test_skyline_with_none_year():
    # Handle None year_built
    records = [
        (1, 100000, 2000, 2, None),
        (2, 90000, 1800, 3, 2000),
    ]
    result = skyline(records)
    # Should handle None gracefully
    assert isinstance(result, list)


def test_skyline_empty():
    assert skyline([]) == []


def test_skyline_single():
    records = [(1, 100000, 2000, 2, 1990)]
    result = skyline(records)
    assert result == [1]

