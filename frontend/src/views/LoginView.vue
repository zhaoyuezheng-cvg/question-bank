<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-brand">
        <span style="font-size: 40px;">📚</span>
        <h1>私人题库</h1>
        <p>Question Bank System</p>
      </div>

      <div v-if="needRegister" class="login-form">
        <h2 style="margin-bottom: 8px;">首次使用，创建管理员</h2>
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px;">第一个注册的用户将成为管理员</p>
        <div class="form-group">
          <input class="form-input" v-model="form.username" placeholder="用户名" @keyup.enter="handleRegister" />
        </div>
        <div class="form-group">
          <input class="form-input" v-model="form.password" type="password" placeholder="密码" @keyup.enter="handleRegister" />
        </div>
        <button class="btn btn-primary btn-lg" style="width: 100%;" @click="handleRegister" :disabled="loading">
          {{ loading ? '创建中...' : '创建管理员' }}
        </button>
      </div>

      <div v-else class="login-form">
        <div class="form-group">
          <input class="form-input" v-model="form.username" placeholder="用户名" @keyup.enter="handleLogin" />
        </div>
        <div class="form-group">
          <input class="form-input" v-model="form.password" type="password" placeholder="密码" @keyup.enter="handleLogin" />
        </div>
        <button class="btn btn-primary btn-lg" style="width: 100%;" @click="handleLogin" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </div>

      <div v-if="error" style="color: var(--danger); font-size: 13px; margin-top: 12px; text-align: center;">{{ error }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const loading = ref(false);
const error = ref('');
const needRegister = ref(false);
const form = ref({ username: '', password: '' });

onMounted(async () => {
  // Check if any user exists
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${localStorage.getItem('qb-token') || ''}` },
    });
    const json = await res.json();
    if (json.success && json.data) {
      router.push('/');
      return;
    }
  } catch {}

  // Try to register - if no users, it will succeed
  needRegister.value = true;
});

async function handleLogin() {
  if (!form.value.username || !form.value.password) { error.value = '请输入用户名和密码'; return; }
  loading.value = true;
  error.value = '';
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value),
    });
    const json = await res.json();
    if (json.success) {
      localStorage.setItem('qb-token', json.data.token);
      localStorage.setItem('qb-user', JSON.stringify(json.data.user));
      const redirect = (router.currentRoute.value.query.redirect as string) || '/';
      router.push(redirect);
    } else {
      error.value = json.error || '登录失败';
    }
  } catch (e: any) {
    error.value = '网络错误';
  } finally {
    loading.value = false;
  }
}

async function handleRegister() {
  if (!form.value.username || !form.value.password) { error.value = '请输入用户名和密码'; return; }
  if (form.value.password.length < 8) { error.value = '密码至少8位'; return; }
  if (!/[a-zA-Z]/.test(form.value.password) || !/[0-9]/.test(form.value.password)) { error.value = '密码需包含字母和数字'; return; }
  loading.value = true;
  error.value = '';
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value),
    });
    const json = await res.json();
    if (json.success) {
      // Auto login after register
      await handleLogin();
    } else {
      error.value = json.error || '注册失败';
    }
  } catch (e: any) {
    error.value = '网络错误';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4f46e5 100%);
}
.login-card {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: var(--shadow-xl);
}
.login-brand {
  text-align: center;
  margin-bottom: 32px;
}
.login-brand h1 {
  font-size: 24px;
  margin-top: 8px;
}
.login-brand p {
  font-size: 13px;
  color: var(--text-muted);
}
.login-form .form-group {
  margin-bottom: 16px;
}
</style>
