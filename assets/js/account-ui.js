/* Account dialog: sign in, create account, reset password, and a profile view
   with email verification and sign out. Loaded on demand. */
import { $, esc, icon, rootPath, createDialog, showDialog, toast, paintAccountButton } from './ui.js';
import { loadAuth, friendlyAuthError } from './auth.js';

let dlg;
let auth = null;
let mode = 'signin'; // 'signin' | 'signup' | 'reset'
let person = null;
let wired = false;
let initPromise;

function field(id, label, attrs, hint = '') {
  return `<div class="field"><label for="${id}">${label}</label>
    <input class="input" id="${id}" ${attrs}>${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
}

function formView() {
  const isSignup = mode === 'signup';
  const isReset = mode === 'reset';
  return `
    ${isReset ? '' : `<div class="seg" role="tablist" aria-label="Account options">
      <button class="seg__btn" role="tab" type="button" data-mode="signin" aria-selected="${!isSignup}">Sign in</button>
      <button class="seg__btn" role="tab" type="button" data-mode="signup" aria-selected="${isSignup}">Create account</button></div>`}
    ${isReset ? '<p class="muted mb-4"></p>' : ''}
    <form id="acctForm" novalidate>
      ${isSignup ? field('acctName', 'Your name', 'type="text" autocomplete="name" required') : ''}
      ${field('acctEmail', 'Email', 'type="email" autocomplete="email" inputmode="email" required')}
      ${isReset ? '' : field('acctPassword', 'Password', `type="password" autocomplete="${isSignup ? 'new-password' : 'current-password'}" minlength="6" required`, isSignup ? 'At least 6 characters.' : '')}
      <div class="notice notice--error mb-4" id="acctError" role="alert" hidden></div>
      <button class="btn btn--primary btn--block btn--lg" type="submit" id="acctSubmit">
        <span class="btn__label">${isReset ? 'Send reset link' : isSignup ? 'Create account' : 'Sign in'}</span></button>
    </form>
    ${mode === 'signin' ? '<p class="account-note"><button class="link-btn" type="button" data-mode="reset">Forgot your password?</button></p>' : ''}
    ${isReset ? '<p class="account-note"><button class="link-btn" type="button" data-mode="signin">Back to sign in</button></p>' : `
      <div class="divider"><span>or</span></div>
      <button class="btn btn--block" type="button" id="acctGoogle"><span class="btn__label">Continue with Google</span></button>
      <p class="account-note">Signing in lets your study progress follow you between your phone, tablet and computer.</p>`}`;
}

function profileView() {
  const verified = person.emailVerified;
  return `<div class="profile">
    <div class="profile__avatar" aria-hidden="true">${esc(person.name.charAt(0).toUpperCase())}</div>
    <div><div class="profile__name">${esc(person.name)}</div><div class="profile__email">${esc(person.email)}</div></div>
    ${verified ? `<div class="notice notice--success">${icon('shield-check')}<span>Your email is verified. Your progress is saved to your account.</span></div>`
      : `<div class="notice notice--warning">${icon('mail')}<span>Please verify your email. We sent a link to ${esc(person.email)}. Check your spam folder too.</span></div>`}
    <div class="profile__actions">
      ${verified ? '' : `<button class="btn btn--block" type="button" id="acctResend"><span class="btn__label">Resend verification email</span></button>
        <button class="btn btn--block" type="button" id="acctRefresh"><span class="btn__label">I’ve verified my email</span></button>`}
      <a class="btn btn--block" href="${rootPath()}my-notes/index.html"><span class="btn__label">My notes and bookmarks</span></a>
      <div class="share-box"><label class="switch"><input type="checkbox" id="acctShare" ${auth && auth.isSharing() ? 'checked' : ''}>
        <span class="switch__track" aria-hidden="true"></span><span class="switch__text">Share my progress with my class leaders</span></label>
        <p class="hint">If you turn this on, approved class leaders can see your name, email and which studies you have finished. They can never see your notes or bookmarks. Turn it off any time.</p></div>
      <a class="btn btn--block" id="acctLeader" href="${rootPath()}leaders/index.html" hidden><span class="btn__label">Class leader view</span></a>
      <button class="btn btn--block" type="button" id="acctSignOut">${icon('log-out')}<span class="btn__label">Sign out</span></button>
    </div></div>`;
}

function render() {
  const titles = { signin: 'Sign in', signup: 'Create your account', reset: 'Reset your password' };
  $('#acctTitle', dlg).textContent = person ? 'Your account' : titles[mode];
  $('#acctBody', dlg).innerHTML = person ? profileView() : formView();
  if (person && auth) auth.isLeader().then((yes) => { const link = $('#acctLeader', dlg); if (link) link.hidden = !yes; });
  if (!person && mode === 'reset') {
    $('#acctBody .muted', dlg).textContent = 'Enter the email you signed up with and we’ll send you a link to choose a new password.';
  }
}

function showError(message) {
  const box = $('#acctError', dlg);
  if (!box) return;
  box.innerHTML = `${icon('triangle-alert')}<span>${esc(message)}</span>`;
  box.hidden = false;
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  const text = $('.btn__label', button);
  if (busy) { button.dataset.label = text.textContent; text.innerHTML = '<span class="spinner" aria-hidden="true"></span>'; }
  else text.textContent = label || button.dataset.label;
}

async function onSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const email = $('#acctEmail', form).value.trim();
  const password = $('#acctPassword', form)?.value || '';
  const name = $('#acctName', form)?.value.trim() || '';
  const submit = $('#acctSubmit', form);
  $('#acctError', form).hidden = true;
  if (!email) return showError('Please enter your email address.');
  if (mode !== 'reset' && password.length < 6) return showError('Your password needs at least 6 characters.');
  setBusy(submit, true);
  try {
    if (mode === 'reset') {
      await auth.resetPassword(email);
      toast('If that email has an account, a reset link is on its way.', { type: 'success' });
      mode = 'signin'; render();
    } else if (mode === 'signup') {
      const result = await auth.signUp(email, password, name);
      dlg.close();
      toast(result.verificationSent ? 'Account created. Check your email to verify it.' : 'Account created.', { type: 'success' });
    } else {
      await auth.signIn(email, password);
      dlg.close();
      toast('Signed in. Your progress is syncing.', { type: 'success' });
    }
  } catch (error) {
    showError(friendlyAuthError(error));
    setBusy(submit, false);
  }
}

function wire() {
  if (wired) return;
  wired = true;
  dlg.addEventListener('submit', onSubmit);
  dlg.addEventListener('change', async (event) => {
    if (event.target.id !== 'acctShare') return;
    const box = event.target;
    box.disabled = true;
    try {
      await auth.setSharing(box.checked);
      toast(box.checked ? 'Your progress is now visible to class leaders.' : 'Sharing is off. Leaders can no longer see your progress.', { type: 'success' });
    } catch (error) {
      box.checked = !box.checked;
      toast(friendlyAuthError(error), { type: 'error' });
    }
    box.disabled = false;
  });
  dlg.addEventListener('click', async (event) => {
    const modeBtn = event.target.closest('[data-mode]');
    if (modeBtn) { mode = modeBtn.dataset.mode; render(); $('#acctBody input', dlg)?.focus(); return; }
    const id = event.target.closest('button')?.id;
    if (id === 'acctGoogle') {
      const btn = event.target.closest('button');
      setBusy(btn, true);
      try {
        const user = await auth.signInGoogle();
        if (user) { dlg.close(); toast('Signed in. Your progress is syncing.', { type: 'success' }); }
      } catch (error) { showError(friendlyAuthError(error)); setBusy(btn, false, 'Continue with Google'); }
    } else if (id === 'acctSignOut') {
      await auth.logOut();
      dlg.close();
      toast('Signed out.');
    } else if (id === 'acctResend') {
      try { await auth.resendVerification(); toast('Verification email sent.', { type: 'success' }); }
      catch (error) { toast(friendlyAuthError(error), { type: 'error' }); }
    } else if (id === 'acctRefresh') {
      const updated = await auth.refreshUser();
      if (updated?.emailVerified) toast('Email verified. Thank you!', { type: 'success' });
      else toast('Not verified yet. Open the link in the email first.');
    }
  });
}

function build() {
  dlg = createDialog({
    label: 'Account',
    html: `<div class="dialog__head"><h2 class="dialog__title" id="acctTitle">Sign in</h2>
      <button class="nav-btn" type="button" data-close aria-label="Close">${icon('x')}</button></div>
      <div class="dialog__body" id="acctBody"></div>`,
  });
  dlg.setAttribute('aria-labelledby', 'acctTitle');
  dlg.removeAttribute('aria-label');
}

/** Restores a signed-in session in the background (no dialog shown). */
export function initAccount() {
  if (!initPromise) initPromise = startAccount();
  return initPromise;
}

async function startAccount() {
  try {
    auth = await loadAuth();
  } catch {
    initPromise = null;
    return; // offline: the button keeps its remembered label
  }
  window.addEventListener('rccg:auth-changed', (event) => {
    person = event.detail;
    paintAccountButton(person);
    if (dlg?.open) render();
  });
  window.addEventListener('rccg:auth-error', (event) => toast(event.detail, { type: 'error' }));
  let warned = false;
  window.addEventListener('rccg:sync-error', (event) => {
    if (!warned) { warned = true; toast(`Progress couldn’t sync: ${event.detail}`, { type: 'error' }); }
  });
  person = auth.getCurrentUser();
  paintAccountButton(person);
}

export async function openAccount() {
  if (!dlg) build();
  wire();
  if (!auth) {
    $('#acctBody', dlg).innerHTML = '<p class="muted"><span class="spinner" aria-hidden="true"></span> Loading…</p>';
    showDialog(dlg);
    await initAccount();
    if (!auth) {
      $('#acctBody', dlg).innerHTML = `<div class="notice notice--error">${icon('wifi-off')}<span>Sign-in needs an internet connection. Your progress is still saved on this device.</span></div>`;
      return;
    }
  }
  person = auth.getCurrentUser();
  mode = 'signin';
  render();
  showDialog(dlg);
  $('#acctBody input', dlg)?.focus();
}
