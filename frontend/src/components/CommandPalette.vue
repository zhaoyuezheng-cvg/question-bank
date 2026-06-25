<template>
  <Teleport to="body">
    <Transition name="palette">
      <div v-if="visible" class="palette-overlay" @click.self="close">
        <div class="palette-dialog">
          <div class="palette-input-wrap">
            <span class="palette-icon">🔍</span>
            <input
              ref="inputRef"
              v-model="query"
              class="palette-input"
              placeholder="搜索题目、试卷..."
              @keydown.down.prevent="moveDown"
              @keydown.up.prevent="moveUp"
              @keydown.enter.prevent="selectCurrent"
              @keydown.escape.prevent="close"
            />
            <kbd class="palette-kbd">ESC</kbd>
          </div>
          <div class="palette-results" v-if="results.length">
            <div
              v-for="(item, idx) in results"
              :key="item.id"
              class="palette-item"
              :class="{ active: idx === activeIndex }"
              @click="navigateTo(item)"
              @mouseenter="activeIndex = idx"
            >
              <span class="palette-item-icon">{{ item.icon }}</span>
              <div class="palette-item-body">
                <div class="palette-item-title">{{ item.title }}</div>
                <div class="palette-item-desc" v-if="item.desc">{{ item.desc }}</div>
              </div>
              <span class="palette-item-tag" v-if="item.tag">{{ item.tag }}</span>
            </div>
          </div>
          <div v-else-if="query.length >= 2" class="palette-empty">
            没有找到相关结果
          </div>
          <div v-else class="palette-hint">
            输入关键词搜索题目和试卷
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { SUBJECT_LABELS, QUESTION_TYPE_LABELS, getSubjectLabel, getTypeLabel } from '@/utils/constants';
import type { Subject, QuestionType } from 'shared/src/index';

const visible = ref(false);
const query = ref('');
const activeIndex = ref(0);
const results = ref<{ id: string; icon: string; title: string; desc?: string; tag?: string; route: string }[]>([]);
const inputRef = ref<HTMLInputElement>();
const router = useRouter();

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function open() {
  visible.value = true;
  query.value = '';
  results.value = [];
  activeIndex.value = 0;
  nextTick(() => inputRef.value?.focus());
}

function close() {
  visible.value = false;
}

// Global ⌘K listener
function globalHandler(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    visible.value ? close() : open();
  }
}
onMounted(() => window.addEventListener('keydown', globalHandler));
onUnmounted(() => window.removeEventListener('keydown', globalHandler));

// Search
watch(query, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  if (val.length < 2) { results.value = []; return; }
  debounceTimer = setTimeout(() => search(val), 250);
});

async function search(q: string) {
  try {
    const [qRes, pRes] = await Promise.all([
      fetch(`/api/questions?keyword=${encodeURIComponent(q)}&pageSize=8`),
      fetch(`/api/papers?pageSize=5`),
    ]);
    const qJson = await qRes.json();
    const pJson = await pRes.json();

    const items: typeof results.value = [];

    if (qJson.success) {
      for (const item of qJson.data.items) {
        items.push({
          id: item.id,
          icon: '📝',
          title: item.content.slice(0, 80).replace(/\n/g, ' '),
          desc: `${getSubjectLabel(item.subject as Subject)} · ${getTypeLabel(item.type as QuestionType)}`,
          tag: item.category,
          route: `/questions/${item.id}/edit`,
        });
      }
    }

    if (pJson.success) {
      for (const p of pJson.data.items) {
        if (p.title.toLowerCase().includes(q.toLowerCase())) {
          items.push({
            id: p.id,
            icon: '📄',
            title: p.title,
            desc: p.description || undefined,
            tag: getSubjectLabel(p.subject as Subject),
            route: `/papers/${p.id}`,
          });
        }
      }
    }

    results.value = items;
    activeIndex.value = 0;
  } catch {}
}

function moveDown() {
  if (activeIndex.value < results.value.length - 1) activeIndex.value++;
}
function moveUp() {
  if (activeIndex.value > 0) activeIndex.value--;
}
function selectCurrent() {
  if (results.value[activeIndex.value]) {
    navigateTo(results.value[activeIndex.value]);
  }
}
function navigateTo(item: typeof results.value[0]) {
  router.push(item.route);
  close();
}
</script>

<style scoped>
.palette-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  justify-content: center;
  padding-top: 15vh;
}

.palette-dialog {
  width: 560px;
  max-height: 420px;
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.palette-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.palette-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.palette-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  background: transparent;
  color: var(--text);
}

.palette-input::placeholder {
  color: var(--text-muted);
}

.palette-kbd {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg);
  color: var(--text-muted);
  border: 1px solid var(--border);
  font-family: inherit;
}

.palette-results {
  overflow-y: auto;
  padding: 8px;
}

.palette-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.1s;
}

.palette-item.active,
.palette-item:hover {
  background: var(--primary-50);
}

.palette-item-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.palette-item-body {
  flex: 1;
  min-width: 0;
}

.palette-item-title {
  font-size: 14px;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.palette-item-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.palette-item-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--primary-50);
  color: var(--primary);
  flex-shrink: 0;
}

.palette-empty,
.palette-hint {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
}

/* Transition */
.palette-enter-active { transition: opacity 0.15s ease; }
.palette-leave-active { transition: opacity 0.1s ease; }
.palette-enter-from,
.palette-leave-to { opacity: 0; }
.palette-enter-active .palette-dialog { animation: slideUp 0.2s ease; }
</style>
