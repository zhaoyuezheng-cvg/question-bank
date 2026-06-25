<template>
  <div class="app-layout" :data-theme="theme">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ 'mobile-open': mobileOpen }">
      <div class="sidebar-brand">
        <div class="sidebar-brand-icon">📚</div>
        <div>
          <div class="sidebar-brand-text">私人题库</div>
          <div class="sidebar-brand-sub">Question Bank</div>
        </div>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-section-label">概览</div>
        <ul class="sidebar-nav">
          <li>
            <router-link to="/" @click="closeMobile">
              <span class="nav-icon">📊</span>
              <span>仪表盘</span>
            </router-link>
          </li>
        </ul>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-section-label">题库</div>
        <ul class="sidebar-nav">
          <li>
            <router-link to="/questions" @click="closeMobile">
              <span class="nav-icon">📝</span>
              <span>题目管理</span>
            </router-link>
          </li>
          <li>
            <router-link to="/papers" @click="closeMobile">
              <span class="nav-icon">📄</span>
              <span>试卷管理</span>
            </router-link>
          </li>
          <li>
            <router-link to="/import" @click="closeMobile">
              <span class="nav-icon">📥</span>
              <span>批量导入</span>
            </router-link>
          </li>
        </ul>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-section-label">练习</div>
        <ul class="sidebar-nav">
          <li>
            <router-link to="/practice" @click="closeMobile">
              <span class="nav-icon">🎯</span>
              <span>答题练习</span>
            </router-link>
          </li>
          <li>
            <router-link to="/practice/errors" @click="closeMobile">
              <span class="nav-icon">📋</span>
              <span>错题本</span>
            </router-link>
          </li>
          <li>
            <router-link to="/favorites" @click="closeMobile">
              <span class="nav-icon">❤️</span>
              <span>收藏夹</span>
            </router-link>
          </li>
        </ul>
      </div>

      <div class="sidebar-footer">
        <button class="theme-toggle" @click="toggleTheme">
          <span>{{ theme === 'dark' ? '☀️' : '🌙' }}</span>
          <span>{{ theme === 'dark' ? '切换亮色' : '切换暗色' }}</span>
        </button>
      </div>
    </aside>

    <!-- Mobile overlay -->
    <div
      v-if="mobileOpen"
      class="mobile-overlay"
      style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:99;"
      @click="closeMobile"
    />

    <!-- Main -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="route" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Toast Container -->
    <div class="toast-container">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast"
        :class="`toast-${t.type}`"
      >
        <span class="toast-icon">{{ toastIcon(t.type) }}</span>
        <span>{{ t.message }}</span>
        <button class="toast-close" @click="removeToast(t.id)">×</button>
      </div>
    </div>

    <!-- Confirm Dialog -->
    <div v-if="confirmState" class="confirm-overlay" @click.self="resolveConfirm(false)">
      <div class="confirm-dialog">
        <div class="confirm-icon">{{ confirmState.icon || '⚠️' }}</div>
        <div class="confirm-title">{{ confirmState.title || '确认操作' }}</div>
        <div class="confirm-message">{{ confirmState.message }}</div>
        <div class="confirm-actions">
          <button class="btn" @click="resolveConfirm(false)">取消</button>
          <button class="btn btn-primary" @click="resolveConfirm(true)">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, provide } from 'vue';

// ---- Theme ----
const theme = ref<'light' | 'dark'>('light');

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme.value);
  localStorage.setItem('qb-theme', theme.value);
}

onMounted(() => {
  const saved = localStorage.getItem('qb-theme') as 'light' | 'dark' | null;
  if (saved) {
    theme.value = saved;
    document.documentElement.setAttribute('data-theme', saved);
  }
});

// ---- Mobile ----
const mobileOpen = ref(false);
function closeMobile() { mobileOpen.value = false; }

// ---- Toast ----
interface ToastItem {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

const toasts = ref<ToastItem[]>([]);
let toastId = 0;

function toastIcon(type: string) {
  const icons: Record<string, string> = {
    success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️',
  };
  return icons[type] || 'ℹ️';
}

function addToast(type: ToastItem['type'], message: string, duration = 3000) {
  const id = ++toastId;
  toasts.value.push({ id, type, message });
  if (duration > 0) {
    setTimeout(() => removeToast(id), duration);
  }
}

function removeToast(id: number) {
  toasts.value = toasts.value.filter(t => t.id !== id);
}

provide('toast', addToast);

// ---- Confirm ----
interface ConfirmOptions {
  title?: string;
  message: string;
  icon?: string;
}

const confirmState = ref<ConfirmOptions | null>(null);
let confirmResolve: ((value: boolean) => void) | null = null;

function showConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    confirmState.value = options;
    confirmResolve = resolve;
  });
}

function resolveConfirm(value: boolean) {
  confirmResolve?.(value);
  confirmState.value = null;
  confirmResolve = null;
}

provide('confirm', showConfirm);
</script>

<style scoped>
.mobile-overlay {
  display: none;
}

@media (max-width: 768px) {
  .mobile-overlay {
    display: block;
  }
}
</style>
