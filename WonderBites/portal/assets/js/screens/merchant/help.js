/* Merchant · Help (owner: D3)
   Route: m-help  (from sidebar "Need Help?")
   API: GET /merchant/help/faqs?q (+meta.contact) ; GET/POST /merchant/help/requests */
(function () {
  const { lt, ltx, esc } = D3;
  const CONTACT_ICON = { phone: 'phone', email: 'mail', whatsapp: 'chat' };

  App.route('m-help', {
    nav: 'Need Help?', title: 'Help', subtitle: 'Our merchant support team is here for you.',
    render(el, ctx) {
      const me = (App.state.user && App.state.user.name) || '';
      el.innerHTML = `
        <div class="d3-help">
          ${D3.card({ title: t('Contact support'), sub: t('Tell us what you need and we’ll call or message you back.'), icon: 'headset', body: `<form class="d3-form" novalidate data-form>
            <div class="d3-frow"><div class="d3-fl"><b>${t('Personal Info:')}</b><small>${t('Edit your information')}</small></div><div class="d3-fc">
              ${UI.field({ type: 'text', name: 'name', label: t('Name'), value: me, placeholder: t('Enter name'), required: true, maxlength: 80 })}
              <div class="d3-fc d3-phone">${UI.field({ type: 'select', name: 'phoneCountry', label: t('Code'), value: App.marketInfo().phoneCode, options: D3.PHONE_CODES, required: true })}${UI.field({ type: 'tel', name: 'phone', label: t('Mobile Number'), placeholder: '5550 4567', required: true, pattern: '[0-9 ]{7,15}' })}</div>
              ${UI.field({ type: 'select', name: 'topic', label: t('Topic'), value: 'orders', options: D3.opts([{ value: 'orders', label: 'Orders & pickups' }, { value: 'listings', label: 'Listings & inventory' }, { value: 'payouts', label: 'Payouts & billing' }, { value: 'account', label: 'Account & branches' }, { value: 'other', label: 'Something else' }]) })}
              ${UI.field({ type: 'textarea', name: 'description', label: t('Description'), placeholder: t('Describe the issue — include an order number if you have one'), rows: 4, required: true, maxlength: 1000 })}
            </div></div>
            <div class="d3-actions">${UI.btn('Send Request', { variant: 'primary', icon: 'send', type: 'submit' })}</div>
          </form>` })}
          <div class="d3-help-side">
            ${D3.card({ title: t('Contact options'), icon: 'phone', body: '<div  data-contact></div>' })}
            ${D3.card({ title: t('My requests'), icon: 'clipboard', body: '<div  data-reqs></div>' })}
          </div>
        </div>
        ${D3.card({ title: t('Frequently asked questions'), icon: 'help', actions: `<div class="d3-fsearch">${UI.field({ type: 'search', name: 'faqq', label: t('Search help'), placeholder: t('Search help articles') })}</div>`, body: '<div  data-faq></div>' })}`;

      const faqEl = el.querySelector('[data-faq]'), contactEl = el.querySelector('[data-contact]');
      const loadFaq = (q) => D3.async(faqEl, () => api('GET', '/merchant/help/faqs', { q }), (res) => {
        const c = res.meta && res.meta.contact;
        if (c && !contactEl.dataset.done) { contactEl.dataset.done = '1'; contactEl.innerHTML = `<ul class="d3-contact">${c.map((x) => `<li><span class="d3-cic">${UI.icon(CONTACT_ICON[x.key] || 'info')}</span><span><b>${ltx(x.label)}</b><a href="${esc(x.href || ((x.key === 'email' ? 'mailto:' : x.key === 'whatsapp' ? 'https://wa.me/' : 'tel:') + x.value.replace(/[^\d+@.a-z]/gi, '')))}" class="num" dir="ltr" data-contact="${esc(x.key)}">${esc(x.value)}</a><small class="d3-muted">${ltx(x.hours)}</small></span></li>`).join('')}</ul>`; }
        return res.data.length ? `<div class="d3-acc">${res.data.map((f, i) => `<details ${i === 0 && !q ? 'open' : ''}><summary>${ltx(f.question)}${UI.icon('chev')}</summary><p>${ltx(f.answer)}</p></details>`).join('')}</div>`
          : UI.empty({ icon: 'search', title: t('No articles match “{q}”', { q: esc(q) }), text: t('Try another word, or send us a request above.') });
      }, { skeleton: 'list' });
      loadFaq('');
      let deb; el.querySelector('[name="faqq"]').addEventListener('input', (e) => { clearTimeout(deb); deb = setTimeout(() => loadFaq(e.target.value.trim()), 250); });

      const loadReqs = () => D3.async(el.querySelector('[data-reqs]'), () => api('GET', '/merchant/help/requests'), (res) => res.data.length
        ? `<ul class="d3-reqs">${res.data.map((r) => `<li><div><b>${fmt.id(r.number)}</b><span>${ltx(r.subject)}</span><small class="d3-muted">${t('Opened {date}', { date: D3.dateShort(r.createdAt) })}</small>${r.lastReply ? `<small data-reply style="display:block;margin-block-start:4px">${UI.icon('chat')} <b>${t('WonderBites Support')}:</b> ${UI.esc(ltx(r.lastReply.body))}</small>` : ''}</div>${UI.pill(r.status)}</li>`).join('')}</ul>`
        : UI.empty({ icon: 'clipboard', title: t('No requests yet'), text: t('Requests you send appear here.') }), { skeleton: 'list' });
      loadReqs();

      const form = el.querySelector('[data-form]');
      form.addEventListener('submit', async (e) => {
        e.preventDefault(); D3.clearErr(form); const r = UI.validate(form); if (!r.ok) return;
        await D3.busy(form.querySelector('[type="submit"]'), async () => {
          try {
            const { data } = await api('POST', '/merchant/help/requests', r.values);
            D3.toast(t('Request {id} sent. We’ll reply within 24 hours.', { id: fmt.id(data.number) }), { tone: 'success' });
            form.querySelector('[name="description"]').value = ''; loadReqs();
          } catch (err) { D3.fail(err, form); }
        });
      });
    },
  });

  UI.css('d3-help', `
    .d3-help{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(300px,1fr);gap:var(--gap,24px);align-items:start}
    .d3-help-side{display:grid;gap:var(--gap,24px)}
    .d3-contact,.d3-reqs{list-style:none;margin:0;padding:0;display:grid;gap:12px}
    .d3-contact li{display:flex;gap:12px;align-items:flex-start}
    .d3-contact b,.d3-contact a,.d3-contact small{display:block} .d3-contact a{color:var(--accent);font-weight:600;text-decoration:none}
    .d3-cic{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:var(--tint-rose);color:var(--accent);flex:none}
    .d3-reqs li{display:flex;justify-content:space-between;gap:10px;align-items:center;padding-bottom:10px;border-bottom:1px solid var(--line)}
    .d3-reqs li:last-child{border-bottom:0;padding-bottom:0}
    .d3-reqs b,.d3-reqs span,.d3-reqs small{display:block}.d3-reqs span{font-size:13px}
    .d3-acc details{border-bottom:1px solid var(--line)} .d3-acc details:last-child{border-bottom:0}
    .d3-acc summary{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 0;font-weight:600;cursor:pointer;list-style:none}
    .d3-acc summary::-webkit-details-marker{display:none}
    .d3-acc details[open] summary svg{transform:rotate(180deg)}
    .d3-acc p{margin:0 0 14px;color:var(--muted);line-height:1.7}
    .d3-fsearch{min-width:260px}.d3-fsearch label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
    @media (max-width:1200px){.d3-help{grid-template-columns:1fr}}
  `);
})();
