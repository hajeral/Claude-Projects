/* Merchant · Templates (owner: D4) — route m-templates. Create from Template → m-create-product {templateId} */
(function () {
  'use strict';
  const { L, LE, money, opts, label, CATS } = Ops;

  function tplCard(tp) {
    const mine = tp.source === 'mine';
    return `<article class="cd ops-tpl" data-tpl="${UI.esc(tp.id)}">
      <span class="ic">${UI.icon(tp.icon === 'bag' ? 'bag' : 'package')}</span>
      <h3>${LE(tp.name)}</h3><div>${UI.chip(label(CATS, tp.category), { tone: 'rose' })}</div>
      <p>${LE(tp.description)}</p>
      <div class="ft"><span>${t('Used {n} times', { n: fmt.number(tp.usageCount) })}</span><span>${t('{price} suggested', { price: money(tp.suggestedPrice) })}</span></div>
      <div class="row">${UI.btn(mine ? t('Use Template') : t('Create from Template'), { variant: 'primary', go: 'm-create-product', params: { templateId: tp.id } })}
        ${mine ? UI.btn('', { variant: 'icon', icon: 'edit', attrs: `data-edit="${tp.id}" aria-label="${t('Edit template')}"` }) + UI.btn('', { variant: 'icon', icon: 'trash', attrs: `data-del="${tp.id}" aria-label="${t('Delete template')}"` }) : ''}</div></article>`;
  }

  function tplForm(tp, after) {
    const d = (tp && tp.defaults) || {};
    UI.modal({
      title: tp ? t('Edit template') : t('New template'), size: 'md',
      body: `<form data-tf class="ops-form" novalidate>
        ${UI.field({ name: 'name', label: t('Template name'), required: true, value: tp ? L(tp.name) : '', placeholder: t('e.g. Friday Pastry Box') })}
        <div class="ops-grid2">${UI.field({ type: 'select', name: 'category', label: t('Category'), required: true, value: tp ? tp.category : 'bakery', options: opts(CATS) })}
        ${UI.field({ type: 'money', name: 'suggestedPrice', label: t('Suggested price'), required: true, currency: tp ? tp.suggestedPrice.currency : undefined, value: tp ? tp.suggestedPrice.amount : 15, min: 1 })}</div>
        ${UI.field({ type: 'number', name: 'quantity', label: t('Default quantity'), value: d.quantity || 10, min: 1 })}
        ${UI.field({ type: 'textarea', name: 'description', label: t('Description'), rows: 3, value: tp ? L(tp.description) : '', maxlength: 300 })}</form>`,
      actions: [{ label: t('Cancel'), variant: 'secondary', close: true }, { label: tp ? t('Save changes') : t('Save template'), variant: 'primary', run: async (m) => {
        const r = UI.validate(m.el.querySelector('[data-tf]')); if (!r.ok) return;
        const body = { ...r.values, suggestedPrice: Number(r.values.suggestedPrice), quantity: Number(r.values.quantity) };
        tp ? await api('PATCH', '/merchant/templates/' + tp.id, body) : await api('POST', '/merchant/templates', body);
        m.close(); UI.toast(tp ? t('Template updated') : t('Template saved to My Templates'), { tone: 'success', html: true }); after && after();
      } }],
    });
  }

  function pickTemplate(list) {
    UI.modal({
      title: t('Create from Template'), size: 'sm',
      body: `<form data-pk class="ops-form" novalidate>${UI.field({ type: 'radio', name: 'tpl', label: t('Choose a template'), required: true, value: list[0] && list[0].id,
        options: list.map((x) => ({ value: x.id, label: `${L(x.name)} — ${t(x.source === 'mine' ? 'My Templates' : 'WonderBites Templates')}` })) })}</form>`,
      actions: [{ label: t('Cancel'), variant: 'secondary', close: true }, { label: t('Continue'), variant: 'primary', run: (m) => { const r = UI.validate(m.el.querySelector('[data-pk]')); if (!r.ok) return; m.close(); App.go('m-create-product', { templateId: r.values.tpl }); } }],
    });
  }

  App.route('m-templates', {
    nav: 'Templates', title: 'Templates', subtitle: 'Create new listings from reusable merchant templates.',
    render(el, ctx) {
      el.innerHTML = `
        <section class="cd ops-banner" style="display:flex;flex-direction:row;align-items:center;gap:18px;padding:22px 26px">
          <span class="wb-badge" aria-hidden="true">WB</span>
          <div style="flex:1;min-width:0"><h3 class="h-serif" style="margin:0;font-size:22px">${t('Create a new bag faster.')}</h3><p style="margin:4px 0 0;opacity:.92">${t('Templates pre-fill the bag name, category, pickup window, quantity and suggested price — you just adjust the details and publish. Save your own templates for bags you list often.')}</p></div>
          ${UI.btn(t('Create from Template'), { variant: 'secondary', icon: 'layers', attrs: 'data-act="pick" style="background:#FFFCF9;color:#A9466A;border-color:transparent"' })}</section>
        <div class="ops-head" style="align-items:baseline"><h2 class="h-serif" style="font-size:22px">${t('WonderBites Templates')}</h2><span class="muted" style="font-size:12.5px">${t('Ready-made templates for common bag types')}</span></div>
        <div data-wb></div>
        <div class="ops-head" style="align-items:baseline"><h2 class="h-serif" style="font-size:22px">${t('My Templates')}</h2><div class="ops-actions"><span class="muted" style="font-size:12.5px">${t('Your own saved templates')}</span>${UI.btn(t('New template'), { variant: 'secondary', size: 'sm', icon: 'plus', attrs: 'data-act="new"' })}</div></div>
        <div data-mine></div>`;
      let all = [];
      const grid = (list) => `<div class="grid g-3">${list.map(tplCard).join('')}</div>`;
      const loadWB = () => UI.async(el.querySelector('[data-wb]'), () => api('GET', '/merchant/templates', { source: 'wonderbites' }), (res) => { all = all.filter((x) => x.source !== 'wonderbites').concat(res.data); return res.data.length ? grid(res.data) : UI.empty({ icon: 'layers', title: t('No templates available'), text: t('WonderBites templates will appear here.') }); }, { skeleton: 'cards' });
      const loadMine = () => UI.async(el.querySelector('[data-mine]'), () => api('GET', '/merchant/templates', { source: 'mine' }), (res) => { all = all.filter((x) => x.source !== 'mine').concat(res.data); return res.data.length ? grid(res.data) : UI.empty({ icon: 'layers', title: t('No saved templates yet'), text: t('Tick “Save as template” when you create a product, or add one here.'), action: UI.btn(t('New template'), { variant: 'primary', icon: 'plus', attrs: 'data-act="new"' }) }); }, { skeleton: 'cards' });
      loadWB(); loadMine();
      UI.on(el, 'click', '[data-act="pick"]', () => pickTemplate(all.length ? all : []));
      UI.on(el, 'click', '[data-act="new"]', () => tplForm(null, loadMine));
      UI.on(el, 'click', '[data-edit]', (e, b) => tplForm(all.find((x) => x.id === b.dataset.edit), loadMine));
      UI.on(el, 'click', '[data-del]', async (e, b) => {
        const tp = all.find((x) => x.id === b.dataset.del);
        if (!(await UI.confirm({ html: true, title: t('Delete template?'), text: t('“{name}” will be removed from My Templates.', { name: LE(tp.name) }), confirm: t('Delete'), danger: true }))) return;
        await api('DELETE', '/merchant/templates/' + tp.id); UI.toast(t('Template deleted'), { tone: 'success', html: true }); loadMine();
      });
    },
  });

  UI.css('ops-templates', `
    .ops-banner{color:#fff;border:1px solid rgba(236,138,161,.35);background:linear-gradient(var(--g-ban,100deg),#A9466A 0%,#C65C75 38%,#5A1F45 80%,#3A2343 100%)}
    .ops-banner p{color:#FBEFF3}
    .wb-badge{width:48px;height:48px;border-radius:12px;background:#FFFCF9;color:#B34F73;font-family:'Playfair Display',Georgia,serif;font-weight:600;font-size:19px;display:grid;place-items:center;flex:none;direction:ltr}
  `);
})();
