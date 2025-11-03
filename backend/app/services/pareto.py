from typing import Iterable, List, Optional, Tuple


def is_dominated(a: Tuple[float, float, int, Optional[int]], b: Tuple[float, float, int, Optional[int]]) -> bool:
    # Objectives: minimize price, minimize price_per_m2, maximize rooms, maximize year_built
    a_price, a_ppm2, a_rooms, a_year = a
    b_price, b_ppm2, b_rooms, b_year = b

    not_worse = (
        b_price <= a_price
        and b_ppm2 <= a_ppm2
        and b_rooms >= a_rooms
        and ((b_year or -1) >= (a_year or -1))
    )
    strictly_better = (
        b_price < a_price
        or b_ppm2 < a_ppm2
        or b_rooms > a_rooms
        or ((b_year or -1) > (a_year or -1))
    )
    return not_worse and strictly_better


def skyline(records: Iterable[Tuple[int, float, float, int, Optional[int]]]) -> List[int]:
    # records: (id, price, price_per_m2, rooms, year)
    items = list(records)
    pareto: List[Tuple[int, float, float, int, Optional[int]]] = []
    for rec in items:
        dominated = False
        to_remove: List[int] = []
        for i, p in enumerate(pareto):
            if is_dominated((rec[1], rec[2], rec[3], rec[4]), (p[1], p[2], p[3], p[4])):
                dominated = True
                break
            if is_dominated((p[1], p[2], p[3], p[4]), (rec[1], rec[2], rec[3], rec[4])):
                to_remove.append(i)
        if not dominated:
            for idx in reversed(to_remove):
                pareto.pop(idx)
            pareto.append(rec)
    return [r[0] for r in pareto]



