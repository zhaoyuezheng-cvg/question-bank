<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">🤖</span>
        AI 智能导入
      </h1>
      <div class="btn-group">
        <router-link to="/import" class="btn">📥 普通导入</router-link>
      </div>
    </div>

    <!-- Step 1: Input -->
    <div v-if="step === 'input'" class="card">
      <div class="card-header">
        <span class="card-title">📝 第一步：粘贴试题文本</span>
      </div>
      <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">
        粘贴任意格式的试题文本，AI 会自动识别题目、答案、解析等信息。
      </p>
      <div class="form-group">
        <textarea class="form-textarea" v-model="inputText" rows="15"
          placeholder="粘贴试题文本...&#10;&#10;支持任意格式，例如：&#10;- 带【题干】【答案】标记的&#10;- 编号格式的&#10;- 直接从试卷复制的&#10;- Word/PDF 复制的文本"></textarea>
      </div>

      <!-- AI Config (collapsible) -->
      <details class="ai-config">
        <summary>⚙️ AI 接口配置</summary>
        <div class="form-row" style="margin-top: 12px;">
          <div class="form-group">
            <label class="form-label">API Base</label>
            <input class="form-input" v-model="aiConfig.apiBase" placeholder="https://api.openai.com" />
          </div>
          <div class="form-group">
            <label class="form-label">API Key</label>
            <input class="form-input" v-model="aiConfig.apiKey" type="password" placeholder="sk-..." />
          </div>
          <div class="form-group">
            <label class="form-label">模型</label>
            <input class="form-input" v-model="aiConfig.model" placeholder="gpt-4o-mini" />
          </div>
        </div>
        <p style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">
          支持 OpenAI 兼容接口（OpenAI / 通义千问 / 豆包 / DeepSeek 等）。也可在服务端环境变量 AI_API_KEY / AI_API_BASE / AI_MODEL 中配置。
        </p>
      </details>

      <div class="form-row" style="margin-top: 8px;">
        <div class="form-group">
          <label class="form-label">阅读材料标题（可选，有则自动创建材料+关联子题）</label>
          <input class="form-input" v-model="passageTitle" placeholder="如：《背影》阅读理解" />
        </div>
      </div>

      <button class="btn btn-primary btn-lg" style="width: 100%; margin-top: 12px;" @click="parseWithAI" :disabled="parsing || !inputText.trim()">
        {{ parsing ? '🤖 AI 识别中...' : '🤖 开始 AI 识别' }}
      </button>
    </div>

    <!-- Step 2: Review -->
    <div v-if="step === 'review'">
      <div class="card">
        <div class="card-header">
          <span class="card-title">📋 第二步：确认识别结果</span>
          <div class="btn-group">
            <button class="btn" @click="step = 'input'">← 返回修改</button>
            <button class="btn btn-primary" @click="importQuestions" :disabled="importing">
              {{ importing ? '导入中...' : `✅ 确认导入 (${parsedQuestions.length} 题)` }}
            </button>
          </div>
        </div>
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
          AI 识别出 {{ parsedQuestions.length }} 道题目，请检查并修改后确认导入。
        </p>
      </div>

      <div v-for="(q, idx) in parsedQuestions" :key="idx" class="card review-card">
        <div class="review-header">
          <span class="review-num">第 {{ idx + 1 }} 题</span>
          <select class="form-select" v-model="q.subject" style="width: 80px;">
            <option v-for="(label, key) in SUBJECT_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
          <select class="form-select" v-model="q.type" style="width: 90px;">
            <option v-for="(label, key) in QUESTION_TYPE_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
          <input class="form-input" v-model="q.subType" placeholder="细分题型" style="width: 100px;" />
          <select class="form-select" v-model.number="q.difficulty" style="width: 80px;">
            <option v-for="n in 5" :key="n" :value="n">{{ DIFFICULTY_LABELS[n as Difficulty] }}</option>
          </select>
          <button class="btn btn-sm btn-ghost" style="color: var(--danger);" @click="parsedQuestions.splice(idx, 1)">🗑️</button>
        </div>
        <div class="form-group" style="margin-top: 8px;">
          <label class="form-label">题干</label>
          <textarea class="form-textarea" v-model="q.content" rows="3"></textarea>
        </div>
        <div v-if="isChoiceType(q.type)" class="form-group">
          <label class="form-label">选项（每行一个）</label>
          <textarea class="form-textarea" :value="q.options?.join('\\n') || ''"
            @input="q.options = ($event.target as HTMLTextAreaElement).value.split('\\n').filter(Boolean)" rows="3"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex: 1;">
            <label class="form-label">答案</label>
            <textarea class="form-textarea" v-model="q.answer" rows="2"></textarea>
          </div>
          <div class="form-group" style="flex: 1;">
            <label class="form-label">解析</label>
            <textarea class="form-textarea" v-model="q.analysis" rows="2"></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 3: Done -->
    <div v-if="step === 'done'" class="card" style="text-align: center; padding: 48px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
      <h2 style="margin-bottom: 8px;">导入完成！</h2>
      <p style="color: var(--text-secondary); margin-bottom: 24px;">
        成功导入 {{ importResult.success }} 道题目{{ importResult.failed > 0 ? `，失败 ${importResult.failed} 道` : '' }}
      </p>
      <div class="btn-group" style="justify-content: center;">
        <router-link to="/questions" class="btn btn-primary">查看题目</router-link>
        <button class="btn" @click="resetAll">继续导入</button>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="card" style="border-color: var(--danger); margin-top: 16px;">
      <div style="color: var(--danger); font-weight: 600; margin-bottom: 8px;">❌ 识别失败</div>
      <p style="font-size: 13px; color: var(--text-secondary);">{{ error }}</p>
      <button class="btn" style="margin-top: 12px;" @click="step = 'input'">返回重试</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue';
import {
  SUBJECT_LABELS, QUESTION_TYPE_LABELS, DIFFICULTY_LABELS,
} from '@/utils/constants';
import type { Difficulty } from 'shared/src/index';
import { apiPost } from '@/utils/api';

const toast = inject<(type: string, msg: string) => void>('toast')!;

const step = ref<'input' | 'review' | 'done'>('input');
const inputText = ref('');
const passageTitle = ref('');
const parsing = ref(false);
const importing = ref(false);
const error = ref('');
const parsedQuestions = ref<any[]>([]);
const importResult = ref({ success: 0, failed: 0 });

const aiConfig = ref({
  apiBase: localStorage.getItem('ai-api-base') || '',
  apiKey: localStorage.getItem('ai-api-key') || '',
  model: localStorage.getItem('ai-model') || '',
});

function isChoiceType(type: string) {
  return ['choice', 'multi_choice'].includes(type);
}

async function parseWithAI() {
  parsing.value = true;
  error.value = '';
  try {
    // Save config
    if (aiConfig.value.apiBase) localStorage.setItem('ai-api-base', aiConfig.value.apiBase);
    if (aiConfig.value.apiKey) localStorage.setItem('ai-api-key', aiConfig.value.apiKey);
    if (aiConfig.value.model) localStorage.setItem('ai-model', aiConfig.value.model);

    const json = await apiPost('/ai/parse', {
      text: inputText.value,
      apiKey: aiConfig.value.apiKey || undefined,
      apiBase: aiConfig.value.apiBase || undefined,
      model: aiConfig.value.model || undefined,
    });
    if (json.success) {
      parsedQuestions.value = json.data.questions;
      if (parsedQuestions.value.length === 0) {
        error.value = 'AI 未能识别出任何题目，请检查文本内容或调整 AI 配置。';
        return;
      }
      step.value = 'review';
    } else {
      error.value = json.error || '识别失败';
    }
  } catch (e: any) {
    error.value = '网络错误: ' + e.message;
  } finally {
    parsing.value = false;
  }
}

async function importQuestions() {
  importing.value = true;
  try {
    const json = await apiPost('/ai/import', {
      questions: parsedQuestions.value,
      passageTitle: passageTitle.value || undefined,
      passageSubject: parsedQuestions.value[0]?.subject,
      passageCategory: parsedQuestions.value[0]?.category,
      passageContent: passageTitle.value ? inputText.value.slice(0, 2000) : undefined,
    });
    if (json.success) {
      importResult.value = json.data;
      step.value = 'done';
      toast('success', `成功导入 ${json.data.success} 道题目`);
    } else {
      toast('error', json.error || '导入失败');
    }
  } catch (e: any) {
    toast('error', '导入失败: ' + e.message);
  } finally {
    importing.value = false;
  }
}

function resetAll() {
  step.value = 'input';
  inputText.value = '';
  passageTitle.value = '';
  parsedQuestions.value = [];
  error.value = '';
}
</script>

<style scoped>
.ai-config {
  margin-top: 12px;
  padding: 12px;
  background: var(--bg);
  border-radius: var(--radius);
  border: 1px solid var(--border);
}
.ai-config summary {
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-secondary);
}

.review-card {
  border-left: 3px solid var(--primary);
}
.review-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.review-num {
  font-weight: 700;
  color: var(--primary);
  font-size: 14px;
  min-width: 60px;
}

details[open] summary {
  margin-bottom: 8px;
}
</style>
