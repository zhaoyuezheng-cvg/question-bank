<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">📖</span>
        单词本
      </h1>
      <div class="btn-group">
        <button class="btn" :class="{ 'btn-primary': mode === 'list' }" @click="mode = 'list'">📋 列表</button>
        <button class="btn" :class="{ 'btn-primary': mode === 'review' }" @click="mode = 'review'; loadDue()">🔄 复习</button>
        <button class="btn" :class="{ 'btn-primary': mode === 'quiz' }" @click="mode = 'quiz'; startQuiz()">📝 测验</button>
        <button class="btn" @click="showImport = true">📥 导入</button>
        <button class="btn btn-primary" @click="showAdd = true">➕ 添加</button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-mini">
        <span class="stat-mini-value">{{ stats.total }}</span>
        <span class="stat-mini-label">总词汇</span>
      </div>
      <div class="stat-mini">
        <span class="stat-mini-value" style="color: var(--success);">{{ stats.mastered }}</span>
        <span class="stat-mini-label">已掌握</span>
      </div>
      <div class="stat-mini">
        <span class="stat-mini-value" style="color: var(--warning);">{{ stats.due }}</span>
        <span class="stat-mini-label">待复习</span>
      </div>
      <div class="stat-mini">
        <span class="stat-mini-value" style="color: var(--primary);">{{ stats.learning }}</span>
        <span class="stat-mini-label">学习中</span>
      </div>
    </div>

    <!-- List Mode -->
    <div v-if="mode === 'list'">
      <div class="filter-bar">
        <div class="form-group">
          <select class="form-select" v-model="filters.unit" @change="loadWords">
            <option value="">全部单元</option>
            <option v-for="u in units" :key="u" :value="u">{{ u }}</option>
          </select>
        </div>
        <div class="form-group">
          <select class="form-select" v-model="filters.mastery" @change="loadWords">
            <option value="">全部状态</option>
            <option value="0">未学习</option>
            <option value="1">学习中</option>
            <option value="3">基本掌握</option>
            <option value="5">完全掌握</option>
          </select>
        </div>
        <div class="form-group" style="flex: 1;">
          <input class="form-input" v-model="filters.keyword" placeholder="搜索单词/释义..." @keyup.enter="loadWords" />
        </div>
      </div>

      <div class="word-list">
        <div v-for="w in words" :key="w.id" class="word-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span class="word-text">{{ w.word }}</span>
              <span v-if="w.phonetic" class="word-phonetic">{{ w.phonetic }}</span>
              <span v-if="w.partOfSpeech" class="word-pos">{{ w.partOfSpeech }}</span>
              <span v-if="w.unit" class="tag" style="font-size: 10px; margin-left: 4px;">{{ w.unit }}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <div class="mastery-bar">
                <div v-for="n in 5" :key="n" class="mastery-dot" :class="{ filled: n <= w.mastery }"></div>
              </div>
              <button class="btn btn-sm btn-ghost" style="color: var(--danger);" @click="deleteWord(w.id)">×</button>
            </div>
          </div>
          <div class="word-meaning">{{ w.meaning }}</div>
          <div v-if="w.example" class="word-example">{{ w.example }}</div>
        </div>
      </div>

      <div v-if="!words.length" class="card empty-state" style="padding: 32px;">
        <p>暂无单词，点击「导入」或「添加」开始</p>
      </div>
    </div>

    <!-- Review Mode -->
    <div v-if="mode === 'review'">
      <div v-if="!dueWords.length" class="card empty-state" style="padding: 48px;">
        <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
        <p>今日单词复习已完成！</p>
      </div>
      <div v-else-if="!showReviewAnswer" class="card" style="max-width: 500px; margin: 0 auto; padding: 32px; text-align: center;">
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">{{ reviewIdx + 1 }} / {{ dueWords.length }}</div>
        <div style="font-size: 36px; font-weight: 800; margin-bottom: 8px;">{{ dueWords[reviewIdx]?.word }}</div>
        <div v-if="dueWords[reviewIdx]?.phonetic" style="color: var(--text-muted); margin-bottom: 24px;">{{ dueWords[reviewIdx]?.phonetic }}</div>
        <button class="btn btn-primary btn-lg" style="width: 100%;" @click="showReviewAnswer = true">👁️ 显示释义</button>
      </div>
      <div v-else class="card" style="max-width: 500px; margin: 0 auto; padding: 32px; text-align: center;">
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">{{ reviewIdx + 1 }} / {{ dueWords.length }}</div>
        <div style="font-size: 36px; font-weight: 800; margin-bottom: 4px;">{{ dueWords[reviewIdx]?.word }}</div>
        <div v-if="dueWords[reviewIdx]?.phonetic" style="color: var(--text-muted); margin-bottom: 12px;">{{ dueWords[reviewIdx]?.phonetic }}</div>
        <div style="font-size: 18px; margin-bottom: 4px;">{{ dueWords[reviewIdx]?.meaning }}</div>
        <div v-if="dueWords[reviewIdx]?.example" style="font-size: 13px; color: var(--text-secondary); margin-top: 12px; font-style: italic;">{{ dueWords[reviewIdx]?.example }}</div>
        <div style="display: flex; gap: 8px; margin-top: 24px;">
          <button class="btn btn-lg" style="flex: 1; border-color: var(--danger); color: var(--danger);" @click="rateWord(1)">😵 不认识</button>
          <button class="btn btn-lg" style="flex: 1; border-color: var(--warning); color: var(--warning);" @click="rateWord(3)">😐 模糊</button>
          <button class="btn btn-lg btn-success" style="flex: 1;" @click="rateWord(5)">✅ 认识</button>
        </div>
      </div>
    </div>

    <!-- Quiz Mode -->
    <div v-if="mode === 'quiz'">
      <div v-if="!quizWords.length" class="card empty-state" style="padding: 32px;">
        <p>单词不足 4 个，无法测验</p>
      </div>
      <div v-else-if="!quizDone" class="card" style="max-width: 600px; margin: 0 auto; padding: 32px;">
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">{{ quizIdx + 1 }} / {{ quizWords.length }} · 正确 {{ quizCorrect }}</div>
        <div style="font-size: 28px; font-weight: 800; text-align: center; margin-bottom: 24px;">{{ quizWords[quizIdx]?.word }}</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button v-for="(opt, oi) in quizOptions" :key="oi" class="quiz-opt"
            :class="{ correct: showQuizResult && opt === quizWords[quizIdx]?.meaning, wrong: showQuizResult && selectedOpt === oi && opt !== quizWords[quizIdx]?.meaning }"
            @click="selectQuizOpt(oi)">
            {{ String.fromCharCode(65 + oi) }}. {{ opt }}
          </button>
        </div>
        <div v-if="showQuizResult" style="margin-top: 16px; text-align: center;">
          <button class="btn btn-primary" @click="nextQuiz">{{ quizIdx < quizWords.length - 1 ? '下一题 →' : '查看结果' }}</button>
        </div>
      </div>
      <div v-else class="card" style="text-align: center; padding: 48px;">
        <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
        <h2>测验完成！</h2>
        <div style="font-size: 36px; font-weight: 800; color: var(--primary); margin: 16px 0;">{{ quizCorrect }} / {{ quizWords.length }}</div>
        <div style="color: var(--text-secondary); margin-bottom: 24px;">正确率 {{ Math.round(quizCorrect / quizWords.length * 100) }}%</div>
        <button class="btn btn-primary" @click="startQuiz">再来一轮</button>
      </div>
    </div>

    <!-- Add Modal -->
    <div v-if="showAdd" class="modal-overlay" @click.self="showAdd = false">
      <div class="modal">
        <div class="modal-title">添加单词</div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">单词 *</label><input class="form-input" v-model="newWord.word" placeholder="hello" /></div>
          <div class="form-group"><label class="form-label">音标</label><input class="form-input" v-model="newWord.phonetic" placeholder="/həˈloʊ/" /></div>
        </div>
        <div class="form-group"><label class="form-label">释义 *</label><input class="form-input" v-model="newWord.meaning" placeholder="你好；打招呼" /></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">词性</label><input class="form-input" v-model="newWord.partOfSpeech" placeholder="interj." /></div>
          <div class="form-group"><label class="form-label">单元</label><input class="form-input" v-model="newWord.unit" placeholder="Unit 1" /></div>
        </div>
        <div class="form-group"><label class="form-label">例句</label><textarea class="form-textarea" v-model="newWord.example" rows="2" placeholder="Hello, how are you?"></textarea></div>
        <div class="btn-group" style="justify-content: flex-end;"><button class="btn" @click="showAdd = false">取消</button><button class="btn btn-primary" @click="addWord">添加</button></div>
      </div>
    </div>

    <!-- Import Modal -->
    <div v-if="showImport" class="modal-overlay" @click.self="showImport = false">
      <div class="modal" style="max-width: 700px;">
        <div class="modal-title">📥 批量导入单词</div>
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">
          支持格式：每行一个单词，用 Tab 或逗号分隔「单词」「释义」「音标」
        </p>
        <div class="form-row">
          <div class="form-group"><label class="form-label">默认单元</label><input class="form-input" v-model="importUnit" placeholder="Unit 1" /></div>
        </div>
        <div class="form-group">
          <textarea class="form-textarea" v-model="importText" rows="12"
            placeholder="每行一个单词，格式：&#10;hello	你好	/həˈloʊ/&#10;world	世界	/wɜːrld/&#10;apple	苹果&#10;&#10;或用 AI 生成的 JSON 格式"></textarea>
        </div>
        <div class="btn-group" style="justify-content: flex-end;">
          <button class="btn" @click="showImport = false">取消</button>
          <button class="btn btn-primary" @click="handleImport" :disabled="importing">{{ importing ? '导入中...' : '开始导入' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';

const toast = inject<(type: string, msg: string) => void>('toast')!;

const mode = ref<'list' | 'review' | 'quiz'>('list');
const words = ref<any[]>([]);
const dueWords = ref<any[]>([]);
const units = ref<string[]>([]);
const stats = ref({ total: 0, mastered: 0, due: 0, learning: 0 });
const filters = ref({ unit: '', mastery: '', keyword: '' });
const showAdd = ref(false);
const showImport = ref(false);
const importText = ref('');
const importUnit = ref('');
const importing = ref(false);
const newWord = ref({ word: '', phonetic: '', meaning: '', partOfSpeech: '', example: '', unit: '' });

// Review
const reviewIdx = ref(0);
const showReviewAnswer = ref(false);

// Quiz
const quizWords = ref<any[]>([]);
const quizIdx = ref(0);
const quizOptions = ref<string[]>([]);
const quizCorrect = ref(0);
const quizDone = ref(false);
const showQuizResult = ref(false);
const selectedOpt = ref(-1);

async function loadWords() {
  const params = new URLSearchParams({ pageSize: '200' });
  if (filters.value.unit) params.set('unit', filters.value.unit);
  if (filters.value.mastery) params.set('mastery', filters.value.mastery);
  if (filters.value.keyword) params.set('keyword', filters.value.keyword);
  const res = await fetch(`/api/words?${params}`);
  const json = await res.json();
  if (json.success) words.value = json.data.items;
}

async function loadStats() {
  const res = await fetch('/api/words/stats');
  const json = await res.json();
  if (json.success) stats.value = json.data;
}

async function loadUnits() {
  const res = await fetch('/api/words/units');
  const json = await res.json();
  if (json.success) units.value = json.data;
}

async function loadDue() {
  const res = await fetch('/api/words/due?limit=30');
  const json = await res.json();
  if (json.success) {
    dueWords.value = json.data;
    reviewIdx.value = 0;
    showReviewAnswer.value = false;
  }
}

async function addWord() {
  if (!newWord.value.word || !newWord.value.meaning) { toast('error', '单词和释义不能为空'); return; }
  await fetch('/api/words', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newWord.value),
  });
  showAdd.value = false;
  newWord.value = { word: '', phonetic: '', meaning: '', partOfSpeech: '', example: '', unit: '' };
  toast('success', '已添加');
  loadWords(); loadStats();
}

async function deleteWord(id: string) {
  await fetch(`/api/words/${id}`, { method: 'DELETE' });
  loadWords(); loadStats();
}

async function rateWord(quality: number) {
  const w = dueWords.value[reviewIdx.value];
  await fetch(`/api/words/${w.id}/review`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quality }),
  });
  if (reviewIdx.value < dueWords.value.length - 1) {
    reviewIdx.value++;
    showReviewAnswer.value = false;
  } else {
    toast('success', '🎉 今日复习完成！');
    mode.value = 'list';
    loadStats();
  }
}

function startQuiz() {
  const pool = [...words.value].filter(w => w.mastery < 5);
  if (pool.length < 4) { quizWords.value = []; return; }
  // Shuffle and pick 10
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  quizWords.value = pool.slice(0, 10);
  quizIdx.value = 0;
  quizCorrect.value = 0;
  quizDone.value = false;
  showQuizResult.value = false;
  selectedOpt.value = -1;
  genQuizOptions();
}

function genQuizOptions() {
  const correct = quizWords.value[quizIdx.value];
  const others = words.value.filter(w => w.id !== correct.id).sort(() => Math.random() - 0.5).slice(0, 3);
  const opts = [correct.meaning, ...others.map(w => w.meaning)].sort(() => Math.random() - 0.5);
  quizOptions.value = opts;
}

function selectQuizOpt(idx: number) {
  if (showQuizResult.value) return;
  selectedOpt.value = idx;
  showQuizResult.value = true;
  if (quizOptions.value[idx] === quizWords.value[quizIdx.value].meaning) {
    quizCorrect.value++;
  }
}

function nextQuiz() {
  if (quizIdx.value < quizWords.value.length - 1) {
    quizIdx.value++;
    showQuizResult.value = false;
    selectedOpt.value = -1;
    genQuizOptions();
  } else {
    quizDone.value = true;
  }
}

async function handleImport() {
  importing.value = true;
  try {
    let wordList: any[];
    try {
      // Try JSON first
      const parsed = JSON.parse(importText.value);
      wordList = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Parse as TSV/CSV
      wordList = importText.value.split('\n').filter(l => l.trim()).map(line => {
        const parts = line.split(/[\t,]/).map(s => s.trim());
        return { word: parts[0], meaning: parts[1] || '', phonetic: parts[2] || '' };
      });
    }

    const res = await fetch('/api/words/batch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words: wordList, unit: importUnit.value || undefined }),
    });
    const json = await res.json();
    if (json.success) {
      toast('success', `成功导入 ${json.data.success} 个单词`);
      showImport.value = false;
      importText.value = '';
      loadWords(); loadStats(); loadUnits();
    }
  } catch (e: any) {
    toast('error', '导入失败: ' + e.message);
  } finally {
    importing.value = false;
  }
}

onMounted(() => { loadWords(); loadStats(); loadUnits(); });
</script>

<style scoped>
.stats-row { display: flex; gap: 12px; margin-bottom: 20px; }
.stat-mini { flex: 1; padding: 16px; background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow); text-align: center; border: 1px solid var(--border-light); }
.stat-mini-value { display: block; font-size: 28px; font-weight: 800; color: var(--primary); }
.stat-mini-label { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

.word-list { display: flex; flex-direction: column; gap: 6px; }
.word-card { padding: 12px 16px; background: var(--bg-card); border-radius: var(--radius); border: 1px solid var(--border-light); }
.word-text { font-size: 18px; font-weight: 700; color: var(--primary); }
.word-phonetic { font-size: 13px; color: var(--text-muted); margin-left: 8px; }
.word-pos { font-size: 11px; color: var(--text-secondary); margin-left: 8px; font-style: italic; }
.word-meaning { font-size: 14px; margin-top: 4px; }
.word-example { font-size: 12px; color: var(--text-secondary); margin-top: 4px; font-style: italic; }

.mastery-bar { display: flex; gap: 3px; }
.mastery-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border); }
.mastery-dot.filled { background: var(--success); }

.quiz-opt {
  display: block; width: 100%; padding: 14px 18px; border: 2px solid var(--border);
  border-radius: var(--radius); background: var(--bg-card); cursor: pointer;
  text-align: left; font-size: 14px; transition: all var(--transition-fast);
}
.quiz-opt:hover { border-color: var(--primary); }
.quiz-opt.correct { border-color: var(--success); background: var(--success-light); }
.quiz-opt.wrong { border-color: var(--danger); background: var(--danger-light); text-decoration: line-through; }
</style>
