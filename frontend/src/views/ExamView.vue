<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">📋</span>
        考试模拟
      </h1>
    </div>

    <!-- Select Paper -->
    <div v-if="!session" class="card" style="max-width: 700px;">
      <div class="card-header">
        <span class="card-title">📝 选择试卷</span>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">学科</label>
          <select class="form-select" v-model="filterSubject" @change="loadPapers">
            <option value="">全部学科</option>
            <option v-for="(label, key) in SUBJECT_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">时间限制（分钟）</label>
          <select class="form-select" v-model.number="timeLimit">
            <option :value="30">30 分钟</option>
            <option :value="60">60 分钟</option>
            <option :value="90">90 分钟</option>
            <option :value="120">120 分钟</option>
          </select>
        </div>
      </div>

      <div v-if="papers.length" class="paper-list">
        <div v-for="p in papers" :key="p.id" class="paper-option" :class="{ selected: selectedPaperId === p.id }" @click="selectedPaperId = p.id">
          <div class="paper-option-title">{{ p.title }}</div>
          <div class="paper-option-meta">
            <span class="tag">{{ getSubjectLabel(p.subject) }}</span>
            <span>{{ (p as any).questions?.length || 0 }} 题</span>
            <span>{{ p.totalScore || 100 }} 分</span>
          </div>
        </div>
      </div>
      <div v-else class="empty-state" style="padding: 32px;">
        <p>暂无试卷，请先创建试卷</p>
      </div>

      <button class="btn btn-primary btn-lg" style="width: 100%; margin-top: 16px;" @click="startExam" :disabled="!selectedPaperId || loading">
        {{ loading ? '加载中...' : '🚀 开始考试' }}
      </button>

      <!-- Exam History -->
      <div v-if="examHistory.length" style="margin-top: 24px;">
        <div class="card-title" style="margin-bottom: 12px;">📊 考试记录</div>
        <div v-for="h in examHistory" :key="h.id" class="history-item">
          <div class="history-info">
            <strong>{{ h.title }}</strong>
            <span class="tag" style="margin-left: 8px;">{{ getSubjectLabel(h.subject) }}</span>
          </div>
          <div class="history-score">
            <span :class="h.score >= h.totalScore * 0.6 ? 'text-success' : 'text-danger'">{{ h.score }}/{{ h.totalScore }}</span>
            <span class="text-muted" style="margin-left: 8px;">{{ h.correctCount }}/{{ h.totalCount }} 正确</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Exam in progress -->
    <div v-else-if="session.status === 'in_progress'">
      <!-- Timer bar -->
      <div class="card timer-bar" :class="{ 'timer-warning': timeRemaining < 300 }">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>{{ session.title }}</strong>
            <span class="tag" style="margin-left: 8px;">{{ getSubjectLabel(session.subject) }}</span>
          </div>
          <div class="timer-display">
            <span class="timer-icon">⏱️</span>
            <span class="timer-text">{{ formatTime(timeRemaining) }}</span>
          </div>
        </div>
        <div class="progress-bar" style="margin-top: 8px;">
          <div class="progress-fill" :class="{ 'progress-danger': timeRemaining < 300 }" :style="{ width: (timeRemaining / (session.timeLimit * 60) * 100) + '%' }"></div>
        </div>
      </div>

      <!-- Question Navigation -->
      <div class="card" style="margin-bottom: 16px;">
        <div class="q-nav">
          <button v-for="q in session.questions" :key="q.id" class="q-nav-btn" :class="{ active: currentIdx === q.order - 1, answered: answers[q.id] }" @click="currentIdx = q.order - 1">
            {{ q.order }}
          </button>
        </div>
      </div>

      <!-- Current Question -->
      <div class="card" v-if="currentQ">
        <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
          <span class="q-order">第 {{ currentQ.order }} 题</span>
          <span class="q-score">{{ currentQ.score }} 分</span>
        </div>
        <div class="markdown-body q-content" v-html="renderMarkdown(currentQ.content)"></div>

        <!-- Choice options -->
        <div v-if="currentQ.options?.length" class="options-list">
          <label v-for="(opt, oi) in currentQ.options" :key="oi" class="option-item" :class="{ selected: answers[currentQ.id] === String.fromCharCode(65 + oi) }" @click="answers[currentQ.id] = String.fromCharCode(65 + oi)">
            <span class="option-letter">{{ String.fromCharCode(65 + oi) }}</span>
            <span>{{ opt }}</span>
          </label>
        </div>

        <!-- Text input -->
        <div v-else class="form-group" style="margin-top: 16px;">
          <label class="form-label">你的答案：</label>
          <textarea class="form-textarea" :value="answers[currentQ.id] || ''" @input="answers[currentQ.id] = ($event.target as HTMLTextAreaElement).value" rows="3" placeholder="输入你的答案..."></textarea>
        </div>

        <!-- Navigation -->
        <div class="btn-group" style="margin-top: 20px;">
          <button class="btn" @click="currentIdx--" :disabled="currentIdx <= 0">⬅ 上一题</button>
          <button class="btn" @click="currentIdx++" :disabled="currentIdx >= session.questions.length - 1">下一题 ➡</button>
          <button class="btn btn-primary" style="margin-left: auto;" @click="submitExam(false)">📤 交卷</button>
        </div>
      </div>
    </div>

    <!-- Exam Result -->
    <div v-else-if="session.status === 'completed' || session.status === 'timeout'" class="card result-card">
      <h2 style="margin-bottom: 8px; font-size: 24px;">{{ session.status === 'timeout' ? '⏰ 时间到！' : '📊 考试完成！' }}</h2>

      <div class="result-grid">
        <div class="result-item">
          <div class="result-value">{{ result.score }}</div>
          <div class="result-label">得分 / {{ result.totalScore }}</div>
        </div>
        <div class="result-item" :class="result.accuracy >= 60 ? 'success' : 'danger'">
          <div class="result-value">{{ result.accuracy }}%</div>
          <div class="result-label">正确率</div>
        </div>
        <div class="result-item success">
          <div class="result-value">{{ result.correctCount }}</div>
          <div class="result-label">正确 / {{ result.totalCount }}</div>
        </div>
        <div class="result-item">
          <div class="result-value">{{ formatTime(result.timeUsed) }}</div>
          <div class="result-label">用时</div>
        </div>
      </div>

      <!-- Answer details -->
      <div style="margin-top: 24px;">
        <div class="card-title" style="margin-bottom: 16px;">📋 答题详情</div>
        <div v-for="(r, idx) in result.results" :key="r.questionId" class="result-detail" :class="r.isCorrect ? 'detail-correct' : 'detail-wrong'">
          <div class="detail-header">
            <span class="detail-num">{{ idx + 1 }}.</span>
            <span :class="r.isCorrect ? 'text-success' : 'text-danger'">{{ r.isCorrect ? '✅ 正确' : '❌ 错误' }}</span>
            <span class="detail-score">{{ r.score }} 分</span>
          </div>
          <div v-if="!r.isCorrect" style="margin-top: 8px; font-size: 13px;">
            <div><strong>你的答案：</strong>{{ r.userAnswer || '未作答' }}</div>
            <div style="color: var(--success);"><strong>正确答案：</strong>{{ r.correctAnswer }}</div>
          </div>
          <div v-if="r.analysis" style="margin-top: 8px; font-size: 13px; color: var(--text-secondary);">
            <strong>解析：</strong>{{ r.analysis }}
          </div>
        </div>
      </div>

      <div class="btn-group" style="justify-content: center; margin-top: 24px;">
        <button class="btn btn-primary" @click="reset">🔄 再考一次</button>
        <router-link to="/practice" class="btn">🎯 去练习</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { renderMarkdown } from '@/utils/markdown';
import { SUBJECT_LABELS, getSubjectLabel } from '@/utils/constants';

const papers = ref<any[]>([]);
const selectedPaperId = ref('');
const timeLimit = ref(60);
const filterSubject = ref('');
const loading = ref(false);
const session = ref<any>({ status: 'idle', questions: [], timeLimit: 60 });
const answers = ref<Record<string, string>>({});
const currentIdx = ref(0);
const timeRemaining = ref(0);
const result = ref<any>({});
const examHistory = ref<any[]>([]);
let timer: any = null;

const currentQ = computed(() => session.value.questions?.[currentIdx.value]);

async function loadPapers() {
  const params = new URLSearchParams({ pageSize: '50' });
  if (filterSubject.value) params.set('subject', filterSubject.value);
  const res = await fetch(`/api/papers?${params}`);
  const json = await res.json();
  if (json.success) papers.value = json.data.items;
}

async function loadHistory() {
  const res = await fetch('/api/exam?pageSize=10');
  const json = await res.json();
  if (json.success) examHistory.value = json.data.items;
}

async function startExam() {
  loading.value = true;
  try {
    const res = await fetch('/api/exam/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paperId: selectedPaperId.value, timeLimit: timeLimit.value }),
    });
    const json = await res.json();
    if (json.success) {
      session.value = json.data;
      answers.value = {};
      currentIdx.value = 0;
      timeRemaining.value = json.data.timeLimit * 60;
      timer = setInterval(() => {
        timeRemaining.value--;
        if (timeRemaining.value <= 0) {
          clearInterval(timer);
          submitExam(true);
        }
      }, 1000);
    }
  } finally {
    loading.value = false;
  }
}

async function submitExam(forceTimeout: boolean) {
  if (!forceTimeout) {
    const unanswered = session.value.questions.filter((q: any) => !answers.value[q.id]).length;
    if (unanswered > 0) {
      if (!confirm(`还有 ${unanswered} 题未作答，确定交卷？`)) return;
    }
  }

  if (timer) clearInterval(timer);

  const res = await fetch(`/api/exam/${session.value.sessionId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers: answers.value, forceTimeout }),
  });
  const json = await res.json();
  if (json.success) {
    result.value = json.data;
    session.value.status = forceTimeout ? 'timeout' : 'completed';
  }
}

function formatTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function reset() {
  session.value = { status: 'idle', questions: [], timeLimit: 60 };
  answers.value = {};
  currentIdx.value = 0;
  if (timer) clearInterval(timer);
}

onMounted(() => { loadPapers(); loadHistory(); });
onUnmounted(() => { if (timer) clearInterval(timer); });
</script>

<style scoped>
.paper-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.paper-option {
  padding: 14px 16px; border: 2px solid var(--border); border-radius: var(--radius);
  cursor: pointer; transition: all var(--transition-fast);
}
.paper-option:hover { border-color: var(--primary-light); }
.paper-option.selected { border-color: var(--primary); background: var(--primary-50); }
.paper-option-title { font-weight: 600; margin-bottom: 6px; }
.paper-option-meta { display: flex; gap: 8px; align-items: center; font-size: 13px; color: var(--text-secondary); }

.timer-bar { padding: 16px 20px; }
.timer-bar.timer-warning { border-color: var(--danger); background: var(--danger-light); }
.timer-display { display: flex; align-items: center; gap: 8px; }
.timer-icon { font-size: 20px; }
.timer-text { font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums; }
.timer-warning .timer-text { color: var(--danger); }

.q-nav { display: flex; gap: 6px; flex-wrap: wrap; }
.q-nav-btn {
  width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--border);
  background: var(--bg-card); cursor: pointer; font-size: 13px; font-weight: 600;
  display: flex; align-items: center; justify-content: center; transition: all var(--transition-fast);
}
.q-nav-btn:hover { border-color: var(--primary); }
.q-nav-btn.active { border-color: var(--primary); background: var(--primary); color: white; }
.q-nav-btn.answered { border-color: var(--success); background: var(--success-light); }

.q-order { font-weight: 700; color: var(--primary); }
.q-score { font-weight: 600; color: var(--text-secondary); }
.q-content { font-size: 16px; margin-bottom: 16px; }

.options-list { display: flex; flex-direction: column; gap: 8px; margin: 16px 0; }
.option-item {
  display: flex; align-items: center; gap: 14px; padding: 14px 18px;
  border: 2px solid var(--border); border-radius: var(--radius); cursor: pointer; transition: all var(--transition-fast);
}
.option-item:hover { border-color: var(--primary-light); }
.option-item.selected { border-color: var(--primary); background: var(--primary-50); }
.option-letter {
  width: 32px; height: 32px; border-radius: 50%; background: var(--bg);
  display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0;
}
.option-item.selected .option-letter { background: var(--primary); color: white; }

.progress-bar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--primary); border-radius: 3px; transition: width 1s linear; }
.progress-fill.progress-danger { background: var(--danger); }

.result-card { text-align: center; padding: 40px; }
.result-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; max-width: 600px; margin-left: auto; margin-right: auto; }
.result-item { padding: 20px; background: var(--bg); border-radius: var(--radius-lg); }
.result-item.success { background: var(--success-light); }
.result-item.danger { background: var(--danger-light); }
.result-value { font-size: 36px; font-weight: 800; color: var(--primary); }
.result-item.success .result-value { color: var(--success); }
.result-item.danger .result-value { color: var(--danger); }
.result-label { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }

.result-detail { padding: 14px; border-radius: var(--radius); margin-bottom: 8px; }
.detail-correct { background: var(--success-light); }
.detail-wrong { background: var(--danger-light); }
.detail-header { display: flex; align-items: center; gap: 8px; font-weight: 600; }
.detail-num { font-size: 16px; }
.detail-score { margin-left: auto; color: var(--text-secondary); font-size: 13px; }

.text-success { color: var(--success); }
.text-danger { color: var(--danger); }
.text-muted { color: var(--text-muted); }

.history-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-light); }
.history-item:last-child { border-bottom: none; }
.history-info { display: flex; align-items: center; gap: 8px; }
.history-score { font-weight: 600; }
</style>
