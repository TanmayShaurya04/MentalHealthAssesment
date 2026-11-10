/** My Safety Plan: a Stanley-Brown style plan the student writes for themselves while calm. */
import { Navbar, initNavbar } from '../components/Navbar.js';
import { Footer } from '../components/Footer.js';
import { Toast } from '../components/Toast.js';
import { apiClient } from '../api/client.js';
import { esc } from '../utils/html.js';
import { icon } from '../components/icons.js';

const LISTS = [
  ['warning_signs', '1. My warning signs', 'Thoughts, moods or situations that tell me things are getting harder.', 'e.g. I stop replying to friends'],
  ['coping_strategies', '2. Things I can do on my own', 'Small things that help me settle, without needing anyone else.', 'e.g. a walk, slow breathing, loud music'],
  ['distractions', '3. People and places that lift my mood', 'Somewhere I can be around others, even if I do not talk about how I feel.', 'e.g. the canteen, a friend\'s room'],
  ['safe_places', '4. Safe places on campus', 'Places where I feel calm and can reach someone quickly.', 'e.g. library 2nd floor, counselling centre'],
];

const row = (key, val, ph) => `<div class="sp-row" data-row><input class="form-input" data-key="${key}" maxlength="200" value="${esc(val)}" placeholder="${esc(ph)}"><button type="button" class="btn btn-ghost btn-sm" data-remove aria-label="Remove">${icon('x', { size: 14 })}</button></div>`;
const contact = (c = {}) => `<div class="sp-contact" data-row><input class="form-input" data-c="name" maxlength="80" placeholder="Name (friend, mentor, family)" value="${esc(c.name || '')}"><input class="form-input" data-c="phone" type="tel" maxlength="30" placeholder="Phone" value="${esc(c.phone || '')}"><button type="button" class="btn btn-ghost btn-sm" data-remove aria-label="Remove">${icon('x', { size: 14 })}</button></div>`;

export const SafetyPlan = {
  _off: null,
  render() {
    return `
      ${Navbar.render()}
      <main class="page-root settings-page sp-page" id="main-content">
        <div class="container settings-container">
          <h1 class="legal-title">My safety plan</h1>
          <p class="sp-intro">Fill this in when you are feeling okay, so it is ready if a hard moment comes. It is private to your account and you can print it.</p>
          <div class="sp-helpline" role="note">${icon('phone', { size: 16 })} <strong>If you may act on thoughts of harming yourself, call a helpline or emergency services right now.</strong> In India: Tele-MANAS <strong>14416</strong> or <strong>1800-891-4416</strong>, emergency <strong>112</strong>.</div>
          <div id="sp-body" aria-live="polite"><div class="skeleton skeleton-block"></div></div>
        </div>
      </main>
      ${Footer.render()}`;
  },
  async afterRender() {
    this._off = initNavbar();
    const body = document.getElementById('sp-body');
    let plan;
    try { plan = await apiClient.get('/api/users/me/safety-plan'); }
    catch (e) { body.innerHTML = '<p>We could not load your plan. Please try again.</p>'; return; }

    body.innerHTML = `<form id="sp-form" novalidate>
      ${LISTS.map(([k, h, hint, ph]) => `<section class="sp-card" data-list="${k}"><h2>${h}</h2><p class="form-hint">${hint}</p>
        <div class="sp-list">${(plan[k].length ? plan[k] : ['']).map((v) => row(k, v, ph)).join('')}</div>
        <button type="button" class="btn btn-ghost btn-sm" data-add="${k}" data-ph="${esc(ph)}">+ Add another</button></section>`).join('')}
      <section class="sp-card" data-contacts><h2>5. People I can reach out to</h2><p class="form-hint">Trusted friends, mentors or family I can contact when I need support.</p>
        <div class="sp-list">${(plan.contacts.length ? plan.contacts : [{}]).map(contact).join('')}</div>
        <button type="button" class="btn btn-ghost btn-sm" data-add-contact>+ Add a person</button></section>
      <section class="sp-card"><h2>6. Making my space safer</h2><p class="form-hint">One thing I can do to put distance between me and anything I could use to hurt myself.</p>
        <textarea class="form-input" id="sp-env" rows="2" maxlength="500">${esc(plan.safe_environment)}</textarea></section>
      <section class="sp-card"><h2>7. What matters to me</h2><p class="form-hint">A reason to keep going, in my own words.</p>
        <textarea class="form-input" id="sp-why" rows="2" maxlength="500">${esc(plan.reasons_to_live)}</textarea></section>
      <div class="sp-actions"><button class="btn btn-primary" type="submit">Save my plan</button>
        <button class="btn btn-secondary" type="button" id="sp-print">${icon('printer', { size: 16 })} Print</button></div>
    </form>`;

    const form = document.getElementById('sp-form');
    form.addEventListener('click', (e) => {
      const rm = e.target.closest('[data-remove]');
      if (rm) { const r = rm.closest('[data-row]'); const list = r.parentElement; r.remove(); if (!list.children.length) list.insertAdjacentHTML('beforeend', list.closest('[data-contacts]') ? contact() : row(list.closest('[data-list]').dataset.list, '', '')); return; }
      const add = e.target.closest('[data-add]');
      if (add) { const list = add.previousElementSibling; if (list.children.length < 10) { list.insertAdjacentHTML('beforeend', row(add.dataset.add, '', add.dataset.ph)); list.lastElementChild.querySelector('input').focus(); } return; }
      if (e.target.closest('[data-add-contact]')) { const list = form.querySelector('[data-contacts] .sp-list'); if (list.children.length < 6) { list.insertAdjacentHTML('beforeend', contact()); list.lastElementChild.querySelector('input').focus(); } }
    });
    document.getElementById('sp-print').addEventListener('click', () => window.print());
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const out = { contacts: [], reasons_to_live: document.getElementById('sp-why').value, safe_environment: document.getElementById('sp-env').value };
      LISTS.forEach(([k]) => { out[k] = [...form.querySelectorAll(`[data-list="${k}"] input`)].map((i) => i.value); });
      form.querySelectorAll('[data-contacts] [data-row]').forEach((r) => out.contacts.push({ name: r.querySelector('[data-c=name]').value, phone: r.querySelector('[data-c=phone]').value }));
      try { await apiClient.put('/api/users/me/safety-plan', out); Toast.success('Your safety plan is saved.'); }
      catch (err) { Toast.error(err.message); }
    });
  },
  destroy() { this._off?.(); },
};
