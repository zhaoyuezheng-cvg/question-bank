<template>
  <div>
    <h1 style="margin-bottom: 16px;">🎯 答题练习</h1>

    <!-- Config -->
    <div v-if="!started" class="card" style="max-width: 600px;">
      <div class="card-title" style="margin-bottom: 16px;">练习设置</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">学科</label>
          <select class="form-select" v-model="config.subject">
            <option value="">全部学科</option>
            <option v-for="(label, key) in SUBJECT_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">题数</label>
          <select class="form-select" v-model.number="config.count">
            <option :value="5">5 题</option>
            <option :value="10">10 题</option>
            <option :value="20">20 题</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary" @click="startPractice" :disabled="loading">
        {{ loading ? '加载中...' : '🚀 开始练习' }}
      </button>
    </div>

    <!-- Practice -->
    <div v-else>
      <!-- Progress -->
      <div class="card" style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>第 <strong>{{ currentIndex + 1 }}</strong> / {{ questions.length }} 题</span>
          <span>
            ✅ {{ correctCount }} 正确 &nbsp;
            ❌ {{ wrongCount }} 错误 &nbsp;
            ⏱️ {{ formatTime(elapsed) }}
          </span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: ((currentIndex + 1) / questions.length * 100) + '%' }"></div>
        </div>
      </div>

      <!-- Question -->
      <div class="card" v-if="currentQ">
        <div class="q-meta">
          <span class="tag">{{ getSubjectLabel(currentQ.subject) }}</span>
          <span class="tag">{{ currentQ.category }}</span>
          <span class="diff-badge" :style="{ background: DIFFICULTY_COLORS[currentQ.difficulty] }">
            {{ getDifficultyLabel(currentQ.difficulty) }}
          </span>
        </div>

        <div class="markdown-body q-content" v-html="renderMarkdown(currentQ.content)"></div>

        <!-- Choice options -->
        <div v-if="currentQ.options?.length" class="options-list">
          <label
            v-for="(opt, oi) in currentQ.options"
            :key="oi"
            class="option-item"
            :class="{
              'selected': userAnswer === String.fromCharCode(65 + oi),
              'correct': showResult && String.fromCharCode(65 + oi) === currentQ.answer?.trim().toUpperCase(),
              'wrong': showResult && userAnswer === String.fromCharCode(65 + oi) && userAnswer !== currentQ.answer?.trim().toUpperCase()
            }"
            @click="!showResult && selectOption(String.fromCharCode(65 + oi))"
          >
            <span class="option-letter">{{ String.fromCharCode(65 + oi) }}</span>
            <span>{{ opt }}</span>
          </label>
        </div>

        <!-- Text input for non-choice -->
        <div v-else class="form-group" style="margin-top: 16px;">
          <label class="form-label">你的答案：</label>
          <textarea class="form-textarea" v-model="userAnswer" rows="3" placeholder="输入你的答案..." :disabled="showResult"></textarea>
        </div>

        <!-- Action buttons -->
        <div class="btn-group" style="margin-top: 16px;">
          <button v-if="!showResult" class="btn btn-primary" @click="submitAnswer" :disabled="!userAnswer">
            ✅ 提交答案
          </button>
          <button v-else class="btn btn-primary" @click="nextQuestion">
            {{ currentIndex < questions.length - 1 ? '👉 下一题' : '📊 查看结果' }}
          </button>
          <button v-if="!showResult" class="btn" @click="skipQuestion">⏭️ 跳过</button>
        </div>

        <!-- Result feedback -->
        <div v-if="showResult" class="result-box" :class="isCorrect ? 'result-correct' : 'result-wrong'">
          <div class="result-header">
            {{ isCorrect ? '🎉 回答正确！' : '❌ 回答错误' }}
          </div>
          <div v-if="!isCorrect" style="margin-top: 8px;">
            <strong>正确答案：</strong>
            <div class="markdown-body" v-html="renderMarkdown(currentQ.answer)"></div>
          </div>
          <div v-if="currentQ.analysis" style="margin-top: 8px;">
            <strong>解析：</strong>
            <div class="markdown-body" v-html="renderMarkdown(currentQ.analysis)"></div>
          </div>
          <div style="margin-top: 8px;">
            <button class="btn btn-sm" @click="toggleFavorite(currentQ.id)">
              {{ isFav(currentQ.id) ? '❤️ 已收藏' : '🤍 收藏' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div v-if="finished" class="card" style="text-align: center; padding: 40px;">
        <h2 style="margin-bottom: 16px;">📊 练习完成！</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-value">{{ questions.length }}</div>
            <div class="summary-label">总题数</div>
          </div>
          <div class="summary-item success">
            <div class="summary-value">{{ correctCount }}</div>
            <div class="summary-label">正确</div>
          </div>
          <div class="summary-item danger">
            <div class="summary-value">{{ wrongCount }}</div>
            <div class="summary-label">错误</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">{{ accuracy }}%</div>
            <div class="summary-label">正确率</div>
          </div>
        </div>
        <div class="btn-group" style="justify-content: center; margin-top: 24px;">
          <button class="btn btn-primary" @click="reset">🔄 再来一轮</button>
          <router-link to="/practice/errors" class="btn">📝 查看错题本</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { renderMarkdown } from '@/utils/markdown';
import { SUBJECT_LABELS, DIFFICULTY_COLORS, getSubjectLabel, getDifficultyLabel } from '@/utils/constants';

const started = ref(false);
const loading = ref(false);
const questions = ref<any[]>([]);
const currentIndex = ref(0);
const userAnswer = ref('');
const showResult = ref(false);
const isCorrect = ref(false);
const correctCount = ref(0);
const wrongCount = ref(0);
const finished = ref(false);
const elapsed = ref(0);
const favoriteIds = ref<Set<string>>(new Set());
let timer: any = null;

const config = ref({ subject: '', count: 10 });

const currentQ = computed(() => questions.value[currentIndex.value]);
const accuracy = computed(() => {
  const total = correctCount.value + wrongCount.value;
  return total > 0 ? Math.round((correctCount.value / total) * 100) : 0;
});

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

async function startPractice() {
  loading.value = true;
  try {
    const res = await fetch('/api/practice/random-paper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: config.value.subject || undefined, count: config.value.count }),
    });
    const json = await res.json();
    if (!json.success) { alert(json.error); return; }

    const paperRes = await fetch(`/api/papers/${json.data.paperId}`);
    const paperJson = await paperRes.json();
    if (paperJson.success) {
      questions.value = paperJson.data.questions;
      started.value = true;
      currentIndex.value = 0;
      correctCount.value = 0;
      wrongCount.value = 0;
      finished.value = false;
      userAnswer.value = '';
      showResult.value = false;
      elapsed.value = 0;
      timer = setInterval(() => elapsed.value++, 1000);
    }
  } finally {
    loading.value = false;
  }
}

function selectOption(letter: string) {
  userAnswer.value = letter;
}

async function submitAnswer() {
  if (!currentQ.value || !userAnswer.value) return;

  const res = await fetch('/api/practice/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questionId: currentQ.value.id,
      userAnswer: userAnswer.value,
      timeSpent: 0,
    }),
  });
  const json = await res.json();
  if (json.success) {
    isCorrect.value = json.data.isCorrect;
    if (isCorrect.value) correctCount.value++;
    else wrongCount.value++;
    showResult.value = true;
  }
}

function nextQuestion() {
  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value++;
    userAnswer.value = '';
    showResult.value = false;
    isCorrect.value = false;
  } else {
    finished.value = true;
    if (timer) clearInterval(timer);
  }
}

function skipQuestion() {
  wrongCount.value++;
  nextQuestion();
}

function isFav(qId: string) {
  return favoriteIds.value.has(qId);
}

async function toggleFavorite(qId: string) {
  if (favoriteIds.value.has(qId)) {
    await fetch(`/api/practice/favorites/${qId}`, { method: 'DELETE' });
    favoriteIds.value.delete(qId);
  } else {
    await fetch('/api/practice/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: qId }),
    });
    favoriteIds.value.add(qId);
  }
}

function reset() {
  started.value = false;
  finished.value = false;
  if (timer) clearInterval(timer);
}

onUnmounted(() => { if (timer) clearInterval(timer); });
</script>

<style scoped>
.q-meta { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.q-content { font-size: 16px; margin-bottom: 16px; }

.options-list { display: flex; flex-direction: column; gap: 8px; margin: 16px 0; }
.option-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border: 2px solid var(--border);
  border-radius: var(--radius); cursor: pointer; transition: all 0.2s;
}
.option-item:hover { border-color: var(--primary-light); }
.option-item.selected { border-color: var(--primary); background: #eef2ff; }
.option-item.correct { border-color: var(--success); background: #f0fdf4; }
.option-item.wrong { border-color: var(--danger); background: #fef2f2; }
.option-letter {
  width: 28px; height: 28px; border-radius: 50%;
  background: #f1f5f9; display: flex; align-items: center;
  justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0;
}

.progress-bar { height: 6px; background: #e2e8f0; border-radius: 3px; margin-top: 8px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--primary); border-radius: 3px; transition: width 0.3s; }

.result-box { margin-top: 16px; padding: 16px; border-radius: var(--radius); }
.result-correct { background: #f0fdf4; border-left: 4px solid var(--success); }
.result-wrong { background: #fef2f2; border-left: 4px solid var(--danger); }
.result-header { font-size: 18px; font-weight: 600; }

.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; }
.summary-item { text-align: center; padding: 16px; background: #f1f5f9; border-radius: var(--radius); }
.summary-item.success { background: #f0fdf4; }
.summary-item.danger { background: #fef2f2; }
.summary-value { font-size: 32px; font-weight: 700; color: var(--primary); }
.summary-item.success .summary-value { color: var(--success); }
.summary-item.danger .summary-value { color: var(--danger); }
.summary-label { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
</style>
