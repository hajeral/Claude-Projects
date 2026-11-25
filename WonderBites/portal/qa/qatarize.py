"""One-off v1.3 data migration: UAE sample data → Qatar (launch market).
Ordered replacements (longest first) on mocks, module dictionaries and screens. Idempotent enough to re-run.
Core i18n/ui are migrated by hand (registry-driven), so they are not in the file list."""
import re, glob, sys
from pathlib import Path
JS = Path(__file__).resolve().parent.parent / 'assets' / 'js'

PAIRS = [
    # EN places (specific → generic)
    ('Marina Walk, Tower 3, Dubai Marina', 'Marina Promenade, Tower 3, Lusail'), ('Dubai Marina Branch', 'Lusail Marina Branch'),
    ('Dubai Marina, Dubai', 'Lusail Marina, Lusail'), ('Dubai Marina', 'Lusail Marina'), ('Marina Walk, Dubai', 'Al Sadd St, Doha'),
    ('Marina Branch', 'Al Sadd Branch'), ('Al Wasl Road 214, Jumeirah 1', 'Al Corniche St 214, West Bay'),
    ('Al Wasl Road 42, Jumeirah 1, Dubai', 'Al Corniche St 42, West Bay, Doha'), ('Jumeirah Beach Road 88, Umm Suqeim', 'Porto Arabia 88, The Pearl'),
    ('Jumeirah Beach Rd, Dubai', 'Porto Arabia, The Pearl, Doha'), ('Al Wasl Rd, Dubai', 'Al Corniche St, Doha'), ('Al Wasl Branch, Dubai', 'West Bay Branch, Doha'),
    ('Al Wasl Branch', 'West Bay Branch'), ('Al Wasl Rd', 'Al Corniche St'), ('Al Wasl, Dubai', 'West Bay, Doha'), ('JLT Branch', 'Al Waab Branch'),
    ('Jumeirah Branch', 'The Pearl Branch'), ('Jumeirah 1, Dubai', 'West Bay, Doha'), ('Jumeirah 1', 'West Bay'), ('focaccia in Jumeirah', 'focaccia in The Pearl'),
    ('Business Bay Branch', 'Msheireb Branch'), ('branch in Business Bay', 'branch in Msheireb'), ('Bay Square 4, Dubai', 'Msheireb Downtown 4, Doha'),
    ('Business Bay', 'Msheireb'), ('Downtown Branch', 'Al Hilal Branch'), ('Al Barsha', 'Al Waab'), ('Dubai K 22841', '123456'),
    ('UAE data protection law', 'Qatar’s personal data protection law (Law No. 13 of 2016)'),
    ("'Emirates NBD', 'ADCB', 'Mashreq', 'QNB'", "'QNB', 'Commercial Bank', 'Doha Bank', 'QIB'"),
    ('Abu Dhabi', 'Al Rayyan'), ('Sharjah', 'Al Wakrah'), ('Ajman', 'Lusail'), ('Dubai', 'Doha'),
    ("'abu_dhabi'", "'al_rayyan'"), ("'sharjah'", "'al_wakrah'"), ("'ajman'", "'lusail'"), ("'dubai'", "'doha'"),
    ('abu_dhabi:', 'al_rayyan:'), ('sharjah:', 'al_wakrah:'), ('dubai:', 'doha:'),
    # AR places
    ('ممشى المارينا، البرج 3، دبي مارينا', 'ممشى المارينا، البرج 3، لوسيل'), ('فرع دبي مارينا', 'فرع مارينا لوسيل'), ('دبي مارينا، دبي', 'مارينا لوسيل، لوسيل'),
    ('دبي مارينا', 'مارينا لوسيل'), ('ممشى المارينا، دبي', 'شارع السد، الدوحة'), ('فرع المارينا', 'فرع السد'),
    ('شارع الوصل 214، جميرا 1', 'شارع الكورنيش 214، الخليج الغربي'), ('شارع الوصل 42، جميرا 1، دبي', 'شارع الكورنيش 42، الخليج الغربي، الدوحة'),
    ('شارع شاطئ جميرا 88، أم سقيم', 'بورتو أرابيا 88، اللؤلؤة'), ('شارع شاطئ جميرا، دبي', 'بورتو أرابيا، اللؤلؤة، الدوحة'), ('شارع الوصل، دبي', 'شارع الكورنيش، الدوحة'),
    ('فرع الوصل، دبي', 'فرع الخليج الغربي، الدوحة'), ('فرع الوصل', 'فرع الخليج الغربي'), ('شارع الوصل', 'شارع الكورنيش'), ('الوصل، دبي', 'الخليج الغربي، الدوحة'),
    ('فرع أبراج بحيرات جميرا', 'فرع الوعب'), ('فرع جميرا', 'فرع اللؤلؤة'), ('جميرا 1، دبي', 'الخليج الغربي، الدوحة'), ('جميرا 1', 'الخليج الغربي'),
    ('فوكاتشيا في جميرا', 'فوكاتشيا في اللؤلؤة'), ('فرع الخليج التجاري', 'فرع مشيرب'), ('باي سكوير 4، دبي', 'مشيرب قلب الدوحة 4، الدوحة'), ('الخليج التجاري', 'مشيرب'),
    ('فرع وسط المدينة', 'فرع الهلال'), ('البرشاء', 'الوعب'), ('مثال: دبي K 22841', 'مثال: 123456'), ('حماية البيانات في الإمارات', 'حماية البيانات الشخصية في قطر'),
    ('أبوظبي', 'الريان'), ('الشارقة', 'الوكرة'), ('عجمان', 'لوسيل'), ('دبي', 'الدوحة'),
    # money / contact
    ('درهمًا', 'ريالًا'), ('د.إ', 'ر.ق'), ('AED', 'QAR'),
    ('wonderbites.ae', 'wonderbites.qa'), ('figandbloom.ae', 'figandbloom.qa'), ('business.ae', 'business.qa'), ('merchant.ae', 'merchant.qa'),
    ('goldencrust.ae', 'goldencrust.qa'), ('greenleaf.ae', 'greenleaf.qa'), ('olivegrove.ae', 'olivegrove.qa'), ('spiceroute.ae', 'spiceroute.qa'), ('sunsetsushi.ae', 'sunsetsushi.qa'),
    ('AE07 0331 2345 6789 01', 'QA58 QNBA 0000 0000 0012 3456 78'), ('Asia/Dubai', 'Asia/Qatar'),
]
PHONE = re.compile(r'\+971((?:[ -]?\d){7,9})')


def phone(m):
    d = re.sub(r'\D', '', m.group(1))
    d = (d + '00000000')[:8] if len(d) < 8 else d[-8:]
    if d[0] not in '3567': d = '5' + d[1:]
    return '+974 ' + d[:4] + ' ' + d[4:]


def main():
    files = glob.glob(str(JS / 'api/mock/*.js')) + glob.glob(str(JS / 'i18n/*.js')) + glob.glob(str(JS / 'screens/**/*.js'), recursive=True) + [str(JS / 'core/app.js')]
    for f in files:
        s = Path(f).read_text(); o = s
        if '(v1.3)' in s:  # already migrated (and now holds the UAE/KSA market seeds) — never re-run on it
            continue
        for a, b in PAIRS: s = s.replace(a, b)
        s = PHONE.sub(phone, s)
        if s != o:
            Path(f).write_text(s); print('migrated', Path(f).relative_to(JS))


if __name__ == '__main__':
    main()
