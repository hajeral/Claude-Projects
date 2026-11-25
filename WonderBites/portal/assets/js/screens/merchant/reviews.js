/* Merchant · Reviews (owner: D3)
   Route: m-reviews
   API: GET /merchant/reviews?rating&sort&branchId (+meta.summary) ; POST /merchant/reviews/{id}/reply ;
        POST /merchant/reviews/{id}/report ; POST /merchant/reviews/feedback ("Write a Review" = review of WonderBites)
   Figma copy fix: placeholder "Employee Reviews / Sam.AI" text replaced by customer reviews of bags. */
(function () {
  const { lt, ltx, esc } = D3;
  const SORTS = [{ value: '-createdAt', label: 'Sort by newest review' }, { value: 'createdAt', label: 'Sort by oldest review' }, { value: '-rating', label: 'Highest rating first' }, { value: 'rating', label: 'Lowest rating first' }];
  const REASONS = [{ value: 'offensive', label: 'Offensive or abusive language' }, { value: 'not_customer', label: 'Not a real customer' }, { value: 'wrong_store', label: 'Review is about another store' }, { value: 'personal_info', label: 'Contains personal information' }, { value: 'other', label: 'Something else' }];

  App.route('m-reviews', {
    nav: 'Reviews', title: 'Reviews', subtitle: 'What customers are saying about you.',
    render(el, ctx) {
      const st = { sort: '-createdAt', rating: '', page: 1 };
      el.innerHTML = `
        <div class="d3-head">
          <div style="display:flex;gap:10px;align-items:flex-end">
            ${UI.field({ type: 'select', name: 'sort', label: t('Sort'), value: st.sort, options: D3.opts(SORTS) })}
            ${UI.field({ type: 'select', name: 'rating', label: t('Rating'), value: '', options: [{ value: '', label: t('All ratings') }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: t(n === 1 ? '1 star' : '{n} stars', { n: fmt.text.number(n) }) }))] })}
          </div>
        </div>
        <div data-summary>${UI.skeleton('cards', 1)}</div>
        <div data-list></div>`;
      const sumEl = el.querySelector('[data-summary]'), listEl = el.querySelector('[data-list]');

      function load() {
        D3.async(listEl, () => api('GET', '/merchant/reviews', { ...api.ctx(), sort: st.sort, rating: st.rating, page: st.page, pageSize: 10 }), (res) => {
          drawSummary(res.meta.summary);
          if (!res.data.length) return D3.card({ body: `<div >${UI.empty({ icon: 'star', title: t('No reviews match this filter'), text: t('Try another rating.') })}</div>` });
          return D3.card({ flush: true, body: `<ul class="d3-revs">${res.data.map(item).join('')}</ul>${res.meta.total > res.meta.pageSize ? `<div class="d3-cpad">${UI.pagination(res.meta)}</div>` : ''}` });
        }, { skeleton: 'list' });
      }
      function drawSummary(s) {
        sumEl.innerHTML = D3.card({ title: t('Customer Reviews'), icon: 'star', actions: UI.btn('Write a Review', { variant: 'primary', icon: 'plus', attrs: 'data-act="write"' }), body: `<div class="d3-rsum">
          <div class="d3-rsum-l"><b class="d3-rbig">${fmt.number(s.average)}</b>${D3.stars(s.average, 20)}<small class="d3-muted">${t('({n} Reviews)', { n: fmt.number(s.total) })}</small></div>
          <div class="d3-rsum-r">${Charts.histogram(s.distribution.map((d) => ({ label: t(d.stars === 1 ? '1 star' : '{n} stars', { n: d.stars }), value: d.count })), { max: Math.max(...s.distribution.map((d) => d.count)), color: 'orange' })}</div>
          <div class="d3-rsum-k"><div><b>${fmt.number(s.replied)}</b><small class="d3-muted">${t('Replied')}</small></div><div><b>${fmt.number(s.reported)}</b><small class="d3-muted">${t('Reported')}</small></div></div>
        </div>` });
      }
      const item = (r) => `<li class="d3-rev" data-id="${r.id}">
          <div class="d3-rev-top"><small class="d3-muted">${D3.date(r.createdAt)}</small>${r.status === 'reported' ? UI.pill('reported') : r.status === 'removed' ? UI.pill('removed', { label: 'Removed by WonderBites', tone: 'r', icon: 'ban' }) : r.moderation && r.moderation.outcome === 'kept' ? UI.pill('kept', { label: 'Report reviewed — kept', tone: 'n', icon: 'checkc' }) : ''}</div>
          ${D3.stars(r.rating)}
          <div class="prod" style="gap:10px;margin-top:8px">${UI.avatar(r.customer.name, { size: 34 })}<div><b>${esc(r.customer.name)}</b><small>${t('Reviewed')} ${esc(t(r.listing.title))}</small></div></div>
          <p class="d3-rev-body">${ltx(r.body)}</p>
          ${r.reply ? `<div class="d3-reply"><b>${t('Your reply')}</b> <small class="d3-muted">· ${D3.dateShort(r.reply.at)}</small><p>${ltx(r.reply.body)}</p></div>` : ''}
          <div class="d3-rev-act">
            ${r.reply ? '' : UI.btn('Reply', { variant: 'secondary', size: 'sm', icon: 'chat', attrs: `data-reply="${r.id}"` })}
            ${r.status === 'reported' ? `<small class="d3-muted">${t('Sent to WonderBites moderation')}</small>` : r.moderation && r.moderation.outcome ? `<small class="d3-muted" data-mod-outcome="${esc(r.moderation.outcome)}">${t(r.moderation.outcome === 'removed' ? 'WonderBites removed this review after your report.' : 'WonderBites reviewed your report and kept this review.')}</small>` : UI.btn('Report', { variant: 'ghost', size: 'sm', icon: 'flag', attrs: `data-report="${r.id}"` })}
          </div></li>`;
      load();

      el.addEventListener('change', (e) => { if (e.target.name === 'sort' || e.target.name === 'rating') { st[e.target.name] = e.target.value; st.page = 1; load(); } });
      el.addEventListener('ui:page', (e) => { st.page = e.detail.page || e.detail.value || 1; load(); });
      UI.on(el, 'click', '[data-page]', (e, b) => { st.page = +b.dataset.page; load(); });

      UI.on(el, 'click', '[data-reply]', (e, b) => {
        const id = b.dataset.reply;
        D3.modal({ title: t('Reply to review'), size: 'md',
          body: `<form novalidate class="d3-fc"><p class="d3-muted" style="margin:0;font-size:13px">${t('Replies are public and shown under the review in the app.')}</p>${UI.field({ type: 'textarea', name: 'body', label: t('Your reply'), rows: 5, required: true, minlength: 5, maxlength: 600, placeholder: t('Thank the customer and address any concern…') })}</form>`,
          actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Post reply', variant: 'primary', run: async (m) => {
            const f = m.el.querySelector('form'); const v = UI.validate(f); if (!v.ok) return;
            try { await api('POST', `/merchant/reviews/${id}/reply`, v.values); m.close(); D3.toast(t('Reply posted'), { tone: 'success' }); load(); } catch (err) { D3.fail(err, f); }
          } }] });
      });
      UI.on(el, 'click', '[data-report]', (e, b) => {
        const id = b.dataset.report;
        D3.modal({ title: t('Report review'), size: 'md',
          body: `<form novalidate class="d3-fc">${UI.field({ type: 'radio', name: 'reason', label: t('Why are you reporting this review?'), required: true, options: D3.opts(REASONS) })}${UI.field({ type: 'textarea', name: 'note', label: t('Details (optional)'), rows: 3, maxlength: 400 })}<p class="d3-muted" style="margin:0;font-size:12.5px">${t('WonderBites moderation checks reports within 2 business days. The review stays visible until then.')}</p></form>`,
          actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Send report', variant: 'danger', run: async (m) => {
            const f = m.el.querySelector('form'); const v = UI.validate(f); if (!v.ok) return;
            try { await api('POST', `/merchant/reviews/${id}/report`, v.values); m.close(); D3.toast(t('Report sent to moderation'), { tone: 'success' }); load(); } catch (err) { D3.fail(err, f); }
          } }] });
      });
      UI.on(el, 'click', '[data-act="write"]', () => {
        D3.modal({ title: t('Write a Review'), size: 'md',
          body: `<form novalidate class="d3-fc"><p class="d3-muted" style="margin:0;font-size:13px">${t('How is WonderBites working for your store? Your review goes to our partner team.')}</p>
            <fieldset class="d3-rate"><legend>${t('Your rating')}</legend>${[5, 4, 3, 2, 1].map((n) => `<input type="radio" id="rt${n}" name="rating" value="${n}" ${n === 5 ? 'checked' : ''} required><label for="rt${n}" aria-label="${t(n === 1 ? '1 star' : '{n} stars', { n })}">★</label>`).join('')}</fieldset>
            ${UI.field({ type: 'textarea', name: 'body', label: t('Your review'), rows: 4, required: true, minlength: 10, maxlength: 800 })}</form>`,
          actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Submit review', variant: 'primary', run: async (m) => {
            const f = m.el.querySelector('form'); const v = UI.validate(f); if (!v.ok) return;
            try { await api('POST', '/merchant/reviews/feedback', { ...v.values, rating: +v.values.rating }); m.close(); D3.toast(t('Thanks! Your review was sent to the WonderBites partner team.'), { tone: 'success' }); } catch (err) { D3.fail(err, f); }
          } }] });
      });
    },
  });

  UI.css('d3-reviews', `
    .d3-rsum{display:grid;grid-template-columns:200px minmax(0,1fr) 160px;gap:28px;align-items:center}
    .d3-rsum-l{display:grid;gap:6px}.d3-rbig{font-family:var(--font-num);font-size:44px;line-height:1}
    .d3-rsum-k{display:grid;gap:12px}.d3-rsum-k b{display:block;font-size:20px;font-family:var(--font-num)}
    .d3-revs{list-style:none;margin:0;padding:0}
    .d3-rev{padding:20px 24px;border-bottom:1px solid var(--line)} .d3-rev:last-child{border-bottom:0}
    .d3-rev-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
    .d3-rev .prod small{display:block;color:var(--muted);font-size:12px}
    .d3-rev-body{margin:10px 0 0;line-height:1.7;max-width:900px}
    .d3-reply{margin-top:12px;padding:12px 14px;border-radius:var(--r-ctl,11px);background:var(--tint-mauve);border-inline-start:3px solid var(--accent);max-width:900px}
    .d3-reply p{margin:4px 0 0}
    .d3-rev-act{display:flex;gap:8px;align-items:center;margin-top:12px}
    .d3-rate{border:0;padding:0;margin:0;display:flex;flex-direction:row-reverse;justify-content:flex-end;gap:4px}
    .d3-rate legend{font-weight:600;font-size:13px;margin-bottom:6px;width:100%}
    .d3-rate input{position:absolute;opacity:0}
    .d3-rate label{font-size:28px;color:var(--line-2);cursor:pointer;line-height:1}
    .d3-rate input:checked~label,.d3-rate label:hover,.d3-rate label:hover~label{color:#F0A43A}
    .d3-rate input:focus-visible+label{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
    [dir="rtl"] .d3-rate{flex-direction:row-reverse}
    @media (max-width:1200px){.d3-rsum{grid-template-columns:1fr}}
  `);
})();
