<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">🏆</span>
        答题闯关
      </h1>
    </div>

    <!-- Select Subject -->
    <div v-if="!started" class="challenge-home">
      <div class="card" style="max-width: 600px; margin: 0 auto;">
        <div class="card-header">
          <span class="card-title">🎮 选择学科闯关</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
          <button v-for="(label, key) in SUBJECT_LABELS" :key="key" class="challenge-subject-btn"
            @click="startChallenge(key)">
            <span style="font-size: 28px;">{{ SUBJECT_EMOJIS[key] || '📚' }}</span>
            <span style="font-weight: 600;">{{ label }}</span>
            <span style="font-size: 12px; color: var(--text-muted);">最高 {{ getMaxLevel(key) }} 关</span>
          </button>
        </div>
      </div>

      <!-- Streak info -->
      <div class="card" style="max-width: 600px; margin: 16px auto 0;">
        <div style="display: flex; justify-content: space-around; text-align: center;">
          <div>
            <div style="font-size: 32px; font-weight: 800; color: var(--primary);">{{ streak }}</div>
            <div style="font-size: 13px; color: var(--text-secondary);">🔥 连续答对</div>
          </div>
          <div>
            <div style="font-size: 32px; font-weight: 800; color: var(--success);">{{ totalCleared }}</div>
            <div style="font-size: 13px; color: var(--text-secondary);">🏆 已通关数</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Challenge Mode -->
    <div v-else>
      <!-- Level Header -->
      <div class="card" style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 13px; color: var(--text-muted);">{{ getSubjectLabel(challengeSubject as Subject) }}</span>
            <h2 style="font-size: 20px; margin-top: 4px;">第 {{ level }} 关</h2>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 13px; color: var(--text-muted);">连续正确</div>
            <div style="font-size: 24px; font-weight: 800; color: var(--success);">{{ combo }} 🔥</div>
          </div>
        </div>
        <div class="progress-bar" style="margin-top: 12px;">
          <div class="progress-fill" :style="{ width: (questionIdx / questions.length * 100) + '%' }"></div>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
          {{ questionIdx + 1 }} / {{ questions.length }} · 需答对 {{ Math.ceil(questions.length * 0.7) }} 题过关
        </div>
      </div>

      <!-- Question -->
      <div v-if="!levelComplete" class="card" style="max-width: 700px; margin: 0 auto;">
        <div class="q-meta">
          <span class="diff-badge" :style="{ background: DIFFICULTY_COLORS[currentQuestion?.difficulty as Difficulty] }">
            {{ getDifficultyLabel(currentQuestion?.difficulty) }}
          </span>
          <span class="tag">{{ currentQuestion?.category }}</span>
          <button v-if="tts.supported" class="btn btn-sm btn-ghost" style="margin-left: auto;"
            @click="tts.speak(currentQuestion?.content || '')">
            {{ tts.speaking ? '🔊' : '🔈' }}
          </button>
        </div>

        <div class="markdown-body" style="font-size: 16px; line-height: 1.8; margin-bottom: 16px;"
          v-html="renderMarkdown(currentQuestion?.content || '')"></div>

        <!-- Options -->
        <div v-if="currentQuestion?.options?.length" class="options-list">
          <label v-for="(opt, oi) in currentQuestion.options" :key="oi" class="option-item"
            :class="{
              'selected': userAnswer === String.fromCharCode(65 + oi),
              'correct': showResult && String.fromCharCode(65 + oi) === currentQuestion.answer?.trim().toUpperCase(),
              'wrong': showResult && userAnswer === String.fromCharCode(65 + oi) && userAnswer !== currentQuestion.answer?.trim().toUpperCase()
            }" @click="!showResult && selectOption(String.fromCharCode(65 + oi))">
            <span class="option-letter">{{ String.fromCharCode(65 + oi) }}</span>
            <span>{{ opt }}</span>
          </label>
        </div>

        <div v-else class="form-group" style="margin-top: 16px;">
          <label class="form-label">你的答案：</label>
          <textarea class="form-textarea" v-model="userAnswer" rows="3" placeholder="输入答案..."
            :disabled="showResult"></textarea>
        </div>

        <!-- Actions -->
        <div style="margin-top: 20px;">
          <button v-if="!showResult" class="btn btn-primary btn-lg" style="width: 100%;"
            @click="submitAnswer" :disabled="!userAnswer">
            ✅ 提交答案
          </button>
          <button v-else class="btn btn-primary btn-lg" style="width: 100%;" @click="nextQuestion">
            {{ questionIdx < questions.length - 1 ? '👉 下一题' : '🏁 查看结果' }}
          </button>
        </div>

        <!-- Result -->
        <div v-if="showResult" class="result-box" :class="isCorrect ? 'result-correct' : 'result-wrong'">
          <div style="font-size: 18px; font-weight: 700;">
            {{ isCorrect ? '🎉 正确！' + (combo >= 5 ? ' 🔥连击x' + combo : '') : '❌ 错误' }}
          </div>
          <div v-if="!isCorrect" style="margin-top: 8px;">
            <strong>正确答案：</strong>{{ currentQuestion?.answer }}
          </div>
          <div v-if="currentQuestion?.analysis" style="margin-top: 8px; color: var(--text-secondary);">
            <strong>解析：</strong>{{ currentQuestion?.analysis }}
          </div>
        </div>
      </div>

      <!-- Level Complete -->
      <div v-else class="card" style="max-width: 500px; margin: 0 auto; text-align: center; padding: 48px;">
        <div style="font-size: 64px; margin-bottom: 16px;">{{ passed ? '🎉' : '😤' }}</div>
        <h2 style="font-size: 24px; margin-bottom: 8px;">{{ passed ? '通关成功！' : '闯关失败' }}</h2>
        <p style="color: var(--text-secondary); margin-bottom: 24px;">
          答对 {{ correctCount }}/{{ questions.length }} 题
          {{ passed ? '· 已解锁下一关！' : '· 需要 70% 正确率才能过关' }}
        </p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button class="btn btn-primary" @click="nextLevel" v-if="passed">🚀 下一关</button>
          <button class="btn" @click="retryLevel">🔄 重试本关</button>
          <button class="btn" @click="quitChallenge">↩️ 返回</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { renderMarkdown } from '@/utils/markdown';
import { SUBJECT_LABELS, SUBJECT_COLORS, DIFFICULTY_COLORS, getSubjectLabel, getDifficultyLabel } from '@/utils/constants';
import type { Subject, Difficulty } from 'shared/src/index';
import { apiPost } from '@/utils/api';
import { useTTS } from '@/composables/useTTS';

const SUBJECT_EMOJIS: Record<string, string> = {
  chinese: '📖', math: '🔢', english: '🌍', history: '📜',
  physics: '⚛️', chemistry: '🧪', biology: '🧬', geography: '🗺️', politics: '⚖️',
};

const tts = useTTS();
const started = ref(false);
const challengeSubject = ref('');
const level = ref(1);
const questions = ref<any[]>([]);
const questionIdx = ref(0);
const userAnswer = ref('');
const showResult = ref(false);
const isCorrect = ref(false);
const correctCount = ref(0);
const combo = ref(0);
const levelComplete = ref(false);
const passed = ref(false);
const streak = ref(0);
const totalCleared = ref(0);

const currentQuestion = computed(() => questions.value[questionIdx.value]);

function getMaxLevel(subject: string) {
  const saved = localStorage.getItem(`qb-challenge-${subject}`);
  return saved ? parseInt(saved) : 1;
}

async function startChallenge(subject: string) {
  challengeSubject.value = subject;
  level.value = getMaxLevel(subject);
  await loadLevel();
  started.value = true;
}

async function loadLevel() {
  const difficulty = Math.min(5, Math.ceil(level.value / 3));
  const count = 5 + Math.floor(level.value / 2);
  const json = await apiPost('/practice/random-paper', {
    subject: challengeSubject.value,
    count: Math.min(count, 20),
    difficulty,
  });
  if (json.success) {
    const paperJson = await (await fetch(`/api/papers/${json.data.paperId}`)).json();
    if (paperJson.success) {
      questions.value = paperJson.data.questions;
      questionIdx.value = 0;
      correctCount.value = 0;
      combo.value = 0;
      levelComplete.value = false;
      passed.value = false;
      userAnswer.value = '';
      showResult.value = false;
    }
  }
}

function selectOption(letter: string) {
  userAnswer.value = letter;
}

async function submitAnswer() {
  if (!currentQuestion.value || !userAnswer.value) return;
  const json = await apiPost('/practice/submit', {
    questionId: currentQuestion.value.id,
    userAnswer: userAnswer.value,
    timeSpent: 0,
  });
  if (json.success) {
    isCorrect.value = json.data.isCorrect;
    if (isCorrect.value) {
      correctCount.value++;
      combo.value++;
      streak.value++;
    } else {
      combo.value = 0;
    }
    showResult.value = true;
  }
}

function nextQuestion() {
  if (questionIdx.value < questions.value.length - 1) {
    questionIdx.value++;
    userAnswer.value = '';
    showResult.value = false;
    isCorrect.value = false;
  } else {
    levelComplete.value = true;
    const accuracy = correctCount.value / questions.value.length;
    passed.value = accuracy >= 0.7;
    if (passed.value) {
      const saved = parseInt(localStorage.getItem(`qb-challenge-${challengeSubject.value}`) || '1');
      if (level.value >= saved) {
        localStorage.setItem(`qb-challenge-${challengeSubject.value}`, String(level.value + 1));
      }
      totalCleared.value++;
    }
  }
}

function nextLevel() {
  level.value++;
  loadLevel();
}

function retryLevel() {
  loadLevel();
}

function quitChallenge() {
  started.value = false;
}

onMounted(() => {
  // Load streak from localStorage
  const savedStreak = localStorage.getItem('qb-challenge-streak');
  if (savedStreak) streak.value = parseInt(savedStreak);
  const savedCleared = localStorage.getItem('qb-challenge-cleared');
  if (savedCleared) totalCleared.value = parseInt(savedCleared);
});
</script>

<style scoped>
.challenge-home { max-width: 700px; margin: 0 auto; }
.challenge-subject-btn {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 20px 12px; border: 2px solid var(--border); border-radius: var(--radius-lg);
  background: var(--bg-card); cursor: pointer; transition: all var(--transition-fast);
}
.challenge-subject-btn:hover { border-color: var(--primary); background: var(--primary-50); transform: translateY(-2px); }

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
}
.option-item.selected .option-letter { background: var(--primary); color: white; }
.option-item.correct .option-letter { background: var(--success); color: white; }
.option-item.wrong .option-letter { background: var(--danger); color: white; }

.progress-bar { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--success)); border-radius: 4px; transition: width 0.4s ease; }

.result-box { margin-top: 20px; padding: 20px; border-radius: var(--radius-lg); }
.result-correct { background: var(--success-light); border-left: 4px solid var(--success); }
.result-wrong { background: var(--danger-light); border-left: 4px solid var(--danger); }

.q-meta { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
</style>
