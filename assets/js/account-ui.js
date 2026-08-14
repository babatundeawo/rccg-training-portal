/* =============================================================
   RCCG Learning Path - Account UI
   Injects a sign-in/sign-up modal and wires up the "Account" button
   that appears in every page's top nav. Depends on auth.js having
   set window.RCCGAuth, and on app.js's RCCG helper being loaded.
   ============================================================= */

(function () {
  function buildModal() {
    const existing = document.querySelector('[data-account-modal]');
    if (existing) return existing;
    const overlay = document.createElement('div');
    overlay.className = 'scr-modal-overlay account-modal-overlay';
    overlay.setAttribute('data-account-modal', '1');
    overlay.innerHTML = `
      <div class="scr-modal account-modal" role="dialog" aria-modal="true">
        <div class="scr-modal__head">
          <div class="scr-modal__ref" id="acctModalTitle">Sign in</div>
          <button class="scr-modal__close" type="button" aria-label="Close">✕</button>
        </div>
        <div class="account-tabs">
          <button type="button" class="account-tab is-active" data-tab="signin">Sign in</button>
          <button type="button" class="account-tab" data-tab="signup">Create account</button>
        </div>
        <form class="account-form" id="acctForm">
          <div class="field account-name-field" style="display:none;">
            <label for="acctName">Your name</label>
            <input id="acctName" type="text" autocomplete="name">
          </div>
          <div class="field">
            <label for="acctEmail">Email</label>
            <input id="acctEmail" type="email" autocomplete="email" required>
          </div>
          <div class="field">
            <label for="acctPassword">Password</label>
            <input id="acctPassword" type="password" autocomplete="current-password" required minlength="6">
          </div>
          <div class="account-error" id="acctError" style="display:none;"></div>
          <button class="btn btn--primary btn--block" type="submit" id="acctSubmitBtn">Sign in</button>
        </form>
        <div class="account-divider"><span>or</span></div>
        <button class="btn btn--outline btn--block" type="button" id="acctGoogleBtn">
          Continue with Google
        </button>
        <p class="account-note">Signing in lets your study progress follow you between your phone, tablet, and computer.</p>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => overlay.classList.remove('is-open');
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('.scr-modal__close').addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    let mode = 'signin';
    const tabs = overlay.querySelectorAll('.account-tab');
    const nameField = overlay.querySelector('.account-name-field');
    const submitBtn = overlay.querySelector('#acctSubmitBtn');
    const errorBox = overlay.querySelector('#acctError');
    const title = overlay.querySelector('#acctModalTitle');

    function setMode(newMode) {
      mode = newMode;
      tabs.forEach(t => t.classList.toggle('is-active', t.dataset.tab === mode));
      nameField.style.display = mode === 'signup' ? 'block' : 'none';
      submitBtn.textContent = mode === 'signup' ? 'Create account' : 'Sign in';
      title.textContent = mode === 'signup' ? 'Create your account' : 'Sign in';
      errorBox.style.display = 'none';
    }
    tabs.forEach(t => t.addEventListener('click', () => setMode(t.dataset.tab)));

    overlay.querySelector('#acctForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.style.display = 'none';
      submitBtn.disabled = true;
      const email = overlay.querySelector('#acctEmail').value.trim();
      const password = overlay.querySelector('#acctPassword').value;
      const name = overlay.querySelector('#acctName').value.trim();
      try {
        if (mode === 'signup') {
          await window.RCCGAuth.signUp(email, password, name);
        } else {
          await window.RCCGAuth.signIn(email, password);
        }
        // Reload so the page picks up the freshly-synced cloud progress
        // cleanly from scratch, rather than trying to patch the live DOM.
        submitBtn.textContent = 'Signed in - reloading...';
        location.reload();
      } catch (err) {
        errorBox.textContent = window.RCCGAuth.friendlyAuthError(err);
        errorBox.style.display = 'block';
        submitBtn.disabled = false;
      }
    });

    overlay.querySelector('#acctGoogleBtn').addEventListener('click', async (e) => {
      errorBox.style.display = 'none';
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = 'Opening Google sign-in...';
      try {
        const user = await window.RCCGAuth.signInGoogle();
        if (user) {
          // Popup succeeded and returned a user directly - reload now so the
          // page picks up freshly-synced cloud progress from scratch.
          btn.textContent = 'Signed in - reloading...';
          location.reload();
        }
        // If no user came back, signInGoogle fell back to a full-page
        // redirect that's already in progress - nothing more to do here.
      } catch (err) {
        errorBox.textContent = window.RCCGAuth.friendlyAuthError(err);
        errorBox.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Continue with Google';
      }
    });

    return overlay;
  }

  function paintAccountButton(user) {
    const btn = document.querySelector('[data-account-btn]');
    if (!btn) return;
    if (user) {
      const label = user.displayName || user.email || 'Account';
      btn.innerHTML = `<span class="account-avatar">${label.charAt(0).toUpperCase()}</span><span class="account-btn-label">${RCCG.escapeHtml(label.split(' ')[0])}</span>`;
      btn.setAttribute('data-signed-in', 'true');
    } else {
      btn.innerHTML = `<span class="account-btn-label">Sign in</span>`;
      btn.removeAttribute('data-signed-in');
    }
  }

  function initAccountUI() {
    const overlay = buildModal();
    const btn = document.querySelector('[data-account-btn]');
    if (btn) {
      btn.addEventListener('click', async () => {
        if (btn.getAttribute('data-signed-in') === 'true') {
          if (confirm('Sign out?')) {
            await window.RCCGAuth.logOut();
            location.reload();
          }
        } else {
          overlay.classList.add('is-open');
        }
      });
    }
    window.addEventListener('rccg:auth-changed', (e) => paintAccountButton(e.detail));
    // Surface errors from a just-completed Google redirect sign-in - the
    // modal itself won't still be open after the page reloads back from
    // Google, so a plain alert is the simplest reliable way to show it.
    window.addEventListener('rccg:auth-error', (e) => alert(e.detail));
    // In case auth already resolved before this ran
    if (window.RCCGAuth?.getCurrentUser()) paintAccountButton(window.RCCGAuth.getCurrentUser());
  }

  window.RCCG_initAccountUI = initAccountUI;
})();
