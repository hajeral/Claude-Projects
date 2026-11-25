/* Arabic strings — v1.4 audit fixes (shared store, order state machine, pickup codes, commission, demo labels)   [LEAD] */
App.i18n.add({
  'Demo data': 'بيانات تجريبية', 'Customer code': 'رمز العميل', 'Customer’s pickup code': 'رمز استلام العميل',
  'Ask the customer for the 6-character code shown in their app. Verifying completes the order.': 'اطلب من العميل الرمز المكوّن من 6 أحرف الظاهر في تطبيقه. التحقق يُكمل الطلب.',
  'Verify code & complete': 'تحقق من الرمز وأكمل الطلب', 'Verify pickup code': 'التحقق من رمز الاستلام',
  'Pickup verified — order {id} completed': 'تم التحقق من الاستلام — اكتمل الطلب {id}',
  'That code doesn’t match this order. Check it with the customer.': 'هذا الرمز لا يطابق هذا الطلب. تحقق منه مع العميل.',
  'This pickup code was already used.': 'تم استخدام رمز الاستلام هذا من قبل.', 'This pickup code has expired.': 'انتهت صلاحية رمز الاستلام هذا.',
  'Active (paid, not collected)': 'نشط (مدفوع، لم يُستلم)', 'Confirmed': 'مؤكد', 'Driver Assigned': 'تم تعيين سائق', 'Refunded': 'مسترد', 'Partially Refunded': 'مسترد جزئيًا', 'No-show': 'عدم حضور',
  'Mark delivered': 'تحديد كتم التوصيل', 'Mark order delivered?': 'تحديد الطلب كتم توصيله؟', 'Order {id} updated': 'تم تحديث الطلب {id}',
});
App.i18n.add({
  'Quantity can’t be lower than the {n} bags already reserved or collected today.': 'لا يمكن أن تقل الكمية عن {n} أكياس محجوزة أو مستلمة اليوم.',
  'Bags already reserved or collected today can’t be removed.': 'لا يمكن إزالة الأكياس المحجوزة أو المستلمة اليوم.',
});
App.i18n.add({
  'Demo: any credentials': 'تجريبي: أي بيانات دخول', 'new sign-ups need WonderBites approval first.': 'الحسابات الجديدة تحتاج موافقة WonderBites أولًا.',
  'Email verified. Your merchant account is pending verification — we’ll email you once WonderBites approves it.': 'تم التحقق من البريد. حساب التاجر بانتظار التحقق — سنراسلك عند موافقة WonderBites عليه.',
  'Your merchant account is pending verification by WonderBites. You can sign in once it’s approved.': 'حساب التاجر بانتظار تحقق WonderBites. يمكنك تسجيل الدخول بعد الموافقة عليه.',
  'This merchant application was not approved. Contact WonderBites support for details.': 'لم تتم الموافقة على طلب التاجر هذا. تواصل مع دعم WonderBites لمعرفة التفاصيل.',
  'This merchant account is suspended. Contact WonderBites support.': 'حساب التاجر هذا موقوف. تواصل مع دعم WonderBites.',
  'Demo data — not real customers, payments or bank details': 'بيانات تجريبية — ليست عملاء أو مدفوعات أو بيانات بنكية حقيقية',
});
App.i18n.add({
  'Support contacts': 'جهات اتصال الدعم', 'Support email': 'بريد الدعم', 'Support phone': 'هاتف الدعم', 'Support hours': 'ساعات الدعم', 'WhatsApp': 'واتساب',
  'Commercial': 'الشروط التجارية', 'Default commission rate': 'نسبة العمولة الافتراضية', 'Rate (%)': 'النسبة (%)', 'Effective from': 'سارية من', 'Until': 'حتى', 'Rate': 'النسبة', 'Note': 'ملاحظة', 'Current': 'الحالية',
  'Applied to the gross value of every completed order unless a merchant contract sets its own rate. All payouts and revenue figures use it.': 'تُطبق على القيمة الإجمالية لكل طلب مكتمل ما لم يحدد عقد التاجر نسبة خاصة. تعتمد عليها جميع المدفوعات وأرقام الإيرادات.',
  'Schedule new rate': 'جدولة نسبة جديدة', 'Commission rate saved': 'تم حفظ نسبة العمولة', 'Merchant contracts with their own rate: {n}': 'عقود تجار بنسبة خاصة: {n}',
  'Launch pilot rate': 'نسبة الإطلاق التجريبية', 'Platform default': 'الافتراضي للمنصة',
  'New merchants can sign up themselves; WonderBites approves them before their first sign-in.': 'يمكن للتجار الجدد التسجيل بأنفسهم؛ وتوافق WonderBites عليهم قبل أول تسجيل دخول.',
  'WonderBites Support': 'دعم WonderBites',
});
App.i18n.add({
  'This merchant has a contract rate.': 'لدى هذا التاجر نسبة تعاقدية.', 'This merchant uses the platform default rate.': 'يستخدم هذا التاجر النسبة الافتراضية للمنصة.',
  'Contract commission rate': 'نسبة العمولة التعاقدية', 'Leave empty to use the platform default rate. Applied to orders from today.': 'اتركه فارغًا لاستخدام النسبة الافتراضية للمنصة. تُطبق على الطلبات من اليوم.',
  'contract': 'تعاقدية',
});
App.i18n.add({ 'Driver assigned': 'تم تعيين السائق', 'Out for delivery': 'في الطريق للتوصيل', 'Delivery failed': 'فشل التوصيل', 'pickup code verified': 'تم التحقق من رمز الاستلام', 'Delivered': 'تم التوصيل', 'Failed': 'فشل' });
App.i18n.add({
  'This pickup code has expired (window end + grace).': 'انتهت صلاحية رمز الاستلام (نهاية النافذة + مهلة).', 'That pickup code doesn’t match this order.': 'رمز الاستلام لا يطابق هذا الطلب.',
  'Enter the 6-character pickup code.': 'أدخل رمز الاستلام المكوّن من 6 أحرف.', 'This pickup was cancelled.': 'تم إلغاء هذا الاستلام.',
  'e.g. K3D8E7': 'مثال: K3D8E7',
  'Self-pickup orders are completed by verifying the customer’s pickup code.': 'تكتمل طلبات الاستلام الذاتي بالتحقق من رمز استلام العميل.',
  'Delivery orders are completed after the driver delivers them.': 'تكتمل طلبات التوصيل بعد أن يسلّمها السائق.',
  'WonderBites disabled this listing for review. Contact support to re-enable it.': 'عطّلت WonderBites هذه القائمة للمراجعة. تواصل مع الدعم لإعادة تفعيلها.',
});
App.i18n.add({
  'Reserved': 'محجوز', 'Collected today': 'المستلم اليوم', 'Disabled by WonderBites for review': 'عطّلته WonderBites للمراجعة', 'Contact support to re-enable it.': 'تواصل مع الدعم لإعادة تفعيله.',
  'Misleading photo': 'صورة مضللة', 'Allergen info missing': 'معلومات مسببات الحساسية مفقودة', 'Pricing issue': 'مشكلة في السعر', 'Food safety concern': 'مخاوف تتعلق بسلامة الغذاء', 'Under review': 'قيد المراجعة',
});
App.i18n.add({
  'Removed by WonderBites': 'أزالته WonderBites', 'Report reviewed — kept': 'تمت مراجعة البلاغ — أُبقي', 'WonderBites removed this review after your report.': 'أزالت WonderBites هذا التقييم بعد بلاغك.',
  'WonderBites reviewed your report and kept this review.': 'راجعت WonderBites بلاغك وأبقت هذا التقييم.',
});
/* shared-store seed (listing titles + customers shown on Overview / Analytics) */
App.i18n.add({
  'paid, not yet collected': 'مدفوع، لم يُستلم بعد', 'after commission': 'بعد العمولة', 'vs previous period': 'مقارنة بالفترة السابقة', 'previous 7 days': 'الأيام السبعة السابقة', 'previous 4 weeks': 'الأسابيع الأربعة السابقة',
  'Morning Pastry Box': 'صندوق معجنات الصباح', 'Artisan Bread Bag': 'كيس الخبز الحرفي', 'Sweet Treats Mix': 'تشكيلة الحلويات', 'Fresh Fig Grocery Box': 'صندوق بقالة التين الطازج', 'Bakery Leftover Bag': 'كيس بقايا المخبز', 'Deli Sandwich Surprise Bag': 'كيس مفاجأة سندويشات الديلي',
  'Aisha Al Mansoori': 'عائشة المنصوري', 'Omar Al Suwaidi': 'عمر السويدي', 'Fatima Al Zaabi': 'فاطمة الزعابي', 'Khalid Rahman': 'خالد رحمن', 'Layla Hassan': 'ليلى حسن', 'Yusuf Al Amiri': 'يوسف العامري', 'Mariam Al Nuaimi': 'مريم النعيمي', 'Hamdan Al Falasi': 'حمدان الفلاسي',
});
App.i18n.add({ 'Screenshot gallery': 'معرض لقطات الشاشة' });
App.i18n.add({ 'ABC234': 'ABC234' });
