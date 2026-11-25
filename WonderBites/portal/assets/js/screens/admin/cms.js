/* Admin · CMS (owner: D3)
   Routes: admin-cms {tab:'all'|'pages'|'banners'|'faq'}, admin-cms-page {id?}, admin-cms-banner {id?}, admin-cms-faq {id?}
   API: GET /admin/cms?type&status&q ; CRUD /admin/cms/{pages|banners|faqs}[/{id}] ;
        POST /admin/cms/{type}/{id}/publish|unpublish|schedule ; POST /uploads/presign (banner image) */
(function () {
  const { lt, ltx, esc } = D3;
  const TABS = [{ id: 'all', label: 'All' }, { id: 'pages', label: 'Pages' }, { id: 'banners', label: 'Banners' }, { id: 'faq', label: 'FAQ' }];
  const TYPE_ROUTE = { page: 'admin-cms-page', banner: 'admin-cms-banner', faq: 'admin-cms-faq' };
  const TYPE_PATH = { page: 'pages', banner: 'banners', faq: 'faqs' };
  const typeChip = (r) => r.subtype === 'legal' ? UI.chip(t('Legal'), { tone: 'mauve' }) : r.type === 'banner' ? UI.chip(t('Banner'), { tone: 'rose' }) : r.type === 'faq' ? UI.chip(t('FAQ'), { tone: 'lime' }) : UI.chip(t('Page'), { tone: 'orange' });
  const AUDIENCES = [{ value: 'all', label: 'All Users' }, { value: 'consumers', label: 'Consumers' }, { value: 'merchants', label: 'Merchants' }, { value: 'star_users', label: 'Star Users' }, { value: 'premium_users', label: 'Premium Users' }, { value: 'city', label: 'Specific cities' }];
  const audLabel = (v) => t((AUDIENCES.find((a) => a.value === v) || { label: 'All Users' }).label);
  const PLACEMENTS = [{ value: 'home_hero', label: 'Home — hero' }, { value: 'home_carousel', label: 'Home — carousel' }, { value: 'profile', label: 'Profile screen' }, { value: 'checkout', label: 'Checkout' }];
  const LINKS = [{ value: 'none', label: 'No link' }, { value: 'm-overview', label: 'Home' }, { value: 'm-templates', label: 'Templates' }, { value: 'impact', label: 'Sustainability Impact Page' }, { value: 'how-it-works', label: 'How WonderBites Works' }];
  /* (v1.3) banner target cities = cities of the enabled markets (registry) */
  const CITIES = () => Markets.cityOptions(null, true).map((c) => ({ value: c.value, label: c.label }));
  const FAQ_CATS = [{ value: 'pickups', label: 'Pickups' }, { value: 'payments', label: 'Payments & refunds' }, { value: 'account', label: 'Account' }, { value: 'merchants', label: 'For merchants' }];

  /* banner art: brand-safe CSS placeholder (no remote images) */
  const ART = { 'placeholder:banner-1': ['#C65C75', '#F2B04A', 'bag'], 'placeholder:banner-2': ['#5A1F45', '#C65C75', 'basket'], 'placeholder:banner-3': ['#8E2E5C', '#F6B6C3', 'star'], 'placeholder:banner-4': ['#0C432E', '#B7EF76', 'store'], 'placeholder:banner-5': ['#3A2343', '#E87C40', 'leaf'] };
  const bannerArt = (r, big) => {
    if (r.imageUrl && /^(blob:|data:)/.test(r.imageUrl)) return `<div class="d3-bart ${big ? 'big' : ''}" style="background-image:url('${r.imageUrl}')" role="img" aria-label="${esc(lt(r.title))}"></div>`;
    const [a, b, ic] = ART[r.imageUrl] || ['#3A2343', '#C65C75', 'bag'];
    return `<div class="d3-bart ${big ? 'big' : ''}" style="background:radial-gradient(120% 140% at 85% 10%, ${b} 0%, transparent 55%),linear-gradient(135deg, ${a}, #1A0F1E)" role="img" aria-label="${esc(lt(r.title))}">
      <span class="d3-bart-ic">${UI.icon(ic)}</span><span class="d3-bart-t">${ltx(r.title)}</span>${r.subtitle ? `<span class="d3-bart-s">${ltx(r.subtitle)}</span>` : ''}</div>`;
  };

  function preview(r) {
    const body = r.type === 'banner' ? bannerArt(r, true) + `<p class="d3-muted" style="margin-top:12px">${t('Target')}: ${audLabel(r.audience)}${r.cities && r.cities.length ? ' · ' + r.cities.map((c) => esc(Markets.cityName(c))).join(App.state.lang === 'ar' ? '، ' : ', ') : ''}</p>`
      : r.type === 'faq' ? `<h3 class="h-serif">${ltx(r.question)}</h3><p>${ltx(r.answer)}</p>`
      : `<h2 class="h-serif" style="margin-bottom:10px">${ltx(r.title)}</h2><div class="d3-prose">${lt(r.body) || `<p class="d3-muted">${t('No content yet.')}</p>`}</div>`;
    D3.modal({ title: t('Preview'), size: 'lg', body: `<div class="d3-prev">${body}</div>`, actions: [{ label: 'Close', variant: 'secondary', close: true }, { label: 'Edit', variant: 'primary', run: (m) => { m.close(); App.go(TYPE_ROUTE[r.type], { id: r.id }); } }] });
  }
  async function del(r, after) {
    if (!(await D3.confirm({ title: t('Delete content?'), text: t('“{name}” will be removed from the platform.', { name: esc(lt(r.title)) }), confirm: t('Delete'), danger: true }))) return;
    await api('DELETE', `/admin/cms/${TYPE_PATH[r.type]}/${r.id}`); D3.toast(t('Content deleted'), { tone: 'success' }); after && after();
  }

  /* ================= admin-cms ================= */
  App.route('admin-cms', {
    nav: 'CMS', title: 'CMS', subtitle: 'Content management for the WonderBites platform.',
    render(el, ctx) {
      let tab = (ctx.params && ctx.params.tab) || 'all';
      el.innerHTML = `<div data-kpis>${UI.skeleton('kpis', 4)}</div>
        <div class="d3-head">${UI.tabs({ name: 'cmstab', label: 'Content types', active: tab, tabs: TABS.map((x) => ({ id: x.id, label: t(x.label) })) })}<div data-new></div></div>
        <div data-body></div>`;
      D3.async(el.querySelector('[data-kpis]'), () => api('GET', '/admin/cms', { pageSize: 1 }), (res) => {
        const s = res.meta.summary;
        return UI.kpis([
          { label: t('Published Pages'), icon: 'file', tone: 'lime', value: fmt.number(s.published), foot: t('Live on platform') },
          { label: t('Drafts'), icon: 'edit', tone: 'rose', value: fmt.number(s.drafts), foot: t('Awaiting review') },
          { label: t('Scheduled Updates'), icon: 'cal', tone: 'orange', value: fmt.number(s.scheduled), foot: s.nextScheduledAt ? t('Next: {when}', { when: D3.dateTime(s.nextScheduledAt) }) : t('Nothing scheduled') },
          { label: t('Last Published'), icon: 'checkc', tone: 'mauve', value: D3.agoFrom(s.lastPublishedAt), foot: t('Home banner update') },
        ], 4);
      }, { skeleton: 'kpis' });

      const newBtn = () => {
        const m = { pages: ['New Page', 'admin-cms-page'], banners: ['New Banner', 'admin-cms-banner'], faq: ['New FAQ', 'admin-cms-faq'] }[tab];
        el.querySelector('[data-new]').innerHTML = m ? UI.btn(m[0], { variant: 'primary', icon: 'plus', go: m[1], params: {} }) : UI.btn('Create content', { variant: 'primary', icon: 'plus', attrs: 'data-act="create" aria-haspopup="menu"' });
      };
      let table = null;
      const body = el.querySelector('[data-body]');
      function draw() {
        newBtn(); table = null;
        if (tab === 'banners') {
          D3.async(body, () => api('GET', '/admin/cms', { type: 'banner', pageSize: 50 }), (res) => res.data.length ? `<div class="grid g-4">${res.data.map((r) => `
            <article class="cd d3-bcard">${bannerArt(r)}
              <div class="d3-bcard-b"><div style="min-width:0"><b>${ltx(r.title)}</b><small class="d3-muted">${t('Target')}: ${audLabel(r.audience)}</small><div style="margin-top:6px">${UI.pill(r.status)}</div></div>
                <div class="d3-bcard-a">${UI.btn('Edit', { variant: 'icon', icon: 'edit', go: 'admin-cms-banner', params: { id: r.id }, attrs: `` })}${UI.btn('Delete', { variant: 'icon', icon: 'trash', attrs: `data-del="${r.id}"` })}</div></div>
            </article>`).join('')}</div>` : UI.empty({ icon: 'image', title: t('No banners yet'), text: t('Upload a banner to promote bags on the app home screen.'), action: UI.btn('New Banner', { variant: 'primary', icon: 'plus', go: 'admin-cms-banner', params: {} }) }), { skeleton: 'cards' });
          return;
        }
        body.innerHTML = D3.card({ flush: true, body: '<div data-table></div>' });
        table = UI.dataTable(body.querySelector('[data-table]'), {
          pageSize: 10, sort: '-updatedAt',
          columns: [
            { key: 'title', label: 'Content', sortable: true, render: (r) => `<b>${ltx(r.title)}</b>` },
            { key: 'type', label: 'Type', render: typeChip },
            { key: 'status', label: 'Status', render: (r) => UI.pill(r.status) },
            { key: 'author', label: 'Author', render: (r) => `<span class="prod" style="gap:8px">${UI.avatar(r.author.name, { size: 24 })}${esc(r.author.name)}</span>` },
            { key: 'updatedAt', label: 'Last Updated', sortable: true, render: (r) => `<span class="d3-muted">${r.status === 'scheduled' && r.publishAt ? t('Scheduled {when}', { when: D3.dateTime(r.publishAt) }) : D3.dateTime(r.updatedAt)}</span>` },
          ],
          fetch: (q) => api('GET', '/admin/cms', { ...q, type: tab === 'all' ? '' : tab === 'faq' ? 'faq' : 'page' }),
          rowActions: (r) => [
            { icon: 'edit', label: 'Edit', run: () => App.go(TYPE_ROUTE[r.type], { id: r.id }) },
            { icon: 'eye', label: 'Preview', run: () => preview(r) },
          ],
          rowClick: (r) => App.go(TYPE_ROUTE[r.type], { id: r.id }),
          empty: { icon: 'file', title: 'Nothing here yet', text: 'Create your first piece of content.' },
        });
      }
      draw();
      el.addEventListener('ui:tab', (e) => { if (e.detail.name === 'cmstab') { tab = e.detail.value; draw(); } });
      UI.on(el, 'click', '[data-del]', async (e, b) => { const { data } = await api('GET', `/admin/cms/banners/${b.dataset.del}`); del(data, draw); });
      UI.on(el, 'click', '[data-act="create"]', (e, b) => UI.menu(b, [
        { label: t('New Page'), icon: 'file', run: () => App.go('admin-cms-page', {}) },
        { label: t('New Banner'), icon: 'image', run: () => App.go('admin-cms-banner', {}) },
        { label: t('New FAQ'), icon: 'help', run: () => App.go('admin-cms-faq', {}) },
      ]));
    },
  });

  /* ================= shared editor scaffold ================= */
  function editor(el, ctx, type, cfg) {
    const id = ctx.params && ctx.params.id;
    el.innerHTML = UI.skeleton('form', 6);
    (id ? api('GET', `/admin/cms/${TYPE_PATH[type]}/${id}`) : Promise.resolve({ data: null })).then(({ data }) => {
      const r = data || cfg.blank();
      ctx.setTitle(id ? cfg.editTitle : cfg.newTitle, 'Content management for the WonderBites platform.');
      el.innerHTML = `
        <div><button type="button" class="d3-back" data-go="admin-cms" data-params='{"tab":"${type === 'banner' ? 'banners' : type === 'faq' ? 'faq' : 'pages'}"}'>${UI.icon('arrow-r', 'd3-backic')} ${t('Back to CMS')}</button></div>
        <form class="grid d3-tb" novalidate>
          <div class="d3-tb-main">${cfg.main(r)}</div>
          <aside class="d3-tb-side">
            ${D3.card({ title: t('Publishing'), icon: 'cal', body: `<div class="d3-fc">
              <div class="d3-row" style="padding-top:0"><div class="d3-row-l"><b>${t('Status')}</b></div><div data-status>${UI.pill(r.status || 'draft')}</div></div>
              ${UI.field({ type: 'date', name: 'pubDate', label: t('Schedule date'), value: (r.publishAt || '').slice(0, 10) })}
              ${UI.field({ type: 'time', name: 'pubTime', label: t('Schedule time'), value: (r.publishAt || '').slice(11, 16) || '09:00' })}
              ${r.author ? `<small class="d3-muted">${t('Last updated {when} by {who}', { when: D3.dateTime(r.updatedAt), who: esc(r.author.name) })}</small>` : ''}
            </div>` })}
            ${cfg.side ? cfg.side(r) : ''}
            <div class="cd d3-cpad d3-tb-act">
              ${UI.btn('Publish now', { variant: 'primary', icon: 'upload', attrs: 'data-act="publish"' })}
              ${UI.btn('Schedule', { variant: 'secondary', icon: 'clock', attrs: 'data-act="schedule"' })}
              ${UI.btn('Save draft', { variant: 'secondary', icon: 'check', attrs: 'data-act="draft"' })}
              <div class="d3-tb-more">${UI.btn('Preview', { variant: 'ghost', icon: 'eye', attrs: 'data-act="preview"' })}${id ? UI.btn('Delete', { variant: 'danger', icon: 'trash', attrs: 'data-act="del"' }) : UI.btn('Cancel', { variant: 'ghost', go: 'admin-cms' })}</div>
              ${id && r.status === 'published' ? UI.btn('Unpublish', { variant: 'ghost', icon: 'pause', attrs: 'data-act="unpublish"' }) : ''}
            </div>
          </aside>
        </form>`;
      const form = el.querySelector('form');
      D3.arDir(form);
      cfg.mount && cfg.mount(el, form, r);
      const collect = () => cfg.collect(UI.formValues(form), r);
      async function save(btn, mode) {
        D3.clearErr(form);
        const v = UI.validate(form); if (!v.ok) { D3.toast(t('Some fields need attention.'), { tone: 'error' }); return; }
        let body;
        try { body = await cfg.collectAsync ? await cfg.collectAsync(UI.formValues(form), r) : collect(); } catch (err) { D3.fail(err, form); return; }
        const fv = UI.formValues(form);
        let publishAt = null;
        if (mode === 'schedule') {
          if (!fv.pubDate) { D3.toast(t('Pick a date to schedule this content.'), { tone: 'error' }); form.querySelector('[name="pubDate"]').focus(); return; }
          publishAt = `${fv.pubDate}T${fv.pubTime || '09:00'}:00Z`;
          if (Date.parse(publishAt) < Date.now()) { D3.toast(t('The schedule time must be in the future.'), { tone: 'error' }); return; }
        }
        await D3.busy(btn, async () => {
          try {
            const path = `/admin/cms/${TYPE_PATH[type]}`;
            const saved = id ? (await api('PATCH', `${path}/${id}`, body)).data : (await api('POST', path, { ...body, status: 'draft' })).data;
            if (mode === 'publish') await api('POST', `${path}/${saved.id}/publish`);
            if (mode === 'schedule') await api('POST', `${path}/${saved.id}/schedule`, { publishAt });
            D3.toast(t(mode === 'publish' ? 'Published' : mode === 'schedule' ? 'Scheduled for {when}' : 'Draft saved', { when: publishAt ? D3.dateTime(publishAt) : '' }), { tone: 'success' });
            App.go('admin-cms', { tab: type === 'banner' ? 'banners' : type === 'faq' ? 'faq' : 'pages' });
          } catch (err) { D3.fail(err, form); }
        });
      }
      UI.on(el, 'click', '[data-act="publish"]', (e, b) => save(b, 'publish'));
      UI.on(el, 'click', '[data-act="schedule"]', (e, b) => save(b, 'schedule'));
      UI.on(el, 'click', '[data-act="draft"]', (e, b) => save(b, 'draft'));
      UI.on(el, 'click', '[data-act="unpublish"]', async (e, b) => { await D3.busy(b, () => api('POST', `/admin/cms/${TYPE_PATH[type]}/${id}/unpublish`)); D3.toast(t('Moved to drafts'), { tone: 'success' }); ctx.refresh(); });
      UI.on(el, 'click', '[data-act="preview"]', () => { try { preview({ ...r, ...collect(), type }); } catch (err) { D3.fail(err, form); } });
      UI.on(el, 'click', '[data-act="del"]', () => del({ ...r, type }, () => App.go('admin-cms', { tab: type === 'banner' ? 'banners' : type === 'faq' ? 'faq' : 'pages' })));
      form.addEventListener('submit', (e) => { e.preventDefault(); save(el.querySelector('[data-act="draft"]'), 'draft'); });
    }).catch((err) => {
      el.innerHTML = UI.errorState({ text: err && err.status === 404 ? t('This content no longer exists.') : t('We couldn’t load this content.'), retry: true });
      el.addEventListener('ui:retry', () => ctx.refresh(), { once: true });
    });
  }
  /* EN/AR content panes toggled by a segmented control */
  const panes = (name, en, ar) => `<div class="d3-langtabs"><span class="d3-faint" style="font-size:12px">${t('Content language')}</span>${D3.langSwitch(name, 'en')}</div><div class="d3-pane" data-pane="${name}:en">${en}</div><div class="d3-pane" data-pane="${name}:ar" dir="rtl" lang="ar" hidden>${ar}</div>`;
  const mountPanes = (el) => el.addEventListener('ui:seg', (e) => { el.querySelectorAll(`[data-pane^="${e.detail.name}:"]`).forEach((p) => { p.hidden = p.dataset.pane !== `${e.detail.name}:${e.detail.value}`; }); });

  /* ---------- page editor ---------- */
  App.route('admin-cms-page', {
    nav: 'CMS', title: 'Edit Page', subtitle: 'Content management for the WonderBites platform.',
    render: (el, ctx) => editor(el, ctx, 'page', {
      newTitle: 'New Page', editTitle: 'Edit Page',
      blank: () => ({ type: 'page', title: { en: '', ar: '' }, slug: '', body: { en: '', ar: '' }, status: 'draft' }),
      main: (r) => D3.card({ title: t('Page'), icon: 'file', body: `<div class="d3-fc">
          <div class="d3-fc c2">${UI.field({ type: 'text', name: 'title_en', label: t('Title (English)'), value: r.title.en, required: true, maxlength: 90 })}${UI.field({ type: 'text', name: 'title_ar', label: t('Title (Arabic)'), value: r.title.ar, maxlength: 90 })}</div>
          ${UI.field({ type: 'text', name: 'slug', label: t('URL slug'), value: r.slug, prefix: 'wonderbites.qa/', pattern: '[a-z0-9-]+', hint: t('Lowercase letters, numbers and dashes only.'), required: true })}
          ${panes('pagebody', UI.richText({ name: 'body_en', value: r.body.en, placeholder: t('Write the page content…') }), UI.richText({ name: 'body_ar', value: r.body.ar, placeholder: 'اكتب محتوى الصفحة…' }))}
        </div>` }),
      mount: (el, form) => { mountPanes(el); const ti = form.querySelector('[name="title_en"]'), sl = form.querySelector('[name="slug"]'); ti.addEventListener('input', () => { if (!sl.dataset.touched) sl.value = ti.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }); sl.addEventListener('input', () => { sl.dataset.touched = '1'; }); },
      collect: (v) => ({ title: { en: v.title_en.trim(), ar: (v.title_ar || v.title_en).trim() }, slug: v.slug, body: { en: v.body_en || '', ar: v.body_ar || '' } }),
    }),
  });

  /* ---------- banner editor ---------- */
  App.route('admin-cms-banner', {
    nav: 'CMS', title: 'Edit Banner', subtitle: 'Content management for the WonderBites platform.',
    render: (el, ctx) => {
      let pendingFile = null;
      editor(el, ctx, 'banner', {
        newTitle: 'New Banner', editTitle: 'Edit Banner',
        blank: () => ({ type: 'banner', title: { en: '', ar: '' }, subtitle: { en: '', ar: '' }, imageUrl: '', link: { route: 'none' }, audience: 'all', cities: [], placement: 'home_carousel', startsAt: '', endsAt: '', status: 'draft' }),
        main: (r) => `${D3.card({ title: t('Banner'), icon: 'image', body: `<div class="d3-fc">
            <div class="d3-fc c2">${UI.field({ type: 'text', name: 'title_en', label: t('Title (English)'), value: r.title.en, required: true, maxlength: 40 })}${UI.field({ type: 'text', name: 'title_ar', label: t('Title (Arabic)'), value: r.title.ar, maxlength: 40 })}
            ${UI.field({ type: 'text', name: 'sub_en', label: t('Subtitle (English)'), value: (r.subtitle || {}).en, maxlength: 70 })}${UI.field({ type: 'text', name: 'sub_ar', label: t('Subtitle (Arabic)'), value: (r.subtitle || {}).ar, maxlength: 70 })}</div>
            ${UI.dropzone({ name: 'image', accept: 'image/png,image/jpeg,image/webp', multiple: false, hint: t('PNG, JPG or WebP · 1600×600 recommended · max 5 MB') })}
            ${UI.field({ type: 'select', name: 'link', label: t('Tap opens'), value: (r.link || {}).route || 'none', options: D3.opts(LINKS) })}
          </div>` })}
          ${D3.card({ title: t('Target audience'), icon: 'users', body: `<div class="d3-fc c2">
            ${UI.field({ type: 'select', name: 'audience', label: t('Audience'), value: r.audience, options: D3.opts(AUDIENCES), required: true })}
            ${UI.field({ type: 'select', name: 'placement', label: t('Placement'), value: r.placement, options: D3.opts(PLACEMENTS) })}
            <div data-cities ${r.audience === 'city' ? '' : 'hidden'} style="grid-column:1/-1">${UI.field({ type: 'multiselect', name: 'cities', label: t('Cities'), value: r.cities, options: CITIES() })}</div>
            ${UI.field({ type: 'date', name: 'startsAt', label: t('Show from'), value: (r.startsAt || '').slice(0, 10), required: true })}
            ${UI.field({ type: 'date', name: 'endsAt', label: t('Show until'), value: (r.endsAt || '').slice(0, 10), required: true })}
          </div>` })}`,
        side: (r) => D3.card({ title: t('Live preview'), icon: 'eye', body: `<div  data-bprev>${bannerArt(r)}</div>` }),
        mount: (el, form, r) => {
          const prev = el.querySelector('[data-bprev]');
          let img = r.imageUrl;
          const redraw = () => { const v = UI.formValues(form); prev.innerHTML = bannerArt({ ...r, imageUrl: img, title: { en: v.title_en, ar: v.title_ar || v.title_en }, subtitle: { en: v.sub_en, ar: v.sub_ar || v.sub_en } }); };
          form.addEventListener('input', redraw);
          form.addEventListener('change', (e) => {
            if (e.target.name === 'audience') el.querySelector('[data-cities]').hidden = e.target.value !== 'city';
            const f = e.target.files && e.target.files[0];
            if (f) { if (f.size > 5 * 1024 * 1024) { D3.toast(t('Images must be 5 MB or smaller.'), { tone: 'error' }); return; } pendingFile = f; img = URL.createObjectURL(f); }
            redraw();
          });
        },
        collectAsync: async (v, r) => {
          let imageUrl = r.imageUrl;
          if (pendingFile) {
            try { const { data } = await api('POST', '/uploads/presign', { fileName: pendingFile.name, contentType: pendingFile.type, size: pendingFile.size, purpose: 'banner' }); imageUrl = data.fileUrl || URL.createObjectURL(pendingFile); }
            catch (e) { imageUrl = URL.createObjectURL(pendingFile); }
          }
          if (!imageUrl) throw Object.assign(new Error('Upload a banner image.'), { details: { image: 'required' } });
          if (v.endsAt && v.startsAt && v.endsAt < v.startsAt) throw Object.assign(new Error('The end date must be after the start date.'), { details: { endsAt: 'range' } });
          return { title: { en: v.title_en.trim(), ar: (v.title_ar || v.title_en).trim() }, subtitle: { en: v.sub_en || '', ar: v.sub_ar || v.sub_en || '' }, imageUrl, link: { route: v.link }, audience: v.audience, cities: v.audience === 'city' ? (v.cities || []) : [], placement: v.placement, startsAt: `${v.startsAt}T00:00:00Z`, endsAt: `${v.endsAt}T23:59:00Z` };
        },
        collect: (v, r) => ({ title: { en: v.title_en, ar: v.title_ar || v.title_en }, subtitle: { en: v.sub_en, ar: v.sub_ar }, imageUrl: r.imageUrl, audience: v.audience, cities: v.cities || [] }),
      });
    },
  });

  /* ---------- FAQ editor ---------- */
  App.route('admin-cms-faq', {
    nav: 'CMS', title: 'Edit FAQ', subtitle: 'Content management for the WonderBites platform.',
    render: (el, ctx) => editor(el, ctx, 'faq', {
      newTitle: 'New FAQ', editTitle: 'Edit FAQ',
      blank: () => ({ type: 'faq', question: { en: '', ar: '' }, answer: { en: '', ar: '' }, category: 'pickups', audience: 'all', order: 1, status: 'draft' }),
      main: (r) => D3.card({ title: t('Question & answer'), icon: 'help', body: `<div class="d3-fc">
          ${panes('faqlang',
            `<div class="d3-fc">${UI.field({ type: 'text', name: 'q_en', label: t('Question (English)'), value: r.question.en, required: true, maxlength: 140 })}${UI.field({ type: 'textarea', name: 'a_en', label: t('Answer (English)'), value: r.answer.en, rows: 5, required: true })}</div>`,
            `<div class="d3-fc">${UI.field({ type: 'text', name: 'q_ar', label: t('Question (Arabic)'), value: r.question.ar, maxlength: 140 })}${UI.field({ type: 'textarea', name: 'a_ar', label: t('Answer (Arabic)'), value: r.answer.ar, rows: 5 })}</div>`)}
          <div class="d3-fc c2" style="grid-template-columns:1fr 1fr 120px">
            ${UI.field({ type: 'select', name: 'category', label: t('Category'), value: r.category, options: D3.opts(FAQ_CATS) })}
            ${UI.field({ type: 'select', name: 'audience', label: t('Audience'), value: r.audience, options: D3.opts(AUDIENCES.filter((a) => ['all', 'consumers', 'merchants'].includes(a.value))) })}
            ${UI.field({ type: 'number', name: 'order', label: t('Order'), value: r.order, min: 1, max: 99 })}
          </div></div>` }),
      mount: (el) => mountPanes(el),
      collect: (v) => ({ question: { en: v.q_en.trim(), ar: (v.q_ar || v.q_en).trim() }, answer: { en: v.a_en.trim(), ar: (v.a_ar || v.a_en).trim() }, title: { en: v.q_en.trim(), ar: (v.q_ar || v.q_en).trim() }, category: v.category, audience: v.audience, order: +v.order || 1 }),
    }),
  });

  UI.css('d3-cms', `
    .d3-bcard{overflow:hidden;display:flex;flex-direction:column}
    .d3-bart{position:relative;aspect-ratio:16/8;display:flex;flex-direction:column;justify-content:flex-end;gap:2px;padding:14px 16px;color:#fff;background-size:cover;background-position:center;border-radius:0}
    .d3-bart.big{aspect-ratio:16/6;border-radius:var(--r-card,16px)}
    .d3-tb-side .d3-bart{border-radius:12px}
    .d3-bart-ic{position:absolute;inset-block-start:12px;inset-inline-end:12px;width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.18);color:#fff}
    .d3-bart-t{font-family:var(--font-display);font-size:20px;font-weight:700;line-height:1.2;text-shadow:0 2px 10px rgba(0,0,0,.35)}
    .d3-bart.big .d3-bart-t{font-size:28px}
    .d3-bart-s{font-size:12.5px;opacity:.9}
    .d3-bcard-b{display:flex;justify-content:space-between;gap:10px;padding:14px 16px;align-items:flex-start}
    .d3-bcard-b b{display:block;font-weight:600} .d3-bcard-b small{display:block;font-size:12px}
    .d3-bcard-a{display:flex;gap:6px;flex:none}
    .d3-prev{display:grid;gap:8px}
    .d3-prose{line-height:1.7} .d3-prose h3{margin:14px 0 4px;font-size:15px} .d3-prose p{margin:0 0 8px}
  `);
})();
