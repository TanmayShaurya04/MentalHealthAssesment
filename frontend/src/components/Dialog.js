/**
 * Dialog.js — accessible confirm / prompt dialog that replaces the browser's plain confirm().
 *
 *   if (await confirmDialog({ title: 'Delete entry?', message: '…', confirmLabel: 'Delete', danger: true })) {…}
 *   const pw = await confirmDialog({ …, input: { type: 'password', label: 'Your password' } });  // string | null
 */
import { esc } from '../utils/html.js';

export function confirmDialog({
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  input = null,
} = {}) {
  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement;
    const root = document.createElement('div');
    root.className = 'dialog-backdrop';
    root.innerHTML = `
      <div class="dialog-card" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-msg">
        <h3 id="dlg-title" class="dialog-title">${esc(title)}</h3>
        <p id="dlg-msg" class="dialog-message">${esc(message)}</p>
        ${input ? `
          <label class="form-label" for="dlg-input">${esc(input.label || '')}</label>
          <input id="dlg-input" class="form-input" type="${esc(input.type || 'text')}" autocomplete="${esc(input.autocomplete || 'off')}" />` : ''}
        <div class="dialog-actions">
          <button type="button" class="btn btn-secondary btn-sm" data-act="cancel">${esc(cancelLabel)}</button>
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'} btn-sm" data-act="ok">${esc(confirmLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(root);
    document.body.classList.add('dialog-open');
    requestAnimationFrame(() => root.classList.add('open'));

    const field = root.querySelector('#dlg-input');
    const okBtn = root.querySelector('[data-act="ok"]');
    (field || root.querySelector('[data-act="cancel"]')).focus();

    const close = (result) => {
      root.classList.remove('open');
      document.body.classList.remove('dialog-open');
      document.removeEventListener('keydown', onKey, true);
      setTimeout(() => root.remove(), 200);
      previouslyFocused?.focus?.();
      resolve(result);
    };
    const accept = () => close(input ? (field.value || null) : true);
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(input ? null : false); }
      else if (e.key === 'Enter' && field && document.activeElement === field) { e.preventDefault(); accept(); }
      else if (e.key === 'Tab') {  // keep focus inside the dialog
        const items = [...root.querySelectorAll('button, input')];
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    okBtn.addEventListener('click', accept);
    root.querySelector('[data-act="cancel"]').addEventListener('click', () => close(input ? null : false));
    root.addEventListener('mousedown', (e) => { if (e.target === root) close(input ? null : false); });
  });
}
