<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">🃏</span>
        闪卡记忆
      </h1>
      <div class="btn-group">
        <button class="btn" :class="{ 'btn-primary': mode === 'study' }" @click="mode = 'study'">📖 学习</button>
        <button class="btn" :class="{ 'btn-primary': mode === 'manage' }" @click="mode = 'manage'">⚙️ 管理</button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-mini">
        <span class="stat-mini-value">{{ stats.total }}</span>
        <span class="stat-mini-label">总卡片</span>
      </div>
      <div class="stat-mini">
        <span class="stat-mini-value" style="color: var(--warning);">{{ stats.due }}</span>
        <span class="stat-mini-label">待复习</span>
      </div>
      <div class="stat-mini">
        <span class="stat-mini-value" style="color: var(--success);">{{ stats.mastered }}</span>
        <span class="stat-mini-label">已掌握</span>
      </div>
      <div class="stat-mini">
        <span class="stat-mini-value" style="color: var(--primary);">{{ stats.learning }}</span>
        <span class="stat-mini-label">学习中</span>
      </div>
    </div>

    <!-- Study Mode -->
    <div v-if="mode === 'study'">
      <div v-if="!dueCards.length" class="empty-state">
        <div class="empty-state-icon">🎉</div>
        <p>今日复习已完成！</p>
        <button class="btn btn-primary" style="margin-top: 16px;" @click="loadDue">🔄 刷新</button>
      </div>

      <div v-else-if="!showAnswer" class="card flashcard-card">
        <div class="flashcard-progress">
          {{ currentCardIdx + 1 }} / {{ dueCards.length }}
        </div>
        <div class="flashcard-content markdown-body" v-html="renderMarkdown(currentCard?.question?.content || '')"></div>
        <button class="btn btn-primary btn-lg" style="width: 100%; margin-top: 24px;" @click="showAnswer = true">
          👁️ 显示答案
        </button>
      </div>

      <div v-else class="card flashcard-card">
        <div class="flashcard-answer">
          <div class="flashcard-label">答案</div>
          <div class="markdown-body" v-html="renderMarkdown(currentCard?.question?.answer || '')"></div>
        </div>
        <div v-if="currentCard?.question?.analysis" class="flashcard-answer" style="margin-top: 12px;">
          <div class="flashcard-label" style="color: var(--primary);">解析</div>
          <div class="markdown-body" v-html="renderMarkdown(currentCard.question.analysis)"></div>
        </div>

        <div class="flashcard-rate" style="margin-top: 24px;">
          <div class="flashcard-rate-label">你记得怎么样？（快捷键 1/2/3/4）</div>
          <div class="rate-buttons">
            <button class="rate-btn rate-again" @click="rate(0)">😵<br>忘了 <kbd>1</kbd></button>
            <button class="rate-btn rate-hard" @click="rate(2)">😐<br>困难 <kbd>2</kbd></button>
            <button class="rate-btn rate-good" @click="rate(4)">😊<br>记得 <kbd>3</kbd></button>
            <button class="rate-btn rate-easy" @click="rate(5)">🤩<br>简单 <kbd>4</kbd></button>
          </div>
          <div style="margin-top: 10px; font-size: 11px; color: var(--text-muted);">← → 切卡 · Space 显示答案</div>
        </div>
      </div>
    </div>

    <!-- Manage Mode -->
    <div v-if="mode === 'manage'">
      <div class="card">
        <div class="card-header">
          <span class="card-title">添加题目到闪卡</span>
        </div>
        <div class="form-row">
          <div class="form-group">
            <select class="form-select" v-model="addSubject">
              <option value="">全部学科</option>
              <option v-for="(label, key) in SUBJECT_LABELS" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div class="form-group" style="flex: 1;">
            <input class="form-input" v-model="addKeyword" placeholder="搜索题目..." @keyup.enter="searchForAdd" />
          </div>
          <button class="btn btn-primary" @click="searchForAdd">搜索</button>
        </div>

        <div v-if="searchResults.length" class="search-results">
          <div v-for="q in searchResults" :key="q.id" class="search-item">
            <div class="search-item-content">{{ q.content.slice(0, 100) }}</div>
            <button class="btn btn-sm" @click="addToFlashcard(q.id)" :disabled="addedIds.has(q.id)">
              {{ addedIds.has(q.id) ? '✅ 已添加' : '➕ 添加' }}
            </button>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top: 16px;">
        <div class="card-title" style="margin-bottom: 12px;">📋 已有卡片</div>
        <div v-if="!allCards.length" class="empty-state" style="padding: 24px;">
          <p>暂无闪卡，从上方添加题目</p>
        </div>
        <div v-else class="card-list">
          <div v-for="c in allCards" :key="c.id" class="card-item">
            <div class="card-item-content">{{ c.question?.content?.slice(0, 80) }}</div>
            <div class="card-item-meta">
              <span class="tag">{{ getSubjectLabel(c.question?.subject) }}</span>
              <span style="font-size: 12px; color: var(--text-muted);">间隔: {{ c.interval }}天</span>
            </div>
            <button class="btn btn-sm btn-danger" @click="removeFlashcard(c.id)">移除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { renderMarkdown } from '@/utils/markdown';
import { SUBJECT_LABELS, getSubjectLabel } from '@/utils/constants';
import { apiGet, apiPost, apiDelete } from '@/utils/api';

const mode = ref<'study' | 'manage'>('study');
const dueCards = ref<any[]>([]);
const allCards = ref<any[]>([]);
const currentCardIdx = ref(0);
const showAnswer = ref(false);
const stats = ref({ total: 0, due: 0, mastered: 0, learning: 0 });
const addSubject = ref('');
const addKeyword = ref('');
const searchResults = ref<any[]>([]);
const addedIds = ref<Set<string>>(new Set());

const currentCard = computed(() => dueCards.value[currentCardIdx.value]);

async function loadDue() {
  const json = await apiGet('/flashcards/due?limit=30');
  if (json.success) dueCards.value = json.data;
  showAnswer.value = false;
  currentCardIdx.value = 0;
}

async function loadStats() {
  const json = await apiGet('/flashcards/stats');
  if (json.success) stats.value = json.data;
}

async function loadAll() {
  const json = await apiGet('/flashcards/due?limit=999');
  if (json.success) allCards.value = json.data;
}

async function rate(quality: number) {
  const card = currentCard.value;
  if (!card) return;

  await apiPost(`/flashcards/${card.id}/review`, { quality });

  if (currentCardIdx.value < dueCards.value.length - 1) {
    currentCardIdx.value++;
    showAnswer.value = false;
  } else {
    await loadDue();
    await loadStats();
  }
}

async function searchForAdd() {
  const params = new URLSearchParams({ pageSize: '20' });
  if (addSubject.value) params.set('subject', addSubject.value);
  if (addKeyword.value) params.set('keyword', addKeyword.value);
  const json = await apiGet(`/questions?${params}`);
  if (json.success) searchResults.value = json.data.items;
}

async function addToFlashcard(questionId: string) {
  await apiPost('/flashcards/add', { questionId });
  addedIds.value.add(questionId);
  await loadStats();
}

async function removeFlashcard(id: string) {
  await apiDelete(`/flashcards/${id}`);
  await loadAll();
  await loadStats();
}

function navigateCard(dir: number) {
  const newIdx = currentCardIdx.value + dir;
  if (newIdx >= 0 && newIdx < dueCards.value.length) {
    currentCardIdx.value = newIdx;
    showAnswer.value = false;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (mode.value !== 'study') return;
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  if (e.key === '1') { e.preventDefault(); rate(0); }
  else if (e.key === '2') { e.preventDefault(); rate(2); }
  else if (e.key === '3') { e.preventDefault(); rate(4); }
  else if (e.key === '4') { e.preventDefault(); rate(5); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); navigateCard(-1); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); navigateCard(1); }
  else if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (!showAnswer.value) showAnswer.value = true;
  }
}

onMounted(() => {
  loadDue();
  loadStats();
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.stats-row { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.stat-mini { flex: 1; min-width: 100px; padding: 16px; background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow); text-align: center; border: 1px solid var(--border-light); }
.stat-mini-value { display: block; font-size: 28px; font-weight: 800; color: var(--primary); }
.stat-mini-label { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

.flashcard-card { max-width: 600px; margin: 0 auto; padding: 32px; text-align: center; }
.flashcard-progress { font-size: 13px; color: var(--text-muted); margin-bottom: 20px; }
.flashcard-content { font-size: 18px; line-height: 1.8; min-height: 120px; display: flex; align-items: center; justify-content: center; }
.flashcard-answer { text-align: left; padding: 16px; background: var(--bg); border-radius: var(--radius); }
.flashcard-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--success); margin-bottom: 8px; }

.flashcard-rate-label { font-size: 14px; color: var(--text-secondary); margin-bottom: 12px; }
.rate-buttons { display: flex; gap: 12px; justify-content: center; }
.rate-btn {
  flex: 1; padding: 16px 8px; border: 2px solid var(--border); border-radius: var(--radius-lg);
  background: var(--bg-card); cursor: pointer; font-size: 14px; transition: all var(--transition-fast);
  text-align: center;
}
.rate-btn:hover { transform: translateY(-2px); }
.rate-again:hover { border-color: var(--danger); background: var(--danger-light); }
.rate-hard:hover { border-color: var(--warning); background: var(--warning-light); }
.rate-good:hover { border-color: var(--success); background: var(--success-light); }
.rate-easy:hover { border-color: var(--primary); background: var(--primary-50); }

.search-results { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
.search-item { display: flex; align-items: center; gap: 12px; padding: 10px; border: 1px solid var(--border); border-radius: var(--radius); }
.search-item-content { flex: 1; font-size: 13px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.card-list { display: flex; flex-direction: column; gap: 8px; }
.card-item { display: flex; align-items: center; gap: 12px; padding: 10px; border: 1px solid var(--border-light); border-radius: var(--radius); }
.card-item-content { flex: 1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-item-meta { display: flex; gap: 6px; align-items: center; }
</style>
