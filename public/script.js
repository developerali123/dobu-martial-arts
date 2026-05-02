/**
 * DoBu Martial Arts — shared behaviour
 * Mobile navigation, Supabase auth, form validation, dashboard guard.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let supabaseClient = null;

/**
 * Load public Supabase config from the Express API and create the browser client.
 */
async function initSupabase() {
  try {
    const res = await fetch('/api/supabase-config');
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('Supabase config:', body.error || res.statusText);
      return null;
    }
    const { url, anonKey } = await res.json();
    supabaseClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return supabaseClient;
  } catch (e) {
    console.warn('Could not initialise Supabase', e);
    return null;
  }
}

/**
 * Toggle mobile navigation open/closed.
 */
function setupMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('is-open', !open);
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.matchMedia('(min-width: 900px)').matches) return;
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
    });
  });
}

/**
 * Show a banner when Supabase env vars are missing (local dev).
 */
function setConfigWarning(visible) {
  const el = document.getElementById('config-warning');
  if (el) el.hidden = !visible;
}

/**
 * Update navbar auth links: Login vs Dashboard + Logout.
 * @param {import('@supabase/supabase-js').Session | null} session
 */
function updateAuthNav(session) {
  const loginLink = document.querySelector('[data-nav="login"]');
  const dashLink = document.querySelector('[data-nav="dashboard"]');
  const logoutBtn = document.querySelector('[data-nav="logout"]');
  const badge = document.querySelector('[data-auth-email]');

  const loginLi = loginLink?.closest('li');
  const dashLi = dashLink?.closest('li');
  const logoutLi = logoutBtn?.closest('li');

  if (loginLi) loginLi.hidden = !!session;
  if (dashLi) dashLi.hidden = !session;
  if (logoutLi) logoutLi.hidden = !session;
  if (badge) {
    badge.hidden = !session;
    badge.textContent = session?.user?.email ? 'Signed in' : '';
  }
}

/**
 * Email/password validation for auth forms.
 */
function validateAuthFields(email, password) {
  const errors = { email: '', password: '' };
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRe.test(email)) errors.email = 'Enter a valid email address.';
  if (!password || password.length < 6) errors.password = 'Password must be at least 6 characters.';
  return errors;
}

/**
 * Auth page: tabs, login, register, messages.
 */
function setupAuthPage(client) {
  const loginForm = document.getElementById('form-login');
  const registerForm = document.getElementById('form-register');
  const tabs = document.querySelectorAll('.auth-tab');
  const panels = document.querySelectorAll('.auth-panel');
  const globalMsg = document.getElementById('auth-global-message');

  if (!loginForm || !registerForm) return;

  function showTab(id) {
    tabs.forEach((t) => {
      const active = t.dataset.tab === id;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', String(active));
    });
    panels.forEach((p) => {
      const show = p.id === `panel-${id}`;
      p.hidden = !show;
      p.setAttribute('aria-hidden', String(!show));
    });
    if (globalMsg) {
      globalMsg.textContent = '';
      globalMsg.className = 'form-message';
      globalMsg.hidden = true;
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => showTab(tab.dataset.tab));
  });

  showTab('login');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!client) {
      if (globalMsg) {
        globalMsg.hidden = false;
        globalMsg.className = 'form-message form-message--error';
        globalMsg.textContent = 'Authentication is not available. Configure Supabase in .env and restart the server.';
      }
      return;
    }
    const email = /** @type {HTMLInputElement} */ (loginForm.querySelector('#login-email')).value.trim();
    const password = /** @type {HTMLInputElement} */ (loginForm.querySelector('#login-password')).value;
    const errEmail = loginForm.querySelector('[data-error="login-email"]');
    const errPass = loginForm.querySelector('[data-error="login-password"]');

    const errs = validateAuthFields(email, password);
    errEmail.textContent = errs.email;
    errPass.textContent = errs.password;
    if (errs.email || errs.password) return;

    if (globalMsg) globalMsg.hidden = true;
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      if (globalMsg) {
        globalMsg.hidden = false;
        globalMsg.className = 'form-message form-message--error';
        globalMsg.textContent = error.message;
      }
      return;
    }
    if (globalMsg) {
      globalMsg.hidden = false;
      globalMsg.className = 'form-message form-message--success';
      globalMsg.textContent = 'Signed in successfully. Redirecting…';
    }
    window.location.href = '/dashboard.html';
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!client) {
      if (globalMsg) {
        globalMsg.hidden = false;
        globalMsg.className = 'form-message form-message--error';
        globalMsg.textContent = 'Authentication is not available. Configure Supabase in .env and restart the server.';
      }
      return;
    }
    const email = /** @type {HTMLInputElement} */ (registerForm.querySelector('#register-email')).value.trim();
    const password = /** @type {HTMLInputElement} */ (registerForm.querySelector('#register-password')).value;
    const errEmail = registerForm.querySelector('[data-error="register-email"]');
    const errPass = registerForm.querySelector('[data-error="register-password"]');

    const errs = validateAuthFields(email, password);
    errEmail.textContent = errs.email;
    errPass.textContent = errs.password;
    if (errs.email || errs.password) return;

    if (globalMsg) globalMsg.hidden = true;
    const { error } = await client.auth.signUp({ email, password });
    if (error) {
      if (globalMsg) {
        globalMsg.hidden = false;
        globalMsg.className = 'form-message form-message--error';
        globalMsg.textContent = error.message;
      }
      return;
    }
    if (globalMsg) {
      globalMsg.hidden = false;
      globalMsg.className = 'form-message form-message--success';
      globalMsg.textContent =
        'Account created. Check your email if confirmation is required, or sign in below.';
    }
    showTab('login');
  });
}

/**
 * Dashboard: require session; show welcome email.
 */
async function setupDashboard(client) {
  const main = document.querySelector('[data-dashboard]');
  if (!main) return;

  if (!client) {
    window.location.replace('/auth.html?redirect=dashboard');
    return;
  }

  const { data: { session } } = await client.auth.getSession();
  if (!session) {
    window.location.replace('/auth.html?redirect=dashboard');
    return;
  }

  const emailEl = document.getElementById('dashboard-email');
  if (emailEl) emailEl.textContent = session.user.email ?? 'member';

  const logoutBtn = document.getElementById('dashboard-logout');
  logoutBtn?.addEventListener('click', async () => {
    await client.auth.signOut();
    window.location.href = '/index.html';
  });
}

/**
 * Optional: logout control in nav when present.
 */
function setupLogoutButton(client) {
  const btn = document.querySelector('[data-nav="logout"]');
  if (!btn || !client) return;
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    await client.auth.signOut();
    window.location.href = '/index.html';
  });
}

/**
 * Fixed “scroll to top” control (up arrow), shown after scrolling down.
 */
function setupScrollToTop() {
  if (document.getElementById('scroll-top-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'scroll-top-btn';
  btn.type = 'button';
  btn.className = 'scroll-top';
  btn.setAttribute('aria-label', 'Scroll to top');
  btn.innerHTML =
    '<span class="scroll-top__icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg></span>';

  document.body.appendChild(btn);

  const updateVisibility = () => {
    btn.classList.toggle('scroll-top--visible', window.scrollY > 300);
  };

  window.addEventListener('scroll', updateVisibility, { passive: true });
  updateVisibility();

  btn.addEventListener('click', () => {
    const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: instant ? 'auto' : 'smooth' });
  });
}

/**
 * Contact form: client-side only (demo).
 */
function setupContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const msg = document.getElementById('contact-form-message');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = /** @type {HTMLInputElement} */ (form.querySelector('#contact-name')).value.trim();
    const email = /** @type {HTMLInputElement} */ (form.querySelector('#contact-email')).value.trim();
    if (!name || !email) {
      msg.hidden = false;
      msg.className = 'form-message form-message--error';
      msg.textContent = 'Please fill in name and email.';
      return;
    }
    msg.hidden = false;
    msg.className = 'form-message form-message--success';
    msg.textContent = 'Thanks — this is a demo form; no message was sent.';
    form.reset();
  });
}

// ——— Bootstrap ———
document.addEventListener('DOMContentLoaded', async () => {
  setupMobileNav();
  setupScrollToTop();
  setupContactForm();

  const client = await initSupabase();
  setConfigWarning(!client);
  setupLogoutButton(client);

  if (client) {
    const { data: { session } } = await client.auth.getSession();
    updateAuthNav(session);

    client.auth.onAuthStateChange((_event, session) => {
      updateAuthNav(session);
    });
  } else {
    updateAuthNav(null);
  }

  const path = window.location.pathname;
  if (path.endsWith('/auth.html')) {
    if (client) {
      const { data: { session: existing } } = await client.auth.getSession();
      if (existing) {
        window.location.replace('/dashboard.html');
      } else {
        setupAuthPage(client);
      }
    } else {
      setupAuthPage(null);
    }
  }
  if (path.endsWith('/dashboard.html')) await setupDashboard(client);
});
