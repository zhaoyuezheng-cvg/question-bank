<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">📥</span>
        批量导入
      </h1>
    </div>

    <!-- Format Help -->
    <div class="card" style="margin-bottom: 20px;">
      <div class="card-header">
        <span class="card-title">📖 导入格式说明</span>
      </div>
      <div class="format-help">
        <p style="margin-bottom: 12px;">支持以下两种格式，系统自动识别：</p>
        <div class="format-grid">
          <div class="format-example">
            <strong>格式一：带标记格式</strong>
            <pre>【题干】补写出下列名句中的空缺部分：
(1) 风急天高猿啸哀，____________。
【答案】渚清沙白鸟飞回
【解析】注意"渚"字的写法
【标签】高考真题,古诗词
【来源】2024全国甲卷</pre>
          </div>
          <div class="format-example">
            <strong>格式二：编号格式</strong>
            <pre>1. 下列词语中加点字的读音完全正确的一项是（  ）
A. 踹（chuài）水   B. 筵（yàn）席
【答案】A
【解析】考查字音辨析</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Import Form -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">📝 导入配置</span>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">默认学科</label>
          <select class="form-select" v-model="defaultSubject">
            <option v-for="(label, key) in SUBJECT_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">默认分类</label>
          <input class="form-input" v-model="defaultCategory" placeholder="如：古诗词" />
        </div>
        <div class="form-group">
          <label class="form-label">默认子分类</label>
          <input class="form-input" v-model="defaultSubCategory" placeholder="如：默写" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">粘贴题目文本</label>
        <textarea
          class="form-textarea"
          v-model="importText"
          rows="15"
          placeholder="将包含【题干】【答案】等标记的文本粘贴到这里..."
        ></textarea>
      </div>

      <div class="btn-group">
        <button class="btn btn-primary" @click="handleImport" :disabled="importing || !importText.trim()">
          {{ importing ? '导入中...' : '🚀 开始导入' }}
        </button>
        <button class="btn" @click="clearAll">清空</button>
      </div>
    </div>

    <!-- Result -->
    <div v-if="result" class="card" style="margin-top: 20px;">
      <div class="card-header">
        <span class="card-title">📊 导入结果</span>
      </div>
      <div class="result-grid">
        <div class="result-item">
          <div class="result-value">{{ result.total }}</div>
          <div class="result-label">识别题目数</div>
        </div>
        <div class="result-item success">
          <div class="result-value">{{ result.success }}</div>
          <div class="result-label">导入成功</div>
        </div>
        <div class="result-item" :class="{ danger: result.failed > 0 }">
          <div class="result-value">{{ result.failed }}</div>
          <div class="result-label">导入失败</div>
        </div>
      </div>

      <div v-if="result.errors.length" style="margin-top: 16px;">
        <strong style="color: var(--danger);">错误详情：</strong>
        <ul style="margin-top: 8px; padding-left: 20px; font-size: 13px; color: var(--text-secondary); line-height: 1.8;">
          <li v-for="(err, i) in result.errors" :key="i">{{ err }}</li>
        </ul>
      </div>

      <div v-if="result.success > 0" style="margin-top: 16px;">
        <router-link to="/questions" class="btn btn-primary">查看已导入题目 →</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue';
import { SUBJECT_LABELS } from '@/utils/constants';
import type { ImportResult } from 'shared/src/index';

const toast = inject<(type: string, msg: string) => void>('toast')!;

const importText = ref('');
const defaultSubject = ref('chinese');
const defaultCategory = ref('');
const defaultSubCategory = ref('');
const importing = ref(false);
const result = ref<ImportResult | null>(null);

async function handleImport() {
  importing.value = true;
  result.value = null;

  try {
    const res = await fetch('/api/import/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: importText.value,
        subject: defaultSubject.value,
        category: defaultCategory.value,
        subCategory: defaultSubCategory.value,
      }),
    });
    const json = await res.json();
    if (json.success) {
      result.value = json.data;
      if (json.data.success > 0) {
        toast('success', `成功导入 ${json.data.success} 道题目`);
      }
    } else {
      toast('error', '导入失败: ' + (json.error || '未知错误'));
    }
  } catch (e: any) {
    toast('error', '导入失败: ' + e.message);
  } finally {
    importing.value = false;
  }
}

function clearAll() {
  importText.value = '';
  result.value = null;
}
</script>

<style scoped>
.format-help {
  font-size: 13px;
  color: var(--text-secondary);
}

.format-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 768px) {
  .format-grid {
    grid-template-columns: 1fr;
  }
}

.format-example {
  margin: 0;
}

.format-example strong {
  display: block;
  margin-bottom: 6px;
  color: var(--text);
}

.format-example pre {
  background: #1e293b;
  color: #e2e8f0;
  padding: 14px 16px;
  border-radius: var(--radius);
  font-size: 12px;
  overflow-x: auto;
  line-height: 1.6;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.result-item {
  text-align: center;
  padding: 20px;
  border-radius: var(--radius-lg);
  background: var(--bg);
}

.result-item.success {
  background: var(--success-light);
}

.result-item.danger {
  background: var(--danger-light);
}

.result-value {
  font-size: 32px;
  font-weight: 800;
  color: var(--primary);
}

.result-item.success .result-value {
  color: var(--success);
}

.result-item.danger .result-value {
  color: var(--danger);
}

.result-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
  font-weight: 500;
}
</style>
