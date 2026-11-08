#!/usr/bin/env python3
"""Loan schedules for the investor area (rules: Scope and Process, section 7.5). No investor data in this repository."""
from decimal import Decimal as D, ROUND_HALF_UP
from datetime import date
C = D("0.01")
WH = D("0.30")
def r(x): return x.quantize(C, ROUND_HALF_UP)
def annuity(p, rate, n): return p * rate / (1 - (1 + rate) ** (-n))
def row(n, due, interest, principal, remaining):
    g = r(interest); w = r(g * WH)
    return dict(period=n, due=due, gross_interest=g, withholding=w, net_interest=g - w, principal=principal, remaining=remaining)
def original(p, rate, first_due, io_years, annuities):
    """io_years interest-only periods, then `annuities` constant payments; yearly."""
    out, bal, pay = [], p, annuity(p, rate, annuities)
    for i in range(io_years + annuities):
        due = date(first_due.year + i, first_due.month, first_due.day); interest = bal * rate
        pr = D(0) if i < io_years else (bal if i == io_years + annuities - 1 else r(pay - r(interest)))
        bal = bal - pr; out.append(row(i + 1, due, interest, pr, bal))
    return out
def option_a(orig, rate, next_period, interest_date):
    """Next payment interest only; then the original annuity amount continues, one year longer (last period may be smaller)."""
    out = [dict(x) for x in orig if x["period"] < next_period]
    prev = next((x for x in orig if x["period"] == next_period - 1), None)
    bal = prev["remaining"] if prev else orig[0]["remaining"] + orig[0]["principal"]
    out.append(row(next_period, interest_date, bal * rate, D(0), bal))
    pays = [x["principal"] + x["gross_interest"] for x in orig if x["principal"] > 0]
    pay = max(pays[0], bal * rate + C) if pays else bal * rate
    due_y = orig[next_period - 1]["due"].year; m, d = orig[0]["due"].month, orig[0]["due"].day; n = next_period; last = orig[-1]["due"].year + 1
    for y in range(due_y + 1, last + 1):
        n += 1; interest = r(bal * rate)
        pr = bal if y == last or pay - interest >= bal else pay - interest
        bal -= pr; out.append(row(n, date(y, m, d), interest, pr, bal))
        if bal <= 0: break
    return out
def sql_rows(inv_sql, scen, rows):
    return ",\n".join(f"({inv_sql},'{scen}',{x['period']},'{x['due']}',{x['gross_interest']},{x['withholding']},{x['net_interest']},{x['principal']},{x['remaining']})" for x in rows)
if __name__ == "__main__":
    rate = D("0.09"); o = original(D(5000), rate, date(2025, 11, 14), 1, 4); a = option_a(o, rate, 2, date(2027, 2, 14))
    assert sum(x["principal"] for x in o) == 5000 and o[-1]["remaining"] == 0
    assert sum(x["principal"] for x in a) == 5000 and a[-1]["remaining"] == 0 and a[-1]["due"].year == 2030
    r6 = D("0.0575"); w = original(D(2500), r6, date(2025, 11, 14), 0, 6); wa = option_a(w, r6, 2, date(2027, 2, 14))
    assert sum(x["principal"] for x in w) == 2500 and sum(x["principal"] for x in wa) == 2500 and wa[-1]["due"].year == 2031
    for x in a: print(x["period"], x["due"], x["gross_interest"], x["principal"], x["remaining"])
    print("SQL\n" + sql_rows("(select id from i)", "original", o) + ",\n" + sql_rows("(select id from i)", "A", a))
