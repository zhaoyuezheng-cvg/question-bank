<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">📊</span>
        仪表盘
      </h1>
      <div class="btn-group">
        <router-link to="/questions/new" class="btn btn-primary">➕ 新建题目</router-link>
        <router-link to="/papers/new" class="btn">📄 新建试卷</router-link>
        <router-link to="/import" class="btn">📥 批量导入</router-link>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div v-for="s in stats" :key="s.label" class="stat-card" :style="{ background: s.gradient }">
        <div class="stat-icon-wrap">
          <span class="stat-icon">{{ s.icon }}</span>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </div>
      </div>
    </div>

    <!-- Subject Distribution -->
    <div class="card" style="margin-top: 24px;">
      <div class="card-header">
        <span class="card-title">📈 学科分布</span>
      </div>
      <div v-if="subjectStats.length" class="subject-bars">
        <div v-for="item in subjectStats" :key="item.subject" class="bar-item">
          <span class="bar-label">{{ getSubjectLabel(item.subject as Subject) }}</span>
          <div class="bar-track">
            <div
              class="bar-fill"
              :style="{
                width: item.pct + '%',
                background: `linear-gradient(90deg, ${SUBJECT_COLORS[item.subject as Subject]}, ${SUBJECT_COLORS[item.subject as Subject]}88)`
              }"
            ></div>
          </div>
          <span class="bar-count">{{ item.count }}</span>
        </div>
      </div>
      <div v-else class="empty-state" style="padding: 32px;">
        <p>暂无数据</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getSubjectLabel, SUBJECT_COLORS } from '@/utils/constants';
import type { Subject } from 'shared/src/index';

const stats = ref([
  { icon: '📝', label: '题目总数', value: 0, gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { icon: '📄', label: '试卷数量', value: 0, gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { icon: '🎯', label: '已答题数', value: 0, gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { icon: '📊', label: '正确率', value: '0%', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
]);

const subjectStats = ref<{ subject: string; count: number; pct: number }[]>([]);

onMounted(async () => {
  try {
    const [qRes, pRes] = await Promise.all([
      fetch('/api/questions?pageSize=1'),
      fetch('/api/papers?pageSize=1'),
    ]);
    const qJson = await qRes.json();
    const pJson = await pRes.json();

    stats.value[0].value = qJson.data?.total || 0;
    stats.value[1].value = pJson.data?.total || 0;

    try {
      const psRes = await fetch('/api/practice/stats');
      const psJson = await psRes.json();
      if (psJson.success) {
        stats.value[2].value = psJson.data.totalAnswered;
        stats.value[3].value = psJson.data.accuracy + '%';
      }
    } catch {}

    try {
      const statsRes = await fetch('/api/questions/stats/summary');
      const statsJson = await statsRes.json();
      if (statsJson.success) {
        const max = Math.max(...statsJson.data.bySubject.map((s: any) => s._count), 1);
        subjectStats.value = statsJson.data.bySubject
          .map((s: any) => ({ subject: s.subject, count: s._count, pct: (s._count / max) * 100 }))
          .sort((a: any, b: any) => b.count - a.count);
      }
    } catch {}
  } catch (e) {
    console.error('Dashboard load error:', e);
  }
});
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border-radius: var(--radius-xl);
  color: white;
  box-shadow: var(--shadow-md);
  transition: transform var(--transition), box-shadow var(--transition);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}

.stat-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon {
  font-size: 26px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.stat-label {
  font-size: 13px;
  opacity: 0.85;
  margin-top: 4px;
  font-weight: 500;
}

/* Subject bars */
.subject-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bar-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bar-label {
  width: 48px;
  font-size: 13px;
  font-weight: 500;
  text-align: right;
  flex-shrink: 0;
  color: var(--text-secondary);
}

.bar-track {
  flex: 1;
  height: 24px;
  background: var(--bg);
  border-radius: 12px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 12px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 8px;
}

.bar-count {
  width: 36px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}
</style>
