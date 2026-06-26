import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './assets/main.css';

// Auth interceptor - add token to all requests
const originalFetch = window.fetch;
window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
  const token = localStorage.getItem('qb-token');
  if (token) {
    init = init || {};
    const headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    init.headers = headers;
  }
  return originalFetch.call(this, input, init).then(async res => {
    if (res.status === 401) {
      const clone = res.clone();
      const json = await clone.json().catch(() => null);
      if (json?.error?.includes('登录')) {
        localStorage.removeItem('qb-token');
        localStorage.removeItem('qb-user');
        router.push('/login');
      }
    }
    return res;
  });
};

// Router guard
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('qb-token');
  if (!to.meta.public && !token) {
    originalFetch('/api/auth/me').then(r => r.json()).then(json => {
      if (!json.data) {
        next('/login');
      } else if (!token) {
        next('/login');
      } else {
        next();
      }
    }).catch(() => next('/login'));
  } else {
    next();
  }
});

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
