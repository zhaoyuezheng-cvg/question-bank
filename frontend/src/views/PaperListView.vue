<template>
  <div>
    <div class="card-header" style="margin-bottom: 16px;">
      <h1>📄 试卷管理</h1>
      <router-link to="/papers/new" class="btn btn-primary">➕ 新建试卷</router-link>
    </div>

    <div class="card">
      <div v-if="store.loading" class="loading">加载中...</div>
      <div v-else-if="!store.papers.length" class="empty-state">
        <div class="empty-state-icon">📄</div>
        <p>暂无试卷，点击右上角「新建试卷」开始组卷</p>
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>试卷名称</th>
            <th style="width: 80px;">学科</th>
            <th style="width: 80px;">题数</th>
            <th style="width: 80px;">总分</th>
            <th style="width: 160px;">创建时间</th>
            <th style="width: 160px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in store.papers" :key="p.id">
            <td>
              <strong>{{ p.title }}</strong>
              <div v-if="p.description" style="font-size: 12px; color: var(--text-muted);">{{ p.description }}</div>
            </td>
            <td>
              <span class="tag">{{ getSubjectLabel(p.subject) }}</span>
            </td>
            <td>{{ (p as any).questions?.length || 0 }}</td>
            <td>{{ p.totalScore || '-' }}</td>
            <td>{{ formatDate(p.createdAt) }}</td>
            <td>
              <div class="btn-group">
                <router-link :to="`/papers/${p.id}`" class="btn btn-sm">查看</router-link>
                <router-link :to="`/papers/${p.id}/edit`" class="btn btn-sm">编辑</router-link>
                <button class="btn btn-sm btn-danger" @click="handleDelete(p.id)">删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { usePaperStore } from '@/stores/paperStore';
import { getSubjectLabel } from '@/utils/constants';

const store = usePaperStore();

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleString('zh-CN');
}

async function handleDelete(id: string) {
  if (!confirm('确定删除此试卷？')) return;
  await store.deletePaper(id);
}

onMounted(() => store.fetchPapers());
</script>
