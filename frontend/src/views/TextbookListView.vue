<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">📚</span>
        教材目录
      </h1>
      <div class="btn-group">
        <button class="btn" @click="seedDefault">📦 预置鲁教版</button>
        <button class="btn" @click="showImport = true">📥 导入目录</button>
        <button class="btn btn-primary" @click="showAdd = true">➕ 新建目录</button>
      </div>
    </div>

    <!-- List -->
    <div v-if="!books.length && !loading" class="card empty-state" style="padding: 32px;">
      <div class="empty-state-icon">📚</div>
      <p>暂无教材目录</p>
      <button class="btn btn-primary" style="margin-top: 12px;" @click="seedDefault">📦 预置鲁教版七年级目录</button>
    </div>

    <div v-for="book in books" :key="book.id" class="card book-card">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span class="tag" :style="{ background: SUBJECT_COLORS[book.subject as keyof typeof SUBJECT_COLORS] + '18', color: SUBJECT_COLORS[book.subject as keyof typeof SUBJECT_COLORS] }">
              {{ getSubjectLabel(book.subject as any) }}
            </span>
            <span class="tag">{{ book.grade }}</span>
            <span v-if="book.version" class="tag">{{ book.version }}</span>
            <span v-if="book.volume" class="tag">{{ book.volume }}</span>
            <span v-if="book.isDefault" class="tag" style="background: var(--success-light); color: var(--success);">默认</span>
          </div>
          <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">{{ book.name }}</h3>
          <div style="font-size: 12px; color: var(--text-muted);">
            {{ book.chapters?.length || 0 }} 章 · {{ book.chapters?.reduce((s: number, c: any) => s + (c.sections?.length || 0), 0) || 0 }} 节
          </div>
        </div>
        <div class="btn-group">
          <button class="btn btn-sm" @click="expandedId = expandedId === book.id ? '' : book.id">
            {{ expandedId === book.id ? '收起' : '展开' }}
          </button>
          <button class="btn btn-sm btn-ghost" style="color: var(--danger);" @click="handleDelete(book)">🗑️</button>
        </div>
      </div>

      <!-- Expanded chapters -->
      <div v-if="expandedId === book.id" class="chapter-list">
        <div v-for="(ch, ci) in book.chapters" :key="ci" class="chapter-item">
          <div class="chapter-name" @click="ch._open = !ch._open">
            <span>{{ ch._open ? '📂' : '📁' }}</span>
            <strong>{{ ch.name }}</strong>
            <span style="font-size: 11px; color: var(--text-muted); margin-left: 4px;">({{ ch.sections?.length || 0 }} 节)</span>
          </div>
          <div v-if="ch._open && ch.sections?.length" class="section-list">
            <div v-for="(sec, si) in ch.sections" :key="si" class="section-item">
              {{ typeof sec === 'string' ? sec : sec.name }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Import Modal -->
    <div v-if="showImport" class="modal-overlay" @click.self="showImport = false">
      <div class="modal" style="max-width: 700px;">
        <div class="modal-title">📥 导入教材目录</div>
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">
          粘贴 JSON 格式的教材目录数据。可用外部 AI（千问/豆包）生成。
        </p>
        <div class="form-group">
          <textarea class="form-textarea" v-model="importText" rows="15"
            placeholder='粘贴 JSON 数据，格式：&#10;[&#10;  {&#10;    "name": "鲁教版数学八年级",&#10;    "subject": "math",&#10;    "grade": "八年级",&#10;    "version": "鲁教版",&#10;    "volume": "上册",&#10;    "chapters": [&#10;      { "name": "第一章 xxx", "sections": ["1.1 xxx", "1.2 xxx"] }&#10;    ]&#10;  }&#10;]'></textarea>
        </div>
        <div class="btn-group" style="justify-content: flex-end;">
          <button class="btn" @click="showImport = false">取消</button>
          <button class="btn btn-primary" @click="handleImport" :disabled="importing">
            {{ importing ? '导入中...' : '开始导入' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Add Modal -->
    <div v-if="showAdd" class="modal-overlay" @click.self="showAdd = false">
      <div class="modal" style="max-width: 600px;">
        <div class="modal-title">➕ 新建教材目录</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">名称</label>
            <input class="form-input" v-model="newBook.name" placeholder="如：鲁教版数学八年级上册" />
          </div>
          <div class="form-group">
            <label class="form-label">学科</label>
            <select class="form-select" v-model="newBook.subject">
              <option v-for="(label, key) in SUBJECT_LABELS" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">年级</label>
            <input class="form-input" v-model="newBook.grade" placeholder="七年级" />
          </div>
          <div class="form-group">
            <label class="form-label">版本</label>
            <input class="form-input" v-model="newBook.version" placeholder="鲁教版" />
          </div>
          <div class="form-group">
            <label class="form-label">册次</label>
            <input class="form-input" v-model="newBook.volume" placeholder="上册" />
          </div>
        </div>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
          创建后可在编辑页面添加章节和小节
        </p>
        <div class="btn-group" style="justify-content: flex-end;">
          <button class="btn" @click="showAdd = false">取消</button>
          <button class="btn btn-primary" @click="handleAdd">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { SUBJECT_LABELS, SUBJECT_COLORS, getSubjectLabel } from '@/utils/constants';
import { apiGet, apiPost, apiDelete } from '@/utils/api';

const toast = inject<(type: string, msg: string) => void>('toast')!;
const confirmFn = inject<(opts: any) => Promise<boolean>>('confirm')!;

const books = ref<any[]>([]);
const loading = ref(false);
const expandedId = ref('');
const showImport = ref(false);
const showAdd = ref(false);
const importText = ref('');
const importing = ref(false);
const newBook = ref({ name: '', subject: 'math', grade: '', version: '', volume: '' });

async function loadBooks() {
  loading.value = true;
  const json = await apiGet('/textbooks');
  if (json.success) books.value = json.data.map((b: any) => ({
    ...b,
    chapters: b.chapters.map((c: any) => ({ ...c, _open: false })),
  }));
  loading.value = false;
}

async function seedDefault() {
  await apiPost('/textbooks/seed', {});
  toast('success', '鲁教版七年级目录已预置');
  loadBooks();
}

async function handleImport() {
  importing.value = true;
  try {
    const parsed = JSON.parse(importText.value);
    const catalogs = Array.isArray(parsed) ? parsed : [parsed];
    const json = await apiPost('/textbooks/import', { catalogs });
    if (json.success) {
      toast('success', `成功导入 ${json.data?.success ?? 0} 个目录`);
      showImport.value = false;
      importText.value = '';
      loadBooks();
    } else {
      toast('error', json.error || '操作失败');
    }
  } catch (e: any) {
    toast('error', 'JSON 解析失败: ' + e.message);
  } finally {
    importing.value = false;
  }
}

async function handleAdd() {
  if (!newBook.value.name.trim()) { toast('error', '名称不能为空'); return; }
  await apiPost('/textbooks', newBook.value);
  showAdd.value = false;
  newBook.value = { name: '', subject: 'math', grade: '', version: '', volume: '' };
  toast('success', '目录已创建');
  loadBooks();
}

async function handleDelete(book: any) {
  const ok = await confirmFn({ message: `确定删除「${book.name}」？`, icon: '🗑️' });
  if (!ok) return;
  await apiDelete(`/textbooks/${book.id}`);
  toast('success', '已删除');
  loadBooks();
}

onMounted(loadBooks);
</script>

<style scoped>
.book-card { margin-bottom: 12px; }
.chapter-list { margin-top: 16px; border-top: 1px solid var(--border-light); padding-top: 12px; }
.chapter-item { margin-bottom: 8px; }
.chapter-name {
  display: flex; align-items: center; gap: 8px; cursor: pointer;
  padding: 6px 8px; border-radius: var(--radius-sm); transition: background var(--transition-fast);
}
.chapter-name:hover { background: var(--bg); }
.section-list { padding-left: 32px; margin-top: 4px; }
.section-item {
  padding: 4px 8px; font-size: 13px; color: var(--text-secondary);
  border-left: 2px solid var(--border-light); margin-bottom: 2px;
}
</style>
