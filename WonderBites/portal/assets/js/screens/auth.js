/* =====================================================================
   Public & shell screens — launcher, admin login, merchant login + sign-up,
   forgot / reset password, OTP (2FA), 404, notifications list   [LEAD]
   ===================================================================== */
(function () {
  'use strict';
  const esc = UI.esc, ic = UI.icon;
  const S = App.state;

  const tools = () => `<div class="auth-tools">${UI.segmented({ name: 'lang', label: 'Language', value: S.lang, options: [{ value: 'en', label: 'EN' }, { value: 'ar', label: 'العربية' }] })}${UI.segmented({ name: 'theme', label: 'Theme', value: S.theme, options: [{ value: 'dark', label: 'theme|Night', icon: 'moon' }, { value: 'light', label: 'theme|Day', icon: 'sun' }] })}</div>`;
  function wireTools(el) {
    el.addEventListener('ui:seg', (e) => { if (e.detail.name === 'lang') App.setLang(e.detail.value); if (e.detail.name === 'theme') App.setTheme(e.detail.value); });
  }
  function hero(portal) {
    return `<section class="auth-hero" aria-hidden="false"><div class="ey"><i></i>${esc(t(portal === 'admin' ? 'Platform operations' : 'Merchant portal'))}</div>
      <h1><span>${esc(t('Welcome to'))}</span><span class="wm" style="font-size:inherit;letter-spacing:0;text-transform:none;color:#F7F3EE;margin:0">WonderBites</span></h1>
      <div class="tagl">${esc(t('GOOD FINDS. CLOSE BY.'))}</div>
      ${portal === 'admin' ? `<div class="role">${esc(t('ADMIN'))}</div>` : ''}
      <div class="stats"><div><b>${fmt.compact(52400)}</b><small>${esc(t('meals rescued this month'))}</small></div><div><b><span class="num">24.1t</span></b><small>${esc(t('CO₂ avoided'))}</small></div><div><b>${fmt.number(1240)}</b><small>${esc(t('partner merchants'))}</small></div></div></section>`;
  }
  function frame(el, portal, panel) {
    el.innerHTML = `<div class="auth"><div class="dots"></div><span class="arch" style="width:520px;height:620px;inset-inline-start:-120px;bottom:-140px"></span><span class="arch" style="width:380px;height:460px;inset-inline-start:40px;bottom:-140px"></span>${tools()}${hero(portal)}<div class="auth-side"><div class="auth-panel">${panel}</div></div></div>`;
    wireTools(el);
  }
  const alertBox = '<div class="li hot" role="alert" data-err hidden style="align-items:center"><span class="ic t-rose">' + ic('alert') + '</span><span class="tx tt" data-errt></span></div>';
  const showErr = (form, msg) => { const b = form.querySelector('[data-err]'); b.hidden = !msg; form.querySelector('[data-errt]').textContent = msg || ''; };
  async function busy(btn, fn) {
    const old = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spin" aria-hidden="true"></span>${esc(t('Please wait…'))}`;
    try { return await fn(); } finally { if (btn.isConnected) { btn.disabled = false; btn.innerHTML = old; } }
  }

  /* ------------------------------ launcher ------------------------------ */
  App.route('launcher', {
    portal: 'public', title: 'Choose a portal',
    render(el) {
      const sA = S.sessions.admin, sM = S.sessions.merchant;
      el.innerHTML = `<div class="launch"><div class="dots" style="position:absolute;inset:0;background-image:radial-gradient(rgba(247,243,238,.06) 1px,transparent 1.4px);background-size:26px 26px"></div>${tools()}<div class="in">
        <span class="wm">WonderBites</span><div class="tagl">${esc(t('GOOD FINDS. CLOSE BY.'))}</div>
        <h2>${esc(t('Choose a portal to continue'))}</h2>
        <div class="opts">
          <a class="opt" href="#${sA ? 'admin-command-center' : 'admin-login'}" data-go="${sA ? 'admin-command-center' : 'admin-login'}"><span class="oi">${ic('shield')}</span><h3>${esc(t('Admin Portal'))}</h3><p>${esc(t('Platform oversight for WonderBites super admins.'))}</p>
            <ul><li>${ic('check')}${esc(t('Drops, pickups, orders and merchants'))}</li><li>${ic('check')}${esc(t('Financials, quality and sustainability'))}</li><li>${ic('check')}${esc(t('CMS, users and platform settings'))}</li></ul>
            <span class="go">${esc(t(sA ? 'Continue as {name}' : 'Sign in to Admin', { name: t(sA ? sA.user.name : '') }))}${ic('arrow-r', 'flip')}</span></a>
          <a class="opt m" href="#${sM ? 'm-overview' : 'm-login'}" data-go="${sM ? 'm-overview' : 'm-login'}"><span class="oi">${ic('store')}</span><h3>${esc(t('Merchant Portal'))}</h3><p>${esc(t('For bakeries, restaurants and groceries selling surprise bags.'))}</p>
            <ul><li>${ic('check')}${esc(t('Orders, pickups and drivers'))}</li><li>${ic('check')}${esc(t('Listings, inventory and templates'))}</li><li>${ic('check')}${esc(t('Sales analytics, reviews and branches'))}</li></ul>
            <span class="go">${esc(t(sM ? 'Continue as {name}' : 'Sign in to Merchant', { name: t(sM ? sM.user.name : '') }))}${ic('arrow-r', 'flip')}</span></a>
        </div>
        <div class="foot">${UI.btn('Create a merchant account', { variant: 'secondary', icon: 'plus', go: 'm-signup' })}</div>
        <nav class="start-here" aria-label="${esc(t('Start here'))}"><span>${esc(t('Start here'))}</span><a href="docs/screens.html">${ic('layers')}${esc(t('Screen inventory'))}</a><a href="docs/api.html">${ic('file')}${esc(t('API reference'))}</a><a href="docs/gallery.html">${ic('image')}${esc(t('Screenshot gallery'))}</a></nav></div></div>`;
      wireTools(el);
    },
  });

  /* ------------------------------ login (both portals) ------------------------------ */
  function loginScreen(portal) {
    return function (el, ctx) {
      const pp = (ctx && ctx.params) || {};
      const remembered = pp.email || App.store.get('wb.remember.' + portal, '');
      frame(el, portal, `<div class="pl">${esc(t(portal === 'admin' ? 'Admin access' : 'Merchant access'))}</div><h2>${esc(t('Sign In'))}</h2>
        ${portal === 'merchant' ? `<p class="su">${esc(t('Don’t have an account?'))} <a href="#m-signup" data-go="m-signup">${esc(t('Sign Up'))}</a></p>` : `<p class="su">${esc(t('Use your WonderBites admin credentials.'))}</p>`}
        <form novalidate>${alertBox}
          ${UI.field({ type: 'email', name: 'email', label: 'Email Address', required: true, icon: 'mail', placeholder: 'Enter email address', value: remembered, autocomplete: 'username' })}
          ${UI.field({ type: 'password', name: 'password', label: 'Password', required: true, icon: 'lock', placeholder: 'Enter password', autocomplete: 'current-password' })}
          <div class="rw"><label class="check"><input type="checkbox" name="remember" ${remembered ? 'checked' : ''}>${esc(t('Remember me'))}</label><a class="lnk2" href="#forgot-password" data-go="forgot-password" data-params='{"portal":"${portal}"}'>${esc(t('Forgot Password?'))}</a></div>
          <button class="btn primary go" type="submit">${esc(t('Sign In'))}${ic('arrow-r', 'flip')}</button>
          <div class="sec">${ic('lock')}${esc(t(portal === 'admin' ? 'Protected with two-step verification' : 'Secured with encrypted sign-in'))}</div>
          <p class="faint" style="font-size:11.5px;text-align:center" data-demo-note><span class="demo-badge sm">${esc(t('Demo data'))}</span> ${esc(t('Demo: any credentials'))}${portal === 'merchant' ? ' · ' + esc(t('new sign-ups need WonderBites approval first.')) : ''} <a class="lnk2" href="#launcher" data-go="launcher">${esc(t('Switch portal'))}</a></p>
        </form>`);
      const form = el.querySelector('form');
      if (pp.pending) showErr(form, t('Your merchant account is pending verification by WonderBites. You can sign in once it’s approved.'));
      if (!remembered) setTimeout(() => { const i = form.querySelector('[name=email]'); if (i) i.focus(); }, 0);
      form.addEventListener('submit', async (e) => {
        e.preventDefault(); showErr(form, '');
        const r = UI.validate(form); if (!r.ok) return;
        await busy(form.querySelector('[type=submit]'), async () => {
          try {
            const { data } = await api('POST', '/auth/login', { email: r.values.email, password: r.values.password, portal, remember: !!r.values.remember });
            if (r.values.remember) App.store.set('wb.remember.' + portal, r.values.email); else App.store.del('wb.remember.' + portal);
            if (data.requires2fa) return App.go('otp', { portal, challengeId: data.challengeId, destination: data.sentTo });
            App.login(portal, data.user, data.accessToken, data.refreshToken); UI.toast(t('Welcome back, {name}', { name: t(data.user.firstName || data.user.name) })); App.afterLogin(portal);
          } catch (x) { showErr(form, t(x.message)); }
        });
      });
    };
  }
  App.route('admin-login', { portal: 'public', portalHint: 'admin', title: 'Sign In', render: loginScreen('admin') });
  App.route('m-login', { portal: 'public', portalHint: 'merchant', title: 'Sign In', render: loginScreen('merchant') });

  /* ------------------------------ OTP / 2FA ------------------------------ */
  App.route('otp', {
    portal: 'public', title: 'Two-step verification',
    render(el, ctx) {
      const p = ctx.params || {}; const portal = p.portal || 'admin';
      if (!p.challengeId) return App.go(portal === 'admin' ? 'admin-login' : 'm-login');
      frame(el, portal, `<div class="pl">${esc(t('Two-step verification'))}</div><h2>${esc(t('Enter verification code'))}</h2><p class="su">${t('We sent a 6-digit code to {dest}.', { dest: `<b class="num">${esc(p.destination || '')}</b>` })}</p>
        <form novalidate>${alertBox}<fieldset style="border:0"><legend class="sr-only">${esc(t('Verification code'))}</legend><div class="otp">${Array.from({ length: 6 }, (_, i) => `<input inputmode="numeric" maxlength="1" autocomplete="${i ? 'off' : 'one-time-code'}" aria-label="${esc(t('Digit {n}', { n: i + 1 }))}" data-d="${i}">`).join('')}</div></fieldset>
          ${p.signup ? '' : `<label class="check"><input type="checkbox" name="trust">${esc(t('Trust this device for 30 days'))}</label>`}
          <button class="btn primary go" type="submit">${esc(t('Verify & continue'))}</button>
          <div class="rw"><a class="lnk2" href="#${portal === 'admin' ? 'admin-login' : 'm-login'}" data-go="${portal === 'admin' ? 'admin-login' : 'm-login'}">${ic('arrow-l', 'flip')} ${esc(t('Back to sign in'))}</a><button type="button" class="btn link" data-resend disabled>${esc(t('Resend code'))} <span class="num" data-cd>30</span></button></div>
          <p class="faint" style="font-size:11.5px;text-align:center">${esc(t('Demo code: any 6 digits (000000 fails).'))}</p></form>`);
      const form = el.querySelector('form'); const ins = [...form.querySelectorAll('[data-d]')];
      setTimeout(() => ins[0].focus(), 0);
      ins.forEach((inp, i) => {
        inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(-1); if (inp.value && ins[i + 1]) ins[i + 1].focus(); if (ins.every((x) => x.value)) form.requestSubmit(); });
        inp.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !inp.value && ins[i - 1]) ins[i - 1].focus(); });
        inp.addEventListener('paste', (e) => { const v = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (!v) return; e.preventDefault(); v.split('').forEach((c, k) => (ins[k].value = c)); (ins[v.length] || ins[5]).focus(); if (v.length === 6) form.requestSubmit(); });
      });
      let cd = 30; const cdEl = form.querySelector('[data-cd]'); const rs = form.querySelector('[data-resend]');
      const timer = setInterval(() => { cd--; cdEl.textContent = cd > 0 ? cd : ''; if (cd <= 0) { rs.disabled = false; clearInterval(timer); } }, 1000);
      ctx.onCleanup(() => clearInterval(timer));
      rs.addEventListener('click', async () => { const { data } = await api('POST', '/auth/otp/resend', { challengeId: p.challengeId }); UI.toast('A new code has been sent', { tone: 'info' }); rs.disabled = true; cd = data.retryAfter || 30; cdEl.textContent = cd; const tm2 = setInterval(() => { cd--; cdEl.textContent = cd > 0 ? cd : ''; if (cd <= 0) { rs.disabled = false; clearInterval(tm2); } }, 1000); ctx.onCleanup(() => clearInterval(tm2)); });
      form.addEventListener('submit', async (e) => {
        e.preventDefault(); showErr(form, '');
        const code = ins.map((x) => x.value).join('');
        if (code.length < 6) { showErr(form, t('Enter the 6-digit code.')); return; }
        await busy(form.querySelector('[type=submit]'), async () => {
          try {
            const { data } = await api('POST', '/auth/otp/verify', { challengeId: p.challengeId, code, trustDevice: !!(form.querySelector('[name=trust]') || {}).checked });
            /* (v1.4 FLOW-01) a sign-up only verifies the email; WonderBites approves the merchant before the first sign-in */
            if (data.status === 'pending_verification') { UI.toast(t('Email verified. Your merchant account is pending verification — we’ll email you once WonderBites approves it.'), { tone: 'info' }); App.go('m-login', { pending: 1, email: data.email }); return; }
            App.login(portal, data.user, data.accessToken, data.refreshToken);
            if (p.signup) { UI.toast('Account created. Verification is pending — you can set up your store now.'); App.go('m-overview'); }
            else { UI.toast(t('Welcome back, {name}', { name: t(data.user.firstName || data.user.name) })); App.afterLogin(portal); }
          }
          catch (x) { showErr(form, t(x.message)); ins.forEach((i) => (i.value = '')); ins[0].focus(); }
        });
      });
    },
  });

  /* ------------------------------ merchant sign-up ------------------------------ */
  App.route('m-signup', {
    portal: 'public', portalHint: 'merchant', title: 'Sign Up',
    render(el) {
      const mk0 = Markets.primary();
      const cityField = (code) => UI.field({ type: 'select', name: 'city', label: 'City', required: true, placeholder: 'Select', options: Markets.cityOptions(code) });
      frame(el, 'merchant', `<div class="pl">${esc(t('Join WonderBites'))}</div><h2>${esc(t('Create your merchant account'))}</h2><p class="su">${esc(t('Already have an account?'))} <a href="#m-login" data-go="m-login">${esc(t('Sign In'))}</a></p>
        <form novalidate class="form-grid" style="gap:14px">${alertBox.replace('class="li hot"', 'class="li hot full"')}
          ${UI.field({ name: 'businessName', label: 'Business name', required: true, icon: 'store', placeholder: 'e.g. Fig & Bloom Bakery', full: true })}
          ${UI.field({ name: 'ownerFirstName', label: 'Owner first name', required: true, icon: 'user', placeholder: 'First name', autocomplete: 'given-name' })}
          ${UI.field({ name: 'ownerLastName', label: 'Owner last name', required: true, placeholder: 'Last name', autocomplete: 'family-name' })}
          ${UI.field({ type: 'email', name: 'email', label: 'Email Address', required: true, icon: 'mail', placeholder: 'Enter email address', full: true, autocomplete: 'email' })}
          ${/* (v1.3) only enabled markets; city list, phone code and currency follow the chosen country */ ''}
          ${UI.field({ type: 'select', name: 'country', label: 'Country', required: true, value: mk0.code, options: Markets.options(true) })}
          <div data-cityf>${cityField(mk0.code)}</div>
          ${UI.phone({ name: 'phone', codeName: 'phoneCode', label: 'Phone number', required: true, icon: 'phone', market: mk0.code, full: true })}
          ${UI.field({ type: 'select', name: 'category', label: 'Business category', required: true, placeholder: 'Select', full: true, options: [['bakery', 'Bakery'], ['restaurant', 'Restaurant'], ['grocery', 'Grocery'], ['cafe', 'Café'], ['desserts', 'Desserts']].map(([v, l]) => ({ value: v, label: l })) })}
          ${UI.field({ name: 'tradeLicenseNo', label: 'Trade license number', placeholder: 'Optional', full: true, hint: 'You can add it later from Settings → Store info.' })}
          ${UI.field({ type: 'password', name: 'password', label: 'Password', required: true, minlength: 8, icon: 'lock', placeholder: 'At least 8 characters', autocomplete: 'new-password' })}
          ${UI.field({ type: 'password', name: 'confirm', label: 'Confirm password', required: true, match: 'password', icon: 'lock', placeholder: 'Repeat password', autocomplete: 'new-password' })}
          <div class="fld full"><label class="check"><input type="checkbox" name="acceptTerms" required>${t('I agree to the {terms} and {privacy}.', { terms: `<a class="lnk2" href="#" data-legal="terms">${esc(t('Terms & Conditions'))}</a>`, privacy: `<a class="lnk2" href="#" data-legal="privacy">${esc(t('Privacy Policy'))}</a>` })}</label><span class="err"></span></div>
          <button class="btn primary go full" type="submit">${esc(t('Create account'))}</button></form>`);
      const form = el.querySelector('form');
      form.querySelector('[name=country]').addEventListener('change', (e) => {
        const m = Markets.get(e.target.value); form.querySelector('[data-cityf]').innerHTML = cityField(m.code);
        const pc = form.querySelector('[name=phoneCode]'); pc.value = m.phoneCode; pc.dispatchEvent(new Event('change', { bubbles: true }));
      });
      UI.on(form, 'click', '[data-legal]', (e, a) => { e.preventDefault(); UI.modal({ title: a.dataset.legal === 'terms' ? 'Terms & Conditions' : 'Privacy Policy', size: 'lg', body: `<p class="muted" style="line-height:1.8">${esc(t('WonderBites connects consumers with merchants selling surplus food at a discount. By creating an account you agree to list accurate information, honour pickup windows and follow food-safety regulations in your city. Personal data is processed according to Qatar’s personal data protection law (Law No. 13 of 2016) and used only to operate the marketplace.'))}</p>`, actions: [{ label: 'Close', variant: 'primary', close: true }] }); });
      form.addEventListener('submit', async (e) => {
        e.preventDefault(); showErr(form, '');
        const r = UI.validate(form); if (!r.ok) return;
        await busy(form.querySelector('[type=submit]'), async () => {
          const cc = r.values.phoneCode || Markets.get(r.values.country).phoneCode;
          const body = { businessName: { en: r.values.businessName, ar: r.values.businessName }, ownerFirstName: r.values.ownerFirstName, ownerLastName: r.values.ownerLastName, email: r.values.email, phone: { countryCode: cc, number: r.values.phone }, password: r.values.password, country: r.values.country, city: r.values.city, category: r.values.category, tradeLicenseNo: r.values.tradeLicenseNo || undefined, acceptTerms: !!r.values.acceptTerms };
          try { const { data } = await api('POST', '/auth/merchant/signup', body); App.go('otp', { portal: 'merchant', challengeId: data.challengeId, destination: r.values.email, signup: true }); }
          catch (x) { showErr(form, t(x.message)); }
        });
      });
    },
  });

  /* ------------------------------ forgot / reset ------------------------------ */
  App.route('forgot-password', {
    portal: 'public', title: 'Forgot Password?',
    render(el, ctx) {
      const portal = (ctx.params && ctx.params.portal) || 'merchant';
      const back = portal === 'admin' ? 'admin-login' : 'm-login';
      frame(el, portal, `<div class="pl">${esc(t('Account recovery'))}</div><h2>${esc(t('Forgot Password?'))}</h2><p class="su">${esc(t('Enter your email and we’ll send you a link to reset your password.'))}</p>
        <form novalidate>${alertBox}${UI.field({ type: 'email', name: 'email', label: 'Email Address', required: true, icon: 'mail', placeholder: 'Enter email address', value: App.store.get('wb.remember.' + portal, '') })}
          <button class="btn primary go" type="submit">${esc(t('Send reset link'))}</button>
          <div class="rw"><a class="lnk2" href="#${back}" data-go="${back}">${ic('arrow-l', 'flip')} ${esc(t('Back to sign in'))}</a></div></form>`);
      const form = el.querySelector('form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault(); showErr(form, ''); const r = UI.validate(form); if (!r.ok) return;
        await busy(form.querySelector('[type=submit]'), async () => {
          try {
            await api('POST', '/auth/password/forgot', { portal, email: r.values.email });
            el.querySelector('.auth-panel').innerHTML = `<div class="pl">${esc(t('Account recovery'))}</div><h2>${esc(t('Check your email'))}</h2><p class="su">${t('We sent a reset link to {email}. The link expires in 30 minutes.', { email: `<b>${esc(r.values.email)}</b>` })}</p>
              <div style="display:grid;gap:12px;margin-block-start:22px">${UI.btn('Open reset link (demo)', { variant: 'primary', cls: 'go', go: 'reset-password', params: { portal, token: 'rst_' + Date.now().toString(36) } })}${UI.btn('Back to sign in', { variant: 'secondary', cls: 'go', go: back })}</div>`;
          } catch (x) { showErr(form, t(x.message)); }
        });
      });
    },
  });
  App.route('reset-password', {
    portal: 'public', title: 'Reset password',
    render(el, ctx) {
      const portal = (ctx.params && ctx.params.portal) || 'merchant'; const back = portal === 'admin' ? 'admin-login' : 'm-login';
      frame(el, portal, `<div class="pl">${esc(t('Account recovery'))}</div><h2>${esc(t('Set a new password'))}</h2><p class="su">${esc(t('Choose a strong password you haven’t used before.'))}</p>
        <form novalidate>${alertBox}${UI.field({ type: 'password', name: 'password', label: 'New password', required: true, minlength: 8, icon: 'lock', placeholder: 'At least 8 characters', hint: 'Use 8+ characters with a mix of letters, numbers and symbols.', autocomplete: 'new-password' })}
          ${UI.field({ type: 'password', name: 'confirm', label: 'Confirm password', required: true, match: 'password', icon: 'lock', placeholder: 'Repeat password', autocomplete: 'new-password' })}
          <button class="btn primary go" type="submit">${esc(t('Update password'))}</button><div class="rw"><a class="lnk2" href="#${back}" data-go="${back}">${ic('arrow-l', 'flip')} ${esc(t('Back to sign in'))}</a></div></form>`);
      const form = el.querySelector('form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault(); showErr(form, ''); const r = UI.validate(form); if (!r.ok) return;
        await busy(form.querySelector('[type=submit]'), async () => {
          try { await api('POST', '/auth/password/reset', { token: ctx.params.token, password: r.values.password, confirmPassword: r.values.confirm }); UI.toast('Password updated. Please sign in.'); App.go(back); }
          catch (x) { showErr(form, t(x.message)); }
        });
      });
    },
  });

  /* ------------------------------ 404 ------------------------------ */
  App.route('not-found', {
    portal: 'public', title: 'Page not found',
    render(el) {
      const home = S.sessions.admin ? 'admin-command-center' : S.sessions.merchant ? 'm-overview' : 'launcher';
      el.innerHTML = `<div class="launch"><div class="in"><span class="wm">WonderBites</span><div class="ph-screen" style="min-height:auto;margin-block-start:30px"><div><div class="ill">${ic('search')}</div><h2 style="color:#F7F3EE">${esc(t('Page not found'))}</h2><p style="color:#CDBBC7">${esc(t('The page you’re looking for doesn’t exist or has moved.'))}</p><p class="num" style="color:#A8919F">${esc(location.hash || '#')}</p><div class="row" style="justify-content:center;margin-block-start:16px">${UI.btn('Go to home', { variant: 'primary', icon: 'grid', go: home })}${UI.btn('Choose a portal', { variant: 'secondary', icon: 'layers', go: 'launcher' })}</div></div></div></div></div>`;
    },
  });

  /* ------------------------------ notifications (full page, both portals) ------------------------------ */
  function notifPage(el, ctx) {
    const portal = S.portal; let tab = (ctx.params && ctx.params.tab) || 'all';
    el.innerHTML = UI.card({ title: 'All notifications', icon: 'bell', actions: UI.btn('Mark all as read', { variant: 'secondary', size: 'sm', icon: 'check', attrs: 'data-readall' }), flush: true,
      body: `<div style="padding:0 var(--pad)">${UI.tabs({ name: 'nt', tabs: [{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }, { id: 'downloads', label: 'Downloads' }], active: tab })}</div><div class="lst" style="padding-block:12px" data-list></div>` });
    const box = el.querySelector('[data-list]');
    const load = () => UI.async(box, () => api('GET', '/shared/notifications', { portal, tab, pageSize: 50 }), ({ data }) => data.map((n) => Overlays.itemHTML(n, 'li')).join(''), { skeleton: 'list', empty: { icon: 'bell', title: 'You’re all caught up', text: 'New alerts will appear here.' } });
    load();
    el.addEventListener('ui:tab', (e) => { tab = e.detail.value; load(); });
    UI.on(el, 'click', '[data-readall]', async () => { await api('POST', '/shared/notifications/read-all', { portal }); App.setUnread(0); UI.toast('All notifications marked as read'); load(); });
    UI.on(el, 'click', '[data-n]', async (e, b) => { const n = JSON.parse(b.dataset.n); await api('PATCH', '/shared/notifications/' + n.id, { read: true }).catch(() => {}); if (!n.read) App.setUnread(S.unread - 1); if (n.type === 'export') { Overlays.download(n); return load(); } Overlays.openLink(n.link); });
  }
  App.route('admin-notifications', { nav: '', title: 'Notifications', subtitle: 'Alerts, updates and your downloads.', render: notifPage });
  App.route('m-notifications', { nav: '', title: 'Notifications', subtitle: 'Alerts, updates and your downloads.', render: notifPage });
})();
