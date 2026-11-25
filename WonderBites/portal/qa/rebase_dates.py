"""One-off v1.4 migration (F-014): rebase every seeded date written against the old 2025-07-20 anchor onto the
single demo "today" (api.DEMO_TODAY = 2026-11-19, defined in api/mock/core.js). Full dates shift by +487 days,
'YYYY-MM' months by +16, Date.UTC(2024|2025, …) seeds by the same day offset. Files already on the 2026-11-19
anchor (merchant-ops, merchant-account) are not touched. Idempotent: files carrying the '(v1.4 dates)' marker are skipped."""
import re, datetime as dt
from pathlib import Path
JS = Path(__file__).resolve().parent.parent / 'assets' / 'js'
OLD, NEW = dt.date(2025, 7, 20), dt.date(2026, 11, 19)
DAYS = (NEW - OLD).days  # 487
FILES = ['api/mock/admin-ops.js', 'api/mock/admin-business.js', 'api/mock/platform.js', 'api/mock/core.js',
         'screens/merchant/overview.js', 'screens/admin/orders.js', 'screens/admin/merchants.js', 'screens/admin/issues.js', 'screens/admin/wallet.js', 'screens/admin/quality.js']
FULL = re.compile(r"(?<![\d-])(2024|2025)-(\d{2})-(\d{2})(?![\d])")
MON = re.compile(r"(?<![\d-])'(2024|2025)-(\d{2})'")
UTC = re.compile(r"Date\.UTC\((2024|2025), ")


def shift_full(m):
    d = dt.date(int(m.group(1)), int(m.group(2)), int(m.group(3))) + dt.timedelta(days=DAYS)
    return d.isoformat()


def shift_mon(m):
    y, mo = int(m.group(1)), int(m.group(2)) + 16
    y += (mo - 1) // 12; mo = (mo - 1) % 12 + 1
    return f"'{y}-{mo:02d}'"


for f in FILES:
    p = JS / f; s = p.read_text()
    if '(v1.4 dates)' in s:
        continue
    o = s
    s = FULL.sub(shift_full, s); s = MON.sub(shift_mon, s)
    s = UTC.sub(lambda m: f"Date.UTC({int(m.group(1)) + 1}, 4 + ", s)  # +1y +4 months ≈ +487 days for generated join dates
    if s != o:
        s = '/* (v1.4 dates) seeded dates rebased onto api.DEMO_TODAY = 2026-11-19 by qa/rebase_dates.py */\n' + s
        p.write_text(s); print('rebased', f)
