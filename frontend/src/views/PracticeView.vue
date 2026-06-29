<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">🎯</span>
        答题练习
      </h1>
    </div>

    <!-- Config -->
    <div v-if="!started" class="practice-home">
      <div class="card" style="max-width: 560px;">
        <div class="card-header">
          <span class="card-title">⚙️ 练习设置</span>
        </div>
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
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">细分题型（阅读理解专项）</label>
            <select class="form-select" v-model="config.subType">
              <option value="">全部题型</option>
              <option v-for="st in availableSubTypes" :key="st" :value="st">{{ getSubTypeLabel(st) }}</option>
            </select>
          </div>
        </div>
        <div class="form-group" style="margin-top: 8px;">
          <label class="form-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" v-model="errorOnly" />
            <span>🎯 只练错题 / 未掌握题目</span>
          </label>
        </div>
        <div class="form-group">
          <label class="form-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" v-model="adaptiveMode" />
            <span>🧠 自适应难度（根据答题表现自动调整）</span>
          </label>
          <div v-if="adaptiveMode && recommendInfo" style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; padding-left: 24px;">
            推荐难度：<strong>{{ getDifficultyLabel(recommendInfo.recommended as Difficulty) }}</strong> — {{ recommendInfo.reason }}
          </div>
        </div>
        <button class="btn btn-primary btn-lg" @click="startPractice" :disabled="loading" style="width: 100%; margin-top: 8px;">
          {{ loading ? '加载中...' : '🚀 开始练习' }}
        </button>
        <div class="shortcut-hint" style="margin-top: 12px; font-size: 12px; color: var(--text-muted);">
          ⌨️ 快捷键：<kbd>A</kbd><kbd>B</kbd><kbd>C</kbd><kbd>D</kbd> 选答案 · <kbd>Enter</kbd> 提交/下一题
        </div>
      </div>

      <!-- History Chart -->
      <div v-if="history.length" class="card" style="margin-top: 16px;">
        <div class="card-header">
          <span class="card-title">📈 答题趋势（近 {{ history.length }} 天）</span>
        </div>
        <div ref="historyChartRef" class="history-chart"></div>
      </div>
    </div>

    <!-- Practice -->
    <div v-else>
      <!-- Progress -->
      <div class="card" style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-weight: 600;">{{ errorOnly ? "🎯 错题练习 " : "" }}第 <strong style="color: var(--primary);">{{ currentIndex + 1 }}</strong> / {{ questions.length }} 题</span>
          <div style="display: flex; gap: 16px; font-size: 13px; color: var(--text-secondary);">
            <span>✅ {{ correctCount }}</span>
            <span>❌ {{ wrongCount }}</span>
            <span>⏱️ {{ formatTime(elapsed) }}</span>
            <button class="btn btn-sm" @click="togglePause" style="padding: 2px 8px; font-size: 11px;">{{ paused ? '▶️ 继续' : '⏸ 暂停' }}</button>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: ((currentIndex + 1) / questions.length * 100) + '%' }"></div>
        </div>
      </div>

      <!-- Question -->
      <div class="card" v-if="currentQ && !showReview">
        <div class="q-meta">
          <span class="tag" :style="{ background: SUBJECT_COLORS[currentQ.subject as Subject] + '18', color: SUBJECT_COLORS[currentQ.subject as Subject] }">
            {{ getSubjectLabel(currentQ.subject as Subject) }}
          </span>
          <span class="tag">{{ currentQ.category }}</span>
          <span class="diff-badge" :style="{ background: DIFFICULTY_COLORS[currentQ.difficulty as Difficulty] }">
            {{ getDifficultyLabel(currentQ.difficulty) }}
          </span>
        </div>

        <div style="display: flex; align-items: flex-start; gap: 8px;">
          <div class="markdown-body q-content" v-html="renderMarkdown(currentQ.content)" style="flex: 1;"></div>
          <button v-if="tts.supported" class="btn btn-sm btn-ghost" @click="tts.speak(currentQ.content)" :title="tts.speaking ? '停止朗读' : '朗读题目'">
            {{ tts.speaking ? '🔊' : '🔈' }}
          </button>
        </div>

        <!-- Choice options -->
        <div v-if="currentQ.options?.length" class="options-list">
          <label
            v-for="(opt, oi) in (shuffledOptions[currentIndex] || currentQ.options)"
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
          <textarea class="form-textarea" v-model="userAnswer" rows="3" placeholder="输入你的答案... (Enter 提交)" :disabled="showResult"></textarea>
        </div>

        <!-- Action buttons -->
        <div class="btn-group" style="margin-top: 20px;">
          <button v-if="!showResult" class="btn btn-primary" @click="submitAnswer" :disabled="!userAnswer">
            ✅ 提交答案 <kbd style="margin-left: 4px; font-size: 11px;">Enter</kbd>
          </button>
          <button v-else class="btn btn-primary" @click="nextQuestion">
            {{ currentIndex < questions.length - 1 ? '👉 下一题' : '📊 查看结果' }} <kbd style="margin-left: 4px; font-size: 11px;">Enter</kbd>
          </button>
          <button v-if="!showResult" class="btn" @click="skipQuestion">⏭️ 跳过</button>
        </div>

        <!-- Result feedback -->
        <div v-if="showResult" class="result-box" :class="isCorrect ? 'result-correct' : 'result-wrong'">
          <div class="result-header">
            {{ isCorrect ? '🎉 回答正确！' : '❌ 回答错误' }}
          </div>
          <div v-if="!isCorrect" style="margin-top: 10px;">
            <strong>正确答案：</strong>
            <div class="markdown-body" v-html="renderMarkdown(currentQ.answer)"></div>
          </div>
          <div v-if="currentQ.analysis" style="margin-top: 10px;">
            <strong>解析：</strong>
            <div class="markdown-body" v-html="renderMarkdown(currentQ.analysis)"></div>
          </div>
          <div style="margin-top: 12px; display: flex; gap: 8px;">
            <button class="btn btn-sm" :class="{ 'btn-primary': isFav(currentQ.id) }" @click="toggleFavorite(currentQ.id)">
              {{ isFav(currentQ.id) ? '❤️ 已收藏' : '🤍 收藏' }}
            </button>
            <button class="btn btn-sm" @click="addToFlashcard(currentQ.id)">🃏 加入闪卡</button>
            <button class="btn btn-sm" @click="toggleNote()">📝 笔记</button>
          </div>
          <!-- 笔记输入 -->
          <div v-if="showNote" style="margin-top: 12px;">
            <textarea class="form-textarea" v-model="noteContent" rows="3" placeholder="记录你的理解、易错点、解题思路..." style="font-size: 13px;"></textarea>
            <div style="display: flex; gap: 8px; margin-top: 8px;">
              <button class="btn btn-sm btn-primary" @click="saveNote(currentQ.id)">💾 保存笔记</button>
              <button v-if="noteContent" class="btn btn-sm btn-ghost" style="color: var(--danger);" @click="deleteNote(currentQ.id)">删除</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div v-if="finished && !showReview" class="card summary-card">
        <h2 style="margin-bottom: 8px; font-size: 24px;">📊 练习完成！</h2>
        <p style="color: var(--text-secondary); margin-bottom: 24px;">来看看你的成绩吧</p>
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
          <div class="summary-item" :class="accuracy >= 80 ? 'success' : accuracy >= 60 ? '' : 'danger'">
            <div class="summary-value">{{ accuracy }}%</div>
            <div class="summary-label">正确率</div>
          </div>
        </div>
        <div class="btn-group" style="justify-content: center; margin-top: 24px;">
          <button class="btn btn-primary" @click="showReview = true">📋 回顾答题</button>
          <button class="btn" @click="reset">🔄 再来一轮</button>
          <router-link to="/practice/errors" class="btn">📝 查看错题本</router-link>
        </div>
      </div>

      <!-- Review Mode -->
      <div v-if="finished && showReview">
        <div class="card" style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="card-title">📋 答题回顾</span>
            <button class="btn btn-sm" @click="showReview = false">返回汇总</button>
          </div>
        </div>
        <div v-for="(q, idx) in questions" :key="q.id" class="card review-item" :class="reviewResults[idx]?.isCorrect ? 'review-correct' : 'review-wrong'">
          <div class="review-header">
            <span class="review-num">{{ idx + 1 }}.</span>
            <span :class="reviewResults[idx]?.isCorrect ? 'text-success' : 'text-danger'">{{ reviewResults[idx]?.isCorrect ? '✅ 正确' : '❌ 错误' }}</span>
            <button class="btn btn-sm" style="margin-left: auto;" :class="{ 'btn-primary': isFav(q.id) }" @click="toggleFavorite(q.id)">
              {{ isFav(q.id) ? '❤️' : '🤍' }}
            </button>
          </div>
          <div class="markdown-body" style="margin-top: 8px;" v-html="renderMarkdown(q.content)"></div>
          <div v-if="q.options?.length" class="review-options" style="margin-top: 8px;">
            <span v-for="(opt, oi) in q.options" :key="oi" class="review-opt" :class="{
              'opt-correct': q.answer?.trim().toUpperCase() === String.fromCharCode(65 + oi),
              'opt-wrong': reviewResults[idx]?.userAnswer === String.fromCharCode(65 + oi) && !reviewResults[idx]?.isCorrect
            }">{{ String.fromCharCode(65 + oi) }}. {{ opt }}</span>
          </div>
          <div style="margin-top: 8px; display: flex; gap: 6px;">
            <button class="btn btn-sm" @click="addToFlashcard(q.id)">🃏 闪卡</button>
          </div>
          <div v-if="!reviewResults[idx]?.isCorrect" style="margin-top: 8px; font-size: 13px;">
            <div><strong>你的答案：</strong>{{ reviewResults[idx]?.userAnswer || '未作答' }}</div>
            <div style="color: var(--success);"><strong>正确答案：</strong>{{ q.answer }}</div>
          </div>
          <div v-if="q.analysis" style="margin-top: 8px; font-size: 13px; color: var(--text-secondary);">
            <strong>解析：</strong>{{ q.analysis }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, inject, watch } from 'vue';
import { useRoute } from 'vue-router';
import * as echarts from 'echarts';
import { renderMarkdown } from '@/utils/markdown';
import { SUBJECT_LABELS, SUBJECT_COLORS, DIFFICULTY_COLORS, getSubjectLabel, getDifficultyLabel, getSubTypesForSubject, getSubTypeLabel, READING_SUB_TYPES } from '@/utils/constants';
import type { Subject, Difficulty } from 'shared/src/index';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api';
import { useTTS } from '@/composables/useTTS';

const started = ref(false);
const history = ref<{ date: string; total: number; correct: number; accuracy: number }[]>([]);
const historyChartRef = ref<HTMLElement>();
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
const showReview = ref(false);
const reviewResults = ref<Record<number, { isCorrect: boolean; userAnswer: string }>>({});
const errorOnly = ref(false);
const adaptiveMode = ref(false);
const showNote = ref(false);
const noteContent = ref('');
const recommendInfo = ref<{ recommended: number; reason: string; accuracy: number | null } | null>(null);
const availableSubTypes = computed(() => config.value.subject ? getSubTypesForSubject(config.value.subject) : Object.keys(READING_SUB_TYPES));
const paused = ref(false);
const shuffledOptions = ref<Record<number, string[]>>({});
const toast = inject<(type: string, msg: string) => void>('toast')!;
const tts = useTTS();
let timer: any = null;

const route = useRoute();
const config = ref({ subject: '', count: 10, category: '', subCategory: '', subType: '' });

// 加载推荐难度
async function loadRecommendation() {
  if (!adaptiveMode.value) { recommendInfo.value = null; return; }
  try {
    const params = config.value.subject ? `?subject=${config.value.subject}` : '';
    const json = await apiGet(`/practice/recommended-difficulty${params}`);
    if (json.success) recommendInfo.value = json.data;
  } catch {}
}

watch(adaptiveMode, (v) => { if (v) loadRecommendation(); });
watch(() => config.value.subject, () => { if (adaptiveMode.value) loadRecommendation(); });

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

function shuffleArray(arr: string[]): string[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function togglePause() {
  paused.value = !paused.value;
  if (paused.value) {
    if (timer) clearInterval(timer);
  } else {
    timer = setInterval(() => elapsed.value++, 1000);
  }
}

async function startPractice() {
  loading.value = true;
  try {
    const body: any = { subject: config.value.subject || undefined, count: config.value.count, category: config.value.category || undefined, subCategory: config.value.subCategory || undefined, subType: config.value.subType || undefined };
    if (errorOnly.value) body.errorOnly = true;
    if (adaptiveMode.value) body.adaptive = true;
    const json = await apiPost('/practice/random-paper', body);
    if (!json.success) { toast('error', json.error || '没有符合条件的题目'); return; }

    const paperJson = await apiGet(`/papers/${json.data.paperId}`);
    if (paperJson.success) {
      questions.value = paperJson.data.questions;
      started.value = true;
      currentIndex.value = 0;
      // Shuffle options for choice questions
      const shuffled: Record<number, string[]> = {};
      paperJson.data.questions.forEach((q: any, i: number) => {
        if (q.options?.length) shuffled[i] = shuffleArray(q.options);
      });
      shuffledOptions.value = shuffled;
      correctCount.value = 0;
      wrongCount.value = 0;
      finished.value = false;
      showReview.value = false;
      reviewResults.value = {};
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

  const json = await apiPost('/practice/submit', {
    questionId: currentQ.value.id,
    userAnswer: userAnswer.value,
    timeSpent: 0,
  });
  if (json.success) {
    isCorrect.value = json.data.isCorrect;
    if (isCorrect.value) correctCount.value++;
    else wrongCount.value++;
    reviewResults.value[currentIndex.value] = { isCorrect: isCorrect.value, userAnswer: userAnswer.value };
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
  reviewResults.value[currentIndex.value] = { isCorrect: false, userAnswer: '' };
  wrongCount.value++;
  nextQuestion();
}

function isFav(qId: string) {
  return favoriteIds.value.has(qId);
}

async function toggleFavorite(qId: string) {
  if (favoriteIds.value.has(qId)) {
    await apiDelete(`/practice/favorites/${qId}`);
    favoriteIds.value.delete(qId);
  } else {
    await apiPost('/practice/favorites', { questionId: qId });
    favoriteIds.value.add(qId);
  }
}

async function addToFlashcard(questionId: string) {
  await apiPost('/flashcards/add', { questionId });
  toast('success', '已加入闪卡');
}

async function toggleNote() {
  showNote.value = !showNote.value;
  if (showNote.value && currentQ.value) {
    // 加载已有笔记
    const json = await apiGet(`/practice/notes/${currentQ.value.id}`);
    noteContent.value = json.data?.content || '';
  }
}

async function saveNote(questionId: string) {
  if (!noteContent.value.trim()) { toast('error', '笔记内容不能为空'); return; }
  await apiPut(`/practice/notes/${questionId}`, { content: noteContent.value });
  toast('success', '笔记已保存');
}

async function deleteNote(questionId: string) {
  await apiDelete(`/practice/notes/${questionId}`);
  noteContent.value = '';
  showNote.value = false;
  toast('success', '笔记已删除');
}

// Keyboard shortcuts
function handleKeydown(e: KeyboardEvent) {
  if (!started.value || finished.value) return;
  if ((e.target as HTMLElement)?.tagName === 'TEXTAREA' || (e.target as HTMLElement)?.tagName === 'INPUT') return;

  if (!showResult.value) {
    if (currentQ.value?.options?.length) {
      const key = e.key.toUpperCase();
      if (key >= 'A' && key <= 'D') {
        const idx = key.charCodeAt(0) - 65;
        if (idx < currentQ.value.options.length) {
          userAnswer.value = key;
          e.preventDefault();
        }
      }
    }
    if (e.key === 'Enter' && userAnswer.value) {
      submitAnswer();
      e.preventDefault();
    }
  } else {
    if (e.key === 'Enter' || e.key === ' ') {
      nextQuestion();
      e.preventDefault();
    }
  }
}

function reset() {
  started.value = false;
  finished.value = false;
  showReview.value = false;
  reviewResults.value = {};
  if (timer) clearInterval(timer);
}

async function loadHistory() {
  try {
    const json = await apiGet('/practice/history?days=14');
    if (json.success) {
      history.value = json.data;
      await nextTick();
      initHistoryChart();
    }
  } catch {}
}

let historyChart: echarts.ECharts | null = null;
let historyResizeHandler: (() => void) | null = null;

function initHistoryChart() {
  if (!historyChartRef.value || !history.value.length) return;
  historyChart = echarts.init(historyChartRef.value);
  historyChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['答题数', '正确率'], bottom: 0 },
    xAxis: { type: 'category', data: history.value.map(h => h.date.slice(5)), axisLabel: { fontSize: 11 } },
    yAxis: [
      { type: 'value', name: '题数', minInterval: 1 },
      { type: 'value', name: '正确率%', max: 100, axisLabel: { formatter: '{value}%' } },
    ],
    series: [
      {
        name: '答题数',
        type: 'bar',
        data: history.value.map(h => h.total),
        itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] },
        barWidth: '40%',
      },
      {
        name: '正确率',
        type: 'line',
        yAxisIndex: 1,
        data: history.value.map(h => h.accuracy),
        smooth: true,
        lineStyle: { color: '#10b981', width: 2 },
        itemStyle: { color: '#10b981' },
        areaStyle: { color: 'rgba(16,185,129,0.1)' },
      },
    ],
    grid: { left: 50, right: 50, top: 20, bottom: 40 },
  });
  historyResizeHandler = () => historyChart?.resize();
  window.addEventListener('resize', historyResizeHandler);
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (started.value && !finished.value) {
    e.preventDefault();
    e.returnValue = '';
  }
}

onMounted(() => { loadHistory(); window.addEventListener('keydown', handleKeydown); window.addEventListener('beforeunload', handleBeforeUnload); });
onUnmounted(() => {
  if (timer) clearInterval(timer);
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('beforeunload', handleBeforeUnload);
  if (historyResizeHandler) window.removeEventListener('resize', historyResizeHandler);
  historyChart?.dispose();
  historyChart = null;
});
</script>

<style scoped>
.q-meta { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.q-content { font-size: 16px; margin-bottom: 16px; }

.options-list { display: flex; flex-direction: column; gap: 8px; margin: 16px 0; }
.option-item {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 18px; border: 2px solid var(--border);
  border-radius: var(--radius); cursor: pointer; transition: all var(--transition-fast);
}
.option-item:hover { border-color: var(--primary-light); background: var(--primary-50); }
.option-item.selected { border-color: var(--primary); background: var(--primary-50); }
.option-item.correct { border-color: var(--success); background: var(--success-light); }
.option-item.wrong { border-color: var(--danger); background: var(--danger-light); }
.option-letter {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--bg); display: flex; align-items: center;
  justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0;
  transition: all var(--transition-fast);
}
.option-item.selected .option-letter { background: var(--primary); color: white; }
.option-item.correct .option-letter { background: var(--success); color: white; }
.option-item.wrong .option-letter { background: var(--danger); color: white; }

.progress-bar { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--primary-light)); border-radius: 4px; transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1); }

.result-box { margin-top: 20px; padding: 20px; border-radius: var(--radius-lg); }
.result-correct { background: var(--success-light); border-left: 4px solid var(--success); }
.result-wrong { background: var(--danger-light); border-left: 4px solid var(--danger); }
.result-header { font-size: 18px; font-weight: 700; }

.summary-card { text-align: center; padding: 48px; }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; max-width: 500px; margin-left: auto; margin-right: auto; }
.summary-item { text-align: center; padding: 20px; background: var(--bg); border-radius: var(--radius-lg); }
.summary-item.success { background: var(--success-light); }
.summary-item.danger { background: var(--danger-light); }
.summary-value { font-size: 36px; font-weight: 800; color: var(--primary); }
.summary-item.success .summary-value { color: var(--success); }
.summary-item.danger .summary-value { color: var(--danger); }
.summary-label { font-size: 13px; color: var(--text-secondary); margin-top: 4px; font-weight: 500; }

.practice-home { max-width: 800px; }
.history-chart { width: 100%; height: 220px; }

/* Review Mode */
.review-item { margin-bottom: 12px; }
.review-correct { border-left: 4px solid var(--success); }
.review-wrong { border-left: 4px solid var(--danger); }
.review-header { display: flex; align-items: center; gap: 8px; font-weight: 600; }
.review-num { font-size: 16px; }
.review-options { display: flex; flex-direction: column; gap: 4px; }
.review-opt { padding: 6px 12px; border-radius: var(--radius); font-size: 13px; }
.review-opt.opt-correct { background: var(--success-light); color: var(--success); font-weight: 600; }
.review-opt.opt-wrong { background: var(--danger-light); color: var(--danger); text-decoration: line-through; }

kbd {
  display: inline-block; padding: 2px 6px; font-size: 11px; font-family: monospace;
  background: var(--bg); border: 1px solid var(--border); border-radius: 4px;
  box-shadow: 0 1px 0 var(--border);
}
</style>
