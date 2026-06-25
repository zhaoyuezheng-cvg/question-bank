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
        <p style="margin-bottom: 12px;">支持以下方式导入，系统自动识别：</p>
        <div class="format-grid">
          <div class="format-example">
            <strong>方式一：粘贴文本（带标记）</strong>
            <pre>【题干】补写出下列名句中的空缺部分：
(1) 风急天高猿啸哀，____________。
【答案】渚清沙白鸟飞回
【解析】注意"渚"字的写法
【标签】高考真题,古诗词
【来源】2024全国甲卷</pre>
          </div>
          <div class="format-example">
            <strong>方式二：粘贴文本（编号格式）</strong>
            <pre>1. 下列词语中加点字的读音完全正确的一项是（  ）
A. 踹（chuài）水   B. 筵（yàn）席
【答案】A
【解析】考查字音辨析</pre>
          </div>
        </div>
        <div style="margin-top: 12px;">
          <strong>方式三：上传文件</strong>
          <span style="font-size: 13px; color: var(--text-secondary); margin-left: 8px;">
            支持 .txt / .docx / .pdf 文件，自动提取文本后导入
          </span>
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

      <!-- File Upload -->
      <div class="form-group">
        <label class="form-label">📁 上传文件（可选，支持 .txt / .docx / .pdf）</label>
        <div class="file-upload-area" @click="fileInput?.click()" @drop.prevent="handleDrop" @dragover.prevent>
          <input ref="fileInput" type="file" accept=".txt,.docx,.pdf" style="display:none;" @change="handleFileSelect" />
          <div v-if="!fileName" class="file-upload-hint">
            <span style="font-size: 32px;">📁</span>
            <p>点击选择文件 或 拖拽文件到此处</p>
            <p style="font-size: 12px; color: var(--text-muted);">支持 .txt .docx .pdf</p>
          </div>
          <div v-else class="file-info">
            <span>📄 {{ fileName }}</span>
            <button class="btn btn-sm" @click.stop="clearFile">清除</button>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">或直接粘贴题目文本</label>
        <textarea
          class="form-textarea"
          v-model="importText"
          rows="15"
          :placeholder="fileName ? '文件内容已加载，也可在此追加文本...' : '将包含【题干】【答案】等标记的文本粘贴到这里...'"
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
const fileName = ref('');
const fileInput = ref<HTMLInputElement>();

async function handleFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  await processFile(file);
}

async function handleDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  await processFile(file);
}

async function processFile(file: File) {
  fileName.value = file.name;
  const ext = file.name.split('.').pop()?.toLowerCase();

  try {
    if (ext === 'txt') {
      const text = await file.text();
      importText.value = text;
      toast('success', `已加载 ${file.name}`);
    } else if (ext === 'docx') {
      // Extract text from docx using simple approach
      const arrayBuffer = await file.arrayBuffer();
      const text = await extractDocxText(arrayBuffer);
      importText.value = text;
      toast('success', `已从 ${file.name} 提取文本`);
    } else if (ext === 'pdf') {
      // For PDF, read as text (basic extraction)
      const arrayBuffer = await file.arrayBuffer();
      const text = await extractPdfText(arrayBuffer);
      importText.value = text;
      toast('success', `已从 ${file.name} 提取文本`);
    } else {
      toast('error', '不支持的文件格式，请使用 .txt / .docx / .pdf');
      fileName.value = '';
    }
  } catch (err: any) {
    toast('error', '文件解析失败: ' + err.message);
    fileName.value = '';
  }
}

async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  try {
    const uint8 = new Uint8Array(buffer);
    const raw = new TextDecoder("latin1").decode(uint8);
    const matches = raw.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
    if (!matches || matches.length === 0) throw new Error("no text");
    const text = matches.map(m => {
      const c = m.match(/>([^<]+)</);
      return c ? c[1] : "";
    }).join("");
    if (!text.trim()) throw new Error("empty");
    return text;
  } catch {
    throw new Error("docx 解析失败，建议复制文档内容后粘贴到文本框");
  }
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  // Basic PDF text extraction - look for stream content
  try {
    const text = new TextDecoder('latin1').decode(buffer);
    // Very basic: extract text between BT and ET markers
    const matches = text.match(/BT[\s\S]*?ET/g);
    if (!matches) throw new Error('无法提取');

    const lines: string[] = [];
    for (const m of matches) {
      const tj = m.match(/\(([^)]*)\)\s*Tj/g);
      if (tj) {
        for (const t of tj) {
          const content = t.match(/\(([^)]*)\)/);
          if (content?.[1]) lines.push(content[1]);
        }
      }
    }
    if (lines.length === 0) throw new Error('无法提取文本');
    return lines.join('\n');
  } catch {
    throw new Error('PDF 解析较复杂，建议复制 PDF 中的文本后粘贴导入');
  }
}

function clearFile() {
  fileName.value = '';
  if (fileInput.value) fileInput.value.value = '';
}

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
  fileName.value = '';
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

.file-upload-area {
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: 12px;
}
.file-upload-area:hover { border-color: var(--primary); background: var(--primary-50); }
.file-upload-hint p { margin: 8px 0 0; color: var(--text-secondary); }
.file-info { display: flex; align-items: center; justify-content: center; gap: 12px; font-weight: 500; }

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
