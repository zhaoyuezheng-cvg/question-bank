<template>
  <div class="app-layout" :data-theme="theme" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ 'mobile-open': mobileOpen, collapsed: sidebarCollapsed }">
      <div class="sidebar-brand">
        <div class="sidebar-brand-icon">📚</div>
        <div v-if="!sidebarCollapsed" class="sidebar-brand-text-wrap">
          <div class="sidebar-brand-text">私人题库</div>
          <div class="sidebar-brand-sub">Question Bank</div>
        </div>
      </div>

      <!-- Search trigger -->
      <div v-if="!sidebarCollapsed" class="sidebar-search" @click="openPalette">
        <span class="sidebar-search-icon">🔍</span>
        <span class="sidebar-search-text">搜索...</span>
        <kbd class="sidebar-search-kbd">⌘K</kbd>
      </div>
      <div v-else class="sidebar-search sidebar-search-icon-only" @click="openPalette" title="搜索 (⌘K)">
        🔍
      </div>

      <div class="sidebar-section">
        <div v-if="!sidebarCollapsed" class="sidebar-section-label">概览</div>
        <ul class="sidebar-nav">
          <li>
            <router-link to="/" @click="closeMobile" :title="sidebarCollapsed ? '仪表盘' : ''">
              <span class="nav-icon">📊</span>
              <span v-if="!sidebarCollapsed">仪表盘</span>
            </router-link>
          </li>
        </ul>
      </div>

      <div class="sidebar-section">
        <div v-if="!sidebarCollapsed" class="sidebar-section-label">题库</div>
        <ul class="sidebar-nav">
          <li>
            <router-link to="/questions" @click="closeMobile" :title="sidebarCollapsed ? '题目管理' : ''">
              <span class="nav-icon">📝</span>
              <span v-if="!sidebarCollapsed">题目管理</span>
            </router-link>
          </li>
          <li>
            <router-link to="/papers" @click="closeMobile" :title="sidebarCollapsed ? '试卷管理' : ''">
              <span class="nav-icon">📄</span>
              <span v-if="!sidebarCollapsed">试卷管理</span>
            </router-link>
          </li>
          <li>
            <router-link to="/import" @click="closeMobile" :title="sidebarCollapsed ? '批量导入' : ''">
              <span class="nav-icon">📥</span>
              <span v-if="!sidebarCollapsed">批量导入</span>
            </router-link>
          </li>
          <li>
            <router-link to="/ai-import" @click="closeMobile" :title="sidebarCollapsed ? 'AI导入' : ''">
              <span class="nav-icon">🤖</span>
              <span v-if="!sidebarCollapsed">AI 智能导入</span>
            </router-link>
          </li>
          <li>
            <router-link to="/passages" @click="closeMobile" :title="sidebarCollapsed ? '阅读材料' : ''">
              <span class="nav-icon">📖</span>
              <span v-if="!sidebarCollapsed">阅读材料</span>
            </router-link>
          </li>
        </ul>
      </div>

      <div class="sidebar-section">
        <div v-if="!sidebarCollapsed" class="sidebar-section-label">练习</div>
        <ul class="sidebar-nav">
          <li>
            <router-link to="/practice" @click="closeMobile" :title="sidebarCollapsed ? '答题练习' : ''">
              <span class="nav-icon">🎯</span>
              <span v-if="!sidebarCollapsed">答题练习</span>
            </router-link>
          </li>
          <li>
            <router-link to="/practice/errors" @click="closeMobile" :title="sidebarCollapsed ? '错题本' : ''">
              <span class="nav-icon">📋</span>
              <span v-if="!sidebarCollapsed">错题本</span>
            </router-link>
          </li>
          <li>
            <router-link to="/favorites" @click="closeMobile" :title="sidebarCollapsed ? '收藏夹' : ''">
              <span class="nav-icon">❤️</span>
              <span v-if="!sidebarCollapsed">收藏夹</span>
            </router-link>
          </li>
        </ul>
      </div>

      <div class="sidebar-section">
        <div v-if="!sidebarCollapsed" class="sidebar-section-label">进阶</div>
        <ul class="sidebar-nav">
          <li>
            <router-link to="/exam" @click="closeMobile" :title="sidebarCollapsed ? '考试模拟' : ''">
              <span class="nav-icon">📋</span>
              <span v-if="!sidebarCollapsed">考试模拟</span>
            </router-link>
          </li>
          <li>
            <router-link to="/flashcards" @click="closeMobile" :title="sidebarCollapsed ? '闪卡记忆' : ''">
              <span class="nav-icon">🃏</span>
              <span v-if="!sidebarCollapsed">闪卡记忆</span>
            </router-link>
          </li>
          <li>
            <router-link to="/stats" @click="closeMobile" :title="sidebarCollapsed ? '数据分析' : ''">
              <span class="nav-icon">📈</span>
              <span v-if="!sidebarCollapsed">数据分析</span>
            </router-link>
          </li>
        </ul>
      </div>

      <div class="sidebar-footer">
        <div v-if="!sidebarCollapsed" class="sidebar-shortcuts">
          <div class="shortcut-hint"><kbd>N</kbd> 新建题目</div>
          <div class="shortcut-hint"><kbd>/</kbd> 搜索</div>
        </div>
        <div style="display: flex; gap: 4px;">
          <button class="theme-toggle" @click="toggleTheme" :title="theme === 'dark' ? '切换亮色' : '切换暗色'" :style="sidebarCollapsed ? 'justify-content: center; padding: 8px;' : ''">
            <span>{{ theme === 'dark' ? '☀️' : '🌙' }}</span>
            <span v-if="!sidebarCollapsed">{{ theme === 'dark' ? '切换亮色' : '切换暗色' }}</span>
          </button>
          <button class="theme-toggle" @click="toggleSidebar" :title="sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'" style="flex: 0; padding: 8px; width: 36px; justify-content: center;">
            {{ sidebarCollapsed ? '»' : '«' }}
          </button>
        </div>
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

    <!-- Command Palette -->
    <CommandPalette ref="paletteRef" />

    <!-- Toast Container -->
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast"
          :class="`toast-${t.type}`"
        >
          <span class="toast-icon">{{ toastIcon(t.type) }}</span>
          <span class="toast-msg">{{ t.message }}</span>
          <button v-if="t.action" class="toast-action" @click="t.action.fn(); removeToast(t.id)">
            {{ t.action.label }}
          </button>
          <button class="toast-close" @click="removeToast(t.id)">×</button>
        </div>
      </TransitionGroup>
    </div>

    <!-- Confirm Dialog -->
    <Transition name="palette">
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
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, provide } from 'vue';
import { useRouter } from 'vue-router';
import CommandPalette from '@/components/CommandPalette.vue';

const router = useRouter();

// ---- Theme ----
const theme = ref<'light' | 'dark'>('light');

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme.value);
  localStorage.setItem('qb-theme', theme.value);
}

// ---- Sidebar Collapse ----
const sidebarCollapsed = ref(false);

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  localStorage.setItem('qb-sidebar-collapsed', String(sidebarCollapsed.value));
}

// ---- Mobile ----
const mobileOpen = ref(false);
function closeMobile() { mobileOpen.value = false; }

// ---- Command Palette ----
const paletteRef = ref();
function openPalette() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
}

// ---- Keyboard Shortcuts ----
onMounted(() => {
  const saved = localStorage.getItem('qb-theme') as 'light' | 'dark' | null;
  if (saved) {
    theme.value = saved;
    document.documentElement.setAttribute('data-theme', saved);
  }
  const collapsed = localStorage.getItem('qb-sidebar-collapsed');
  if (collapsed === 'true') sidebarCollapsed.value = true;

  window.addEventListener('keydown', globalKeyHandler);
});

function globalKeyHandler(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    router.push('/questions/new');
  }
}

// ---- Toast ----
interface ToastAction { label: string; fn: () => void; }
interface ToastItem {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  action?: ToastAction;
  persistent?: boolean;
}

const toasts = ref<ToastItem[]>([]);
let toastId = 0;

function toastIcon(type: string) {
  return ({ success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' } as Record<string, string>)[type] || 'ℹ️';
}

function addToast(type: ToastItem['type'], message: string, duration = 4000, action?: ToastAction) {
  const id = ++toastId;
  const persistent = !!action;
  toasts.value.push({ id, type, message, action, persistent });
  if (!persistent && duration > 0) {
    setTimeout(() => removeToast(id), duration);
  }
  return id;
}

function removeToast(id: number) {
  toasts.value = toasts.value.filter(t => t.id !== id);
}

provide('toast', addToast);

// ---- Confirm ----
interface ConfirmOptions { title?: string; message: string; icon?: string; }
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
.sidebar-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 12px 4px;
  padding: 8px 12px;
  border-radius: var(--radius);
  background: rgba(255,255,255,0.06);
  cursor: pointer;
  transition: background var(--transition-fast);
  color: var(--text-sidebar);
  font-size: 13px;
}
.sidebar-search:hover { background: rgba(255,255,255,0.12); }
.sidebar-search-icon-only {
  justify-content: center;
  margin: 8px 12px;
  padding: 10px;
  font-size: 16px;
}
.sidebar-search-icon { font-size: 14px; opacity: 0.6; }
.sidebar-search-text { flex: 1; opacity: 0.5; }
.sidebar-search-kbd {
  font-size: 10px; padding: 2px 5px; border-radius: 3px;
  background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15);
  font-family: inherit; opacity: 0.6;
}

.sidebar-brand-text-wrap { overflow: hidden; }

.sidebar-shortcuts {
  padding: 8px 0; margin-bottom: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.shortcut-hint {
  display: flex; align-items: center; gap: 8px;
  font-size: 11px; color: var(--text-sidebar); opacity: 0.5; padding: 2px 0;
}
.shortcut-hint kbd {
  font-size: 10px; padding: 1px 5px; border-radius: 3px;
  background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15);
  font-family: inherit; min-width: 18px; text-align: center;
}

.toast-msg { flex: 1; }
.toast-action {
  background: none; border: 1px solid currentColor; color: inherit;
  padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;
  cursor: pointer; white-space: nowrap; transition: all var(--transition-fast);
}
.toast-success .toast-action { color: var(--success); }
.toast-action:hover { background: rgba(255,255,255,0.2); }

.toast-enter-active { transition: all 0.3s ease; }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from { opacity: 0; transform: translateX(80px); }
.toast-leave-to { opacity: 0; transform: translateX(80px); }

/* Collapsed sidebar */
.sidebar.collapsed { width: var(--sidebar-collapsed-width); }
.sidebar.collapsed .sidebar-brand { justify-content: center; padding: 24px 8px 20px; }
.sidebar.collapsed .sidebar-nav li a { justify-content: center; padding: 10px; }
.sidebar.collapsed .sidebar-nav li a .nav-icon { margin: 0; }
.sidebar.collapsed .sidebar-footer { padding: 16px 8px; }

.mobile-overlay { display: none; }
@media (max-width: 768px) { .mobile-overlay { display: block; } }
</style>
