/* Admin · Users & Access (owner: D3)
   Route: admin-users {role?}
   API: GET /admin/users?role&status&q (+meta.summary) ; GET /admin/roles ; POST /admin/users/invite ;
        PATCH /admin/users/{id} ; POST /admin/users/{id}/suspend|reactivate|resend-invite ; DELETE /admin/users/{id} */
(function () {
  const { lt, esc } = D3;
  const ROLE_TONE = { super_admin: 'rose', operations_admin: 'orange', support_agent: 'mauve', read_only: 'lime' };
  let ROLES = [];
  const roleLabel = (k) => { const r = ROLES.find((x) => x.role === k); return r ? lt(r.label) : k; };
  const roleOpts = () => ROLES.map((r) => ({ value: r.role, label: lt(r.label) }));

  function userForm(u) {
    return `<form class="d3-fc" novalidate>
      ${UI.field({ type: 'text', name: 'name', label: t('Full name'), value: u ? u.name : '', required: true, maxlength: 80, disabled: false })}
      ${UI.field({ type: 'email', name: 'email', label: t('Work email'), value: u ? u.email : '', required: true, placeholder: 'name@wonderbites.example.com', disabled: !!u })}
      <fieldset class="d3-roles"><legend>${t('Role')}</legend>
        ${ROLES.map((r) => `<label class="d3-rolepick"><input type="radio" name="role" value="${r.role}" ${(u ? u.role : 'support_agent') === r.role ? 'checked' : ''} required><span><b>${esc(lt(r.label))}</b><small class="d3-muted">${esc(lt(r.description))}</small></span></label>`).join('')}
      </fieldset>
      ${u ? '' : `<p class="d3-muted" style="font-size:12.5px;margin:0">${t('They’ll get an email invite valid for 7 days. Two-factor authentication is required at first sign-in.')}</p>`}
    </form>`;
  }

  App.route('admin-users', {
    nav: 'Users & Access', title: 'Users & Access', subtitle: 'Manage admin users, roles, and system access.',
    async render(el, ctx) {
      let role = (ctx.params && ctx.params.role) || 'all';
      el.innerHTML = `<div data-kpis>${UI.skeleton('kpis', 4)}</div><div data-roles>${UI.skeleton('kpis', 4)}</div>
        <div class="d3-head"><div data-tabs></div>${UI.btn('Invite User', { variant: 'primary', icon: 'plus', attrs: 'data-act="invite"' })}</div>
        ${D3.card({ flush: true, body: '<div data-table></div>' })}`;
      try { ROLES = (await api('GET', '/admin/roles')).data; } catch (e) { ROLES = []; }

      const drawTabs = () => { el.querySelector('[data-tabs]').innerHTML = UI.tabs({ name: 'role', label: 'Roles', active: role, tabs: [{ id: 'all', label: t('All') }, ...ROLES.map((r) => ({ id: r.role, label: lt(r.label) }))] }); };
      drawTabs();
      const drawRoles = () => { el.querySelector('[data-roles]').innerHTML = `<div class="grid g-4">${ROLES.map((r) => `
          <button type="button" class="cd d3-rolecard ${role === r.role ? 'on' : ''}" data-role="${r.role}" aria-pressed="${role === r.role}">
            <span class="h-serif">${esc(lt(r.label))}</span><b class="num">${fmt.number(r.usersCount)}</b><small class="d3-muted">${esc(lt(r.description))}</small></button>`).join('')}</div>`; };
      drawRoles();
      const loadKpis = () => D3.async(el.querySelector('[data-kpis]'), () => api('GET', '/admin/users', { pageSize: 1 }), (res) => {
        const s = res.meta.summary;
        return UI.kpis([
          { label: t('Total Admin Users'), icon: 'users', tone: 'rose', value: fmt.number(s.total), foot: t('Across {n} roles', { n: fmt.number(s.roles) }) },
          { label: t('Active Sessions'), icon: 'activity', tone: 'lime', value: fmt.number(s.activeSessions), foot: t('Right now') },
          { label: t('Pending Invites'), icon: 'mail', tone: 'orange', value: fmt.number(s.pendingInvites), foot: t('Sent this week') },
          { label: t('2FA Adoption'), icon: 'shield', tone: 'mauve', value: fmt.pct(s.twoFactorAdoption), foot: `<span class="d3-neg">${t(s.withoutTwoFa === 1 ? '1 user without 2FA' : '{n} users without 2FA', { n: fmt.number(s.withoutTwoFa) })}</span>` },
        ], 4);
      }, { skeleton: 'kpis' });
      loadKpis();

      const table = UI.dataTable(el.querySelector('[data-table]'), {
        pageSize: 10,
        columns: [
          { key: 'name', label: 'User', sortable: true, render: (r) => `<div class="prod">${UI.avatar(r.name, { size: 32 })}<div><b>${esc(r.name)}${r.status === 'invited' ? ` <span class="d3-faint">(${t('Invite')})</span>` : ''}</b><small>${esc(r.email)}</small></div></div>` },
          { key: 'role', label: 'Role', sortable: true, render: (r) => UI.chip(roleLabel(r.role), { tone: ROLE_TONE[r.role] }) },
          { key: 'status', label: 'Status', render: (r) => UI.pill(r.status) },
          { key: 'twoFactor', label: '2FA', render: (r) => r.twoFactor ? `<span class="d3-pos">${t('Enabled')}</span>` : `<span class="d3-neg">${t('Disabled')}</span>` },
          { key: 'lastActiveAt', label: 'Last Login', sortable: true, render: (r) => `<span class="d3-muted">${r.lastActiveAt ? D3.dateTime(r.lastActiveAt) : '—'}</span>` },
        ],
        fetch: (q) => api('GET', '/admin/users', { ...q, role: role === 'all' ? '' : role }),
        rowActions: (r) => [
          { icon: 'edit', label: 'Edit role', run: () => edit(r) },
          r.status === 'invited' ? { icon: 'mail', label: 'Resend invite', run: () => act(r, 'resend-invite', 'Invite re-sent to {email}') }
            : r.status === 'suspended' ? { icon: 'refresh', label: 'Reactivate', run: () => act(r, 'reactivate', '{name} reactivated') }
            : { icon: 'ban', label: 'Suspend', danger: true, run: () => suspend(r) },
        ],
        empty: { icon: 'users', title: 'No users with this role', text: 'Invite a teammate to give them access.' },
      });
      const reload = async () => { table.reload(); loadKpis(); try { ROLES = (await api('GET', '/admin/roles')).data; drawRoles(); } catch (e) {} };

      async function act(r, path, msg) {
        try { await api('POST', `/admin/users/${r.id}/${path}`); D3.toast(t(msg, { name: esc(r.name), email: esc(r.email) }), { tone: 'success' }); reload(); }
        catch (err) { D3.fail(err); }
      }
      async function suspend(r) {
        if (r.id === (App.state.user && App.state.user.id)) { D3.toast(t('You can’t suspend your own account.'), { tone: 'error' }); return; }
        if (await D3.confirm({ title: t('Suspend {name}?', { name: esc(r.name) }), text: t('They will be signed out immediately and can’t sign in until reactivated.'), confirm: t('Suspend'), danger: true })) act(r, 'suspend', '{name} suspended');
      }
      function edit(r) {
        D3.modal({
          title: t('Edit {name}', { name: esc(r.name) }), size: 'md', body: userForm(r),
          actions: [
            { label: 'Remove user', variant: 'danger', run: async (m) => {
              if (!(await D3.confirm({ title: t('Remove {name}?', { name: esc(r.name) }), text: t('Their access is revoked and the account is deleted. Audit history is kept.'), confirm: t('Remove'), danger: true }))) return;
              await api('DELETE', `/admin/users/${r.id}`); m.close(); D3.toast(t('User removed'), { tone: 'success' }); reload(); } },
            { label: 'Cancel', variant: 'secondary', close: true },
            { label: 'Save changes', variant: 'primary', run: async (m) => {
              const form = m.el.querySelector('form'); const v = UI.validate(form); if (!v.ok) return;
              try { await api('PATCH', `/admin/users/${r.id}`, { name: v.values.name, role: v.values.role }); m.close(); D3.toast(t('Changes saved'), { tone: 'success' }); reload(); } catch (err) { D3.fail(err, form); }
            } },
          ],
        });
      }
      function invite() {
        D3.modal({
          title: t('Invite User'), size: 'md', body: userForm(null),
          actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Send invite', variant: 'primary', run: async (m) => {
            const form = m.el.querySelector('form'); D3.clearErr(form); const v = UI.validate(form); if (!v.ok) return;
            try { await api('POST', '/admin/users/invite', v.values); m.close(); D3.toast(t('Invite sent to {email}', { email: esc(v.values.email) }), { tone: 'success' }); reload(); } catch (err) { D3.fail(err, form); }
          } }],
        });
      }
      UI.on(el, 'click', '[data-act="invite"]', invite);
      UI.on(el, 'click', '[data-role]', (e, b) => { role = role === b.dataset.role ? 'all' : b.dataset.role; drawTabs(); drawRoles(); table.setQuery({ page: 1 }); });
      el.addEventListener('ui:tab', (e) => { if (e.detail.name !== 'role') return; role = e.detail.value; drawRoles(); table.setQuery({ page: 1 }); });
    },
  });

  UI.css('d3-users', `
    .d3-rolecard{display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:18px 20px;text-align:start;cursor:pointer;font:inherit;color:inherit;border:1px solid var(--line);width:100%}
    .d3-rolecard .h-serif{font-size:17px}
    .d3-rolecard b{font-size:22px;font-family:var(--font-num)}
    .d3-rolecard small{font-size:12.5px;line-height:1.5}
    .d3-rolecard.on{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset}
    .d3-roles{border:0;padding:0;margin:0;display:grid;gap:8px}
    .d3-roles legend{font-weight:600;font-size:13px;margin-bottom:6px}
    .d3-rolepick{display:flex;gap:12px;align-items:flex-start;padding:10px 12px;border:1px solid var(--line);border-radius:var(--r-ctl,11px);cursor:pointer}
    .d3-rolepick:has(input:checked){border-color:var(--accent);background:var(--tint-rose)}
    .d3-rolepick input{margin-top:3px;accent-color:var(--accent)}
    .d3-rolepick small{display:block;font-size:12px}
  `);
})();
