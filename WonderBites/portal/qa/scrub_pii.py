"""(v1.4) Demo-data hygiene: no realistic PII or banking data in the mocks, screens or API docs.

  python3 qa/scrub_pii.py          # rewrite in place (idempotent)
  python3 qa/scrub_pii.py --check  # exit 1 if anything realistic remains

Rules: personal / business emails → *@example.com (or <brand>.example.com); phone numbers → the 5550 test range;
IBANs → masked demo IBANs. Platform support addresses (support@wonderbites.qa …) stay, they are the product's own contacts.
"""
import re, sys
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
FILES = [*APP.glob('assets/js/api/mock/*.js'), APP / 'assets/js/core/app.js', *APP.glob('assets/js/screens/**/*.js'), *APP.glob('assets/js/i18n/*.js'),
         *APP.glob('docs/generator/*.py')]
BRANDS = 'figandbloom|olivegrove|sunsetsushi|spiceroute|greenleaf|goldencrust|business'
RULES = [
    (re.compile(r'@(gmail|mail|hotmail|yahoo)\.com\b'), '@example.com'),
    (re.compile(r'@merchant\.qa\b'), '@merchants.example.com'),
    (re.compile(r'@(' + BRANDS + r')\.qa\b'), r'@\1.example.com'),
    (re.compile(r'@wonderbites\.(com|app)\b'), '@wonderbites.example.com'),        # staff mailboxes (support@wonderbites.qa etc. are kept)
    # literal phone numbers → 5550 range (keep the last 4 digits so rows stay distinct)
    (re.compile(r'\+974 (?!5550|5000 0000)\d{4} (\d{4})'), r'+974 5550 \1'),
    (re.compile(r"\+974 \$\{5500 \+ i \* 11\} "), '+974 5550 '),
    (re.compile(r"`\+974 \$\{3311 \+ i \* 7\} \$\{2233 \+ i \* 11\}`"), '`+974 5550 ${2233 + i * 11}`'),
    (re.compile(r"`\+971 55 \$\{111 \+ i \* 7\} \$\{2233 \+ i \* 11\}`"), '`+971 55 550 ${2233 + i * 11}`'),
    (re.compile(r"`\+971 50 \$\{300 \+ i \* 11\} \$\{4100 \+ i \* 7\}`"), '`+971 55 550 ${4100 + i * 7}`'),
    (re.compile(r"'(5\d) (?!550)\d{3} (\d{4})'"), r"'5550 \2'"),                     # merchant customer mobiles ('50 111 2233')
    (re.compile(r"phone: '5523 8890'"), "phone: '5550 8890'"),
    (re.compile(r'\+97444000800'), '+97455500800'),
    # IBANs → masked demo IBANs
    (re.compile(r"iban: m\.country === 'AE' \? `AE07 0331 2345 6789 01\$\{10 \+ i\}` : `QA58 QNBA 0000 0000 0012 3456 78\$\{10 \+ i\}`"),
     "iban: m.country === 'AE' ? `AE00 •••• •••• •••• ••${10 + i} (demo)` : `QA00 •••• •••• •••• ••${10 + i} (demo)`"),
    (re.compile(r'QA58 QNBA 0000 0000 0012 3456 7823 456'), 'QA00 DEMO 0000 0000 0000 0000 0000 000'),
]
CHECK = [re.compile(p) for p in [r'@(gmail|mail|hotmail|yahoo)\.com\b', r'@(' + BRANDS + r'|merchant)\.qa\b', r'\+974 (?!5550|5000 0000)\d{4} \d{4}', r'QA58 QNBA', r'AE07 0331']]


def main():
    check = '--check' in sys.argv; bad = []; changed = 0
    for f in FILES:
        if f.name == 'scrub_pii.py' or not f.exists():
            continue
        s = f.read_text(); o = s
        if not check:
            for rx, rep in RULES:
                s = rx.sub(rep, s)
            if s != o:
                f.write_text(s); changed += 1
        for rx in CHECK:
            for m in rx.finditer(s):
                bad.append(f'{f.relative_to(APP)}: {m.group(0)}')
    print(f'scrub_pii: {changed} file(s) rewritten, {len(bad)} realistic value(s) left')
    for b in bad[:40]:
        print('  ', b)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
