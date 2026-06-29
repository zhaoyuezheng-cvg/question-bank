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

    <!-- First-use Onboarding -->
    <div v-if="!loading && stats[0].value === 0" class="onboarding-card">
      <div style="font-size: 48px; margin-bottom: 16px;">🚀</div>
      <h2 style="font-size: 20px; margin-bottom: 8px;">欢迎使用私人题库！</h2>
      <p style="color: var(--text-secondary); margin-bottom: 24px; max-width: 400px;">开始你的学习之旅，按以下步骤快速上手：</p>
      <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 400px;">
        <router-link to="/import" class="onboarding-step">
          <span style="font-size: 24px;">📥</span>
          <div>
            <div style="font-weight: 600;">导入题目</div>
            <div style="font-size: 13px; color: var(--text-secondary);">从文本或 Excel 批量导入</div>
          </div>
          <span style="margin-left: auto; color: var(--primary);">→</span>
        </router-link>
        <router-link to="/questions/new" class="onboarding-step">
          <span style="font-size: 24px;">✏️</span>
          <div>
            <div style="font-weight: 600;">手动添加</div>
            <div style="font-size: 13px; color: var(--text-secondary);">逐题创建你的题库</div>
          </div>
          <span style="margin-left: auto; color: var(--primary);">→</span>
        </router-link>
        <router-link to="/ai-import" class="onboarding-step">
          <span style="font-size: 24px;">🤖</span>
          <div>
            <div style="font-weight: 600;">AI 智能导入</div>
            <div style="font-size: 13px; color: var(--text-secondary);">粘贴文本，AI 自动解析题目</div>
          </div>
          <span style="margin-left: auto; color: var(--primary);">→</span>
        </router-link>
      </div>
    </div>

    <!-- Review Reminder -->
    <div v-if="reviewInfo.flashcardDue > 0 || reviewInfo.errorDue > 0" class="review-banner">
      <div class="review-banner-content">
        <span style="font-size: 28px;">📋</span>
        <div>
          <div style="font-weight: 700; font-size: 15px;">今日待复习</div>
          <div style="font-size: 13px; color: var(--text-secondary);">
            <span v-if="reviewInfo.flashcardDue > 0">🃏 闪卡 <strong>{{ reviewInfo.flashcardDue }}</strong> 张</span>
            <span v-if="reviewInfo.flashcardDue > 0 && reviewInfo.errorDue > 0" style="margin: 0 8px;">·</span>
            <span v-if="reviewInfo.errorDue > 0">❌ 错题 <strong>{{ reviewInfo.errorDue }}</strong> 道</span>
          </div>
        </div>
        <div style="margin-left: auto; display: flex; gap: 8px;">
          <router-link v-if="reviewInfo.flashcardDue > 0" to="/flashcards" class="btn btn-primary btn-sm">开始复习闪卡</router-link>
          <router-link v-if="reviewInfo.errorDue > 0" to="/practice/errors" class="btn btn-sm">复习错题</router-link>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="charts-row">
      <!-- Subject Pie -->
      <div class="card chart-card">
        <div class="card-header">
          <span class="card-title">📈 学科分布</span>
        </div>
        <div ref="pieChartRef" class="chart-container"></div>
      </div>

      <!-- Difficulty Bar -->
      <div class="card chart-card">
        <div class="card-header">
          <span class="card-title">📊 难度分布</span>
        </div>
        <div ref="barChartRef" class="chart-container"></div>
      </div>
    </div>

    <!-- Type distribution -->
    <div class="card" style="margin-top: 16px;">
      <div class="card-header">
        <span class="card-title">📋 题型分布</span>
      </div>
      <div ref="typeChartRef" class="chart-container" style="height: 200px;"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import * as echarts from 'echarts';
import { getSubjectLabel, SUBJECT_COLORS, DIFFICULTY_LABELS, DIFFICULTY_COLORS, QUESTION_TYPE_LABELS } from '@/utils/constants';
import type { Subject, Difficulty, QuestionType } from 'shared/src/index';
import { apiGet } from '@/utils/api';

const pieChartRef = ref<HTMLElement>();
const barChartRef = ref<HTMLElement>();
const typeChartRef = ref<HTMLElement>();

const reviewInfo = ref({ flashcardDue: 0, errorDue: 0 });

const stats = ref([
  { icon: '📝', label: '题目总数', value: 0, gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { icon: '📄', label: '试卷数量', value: 0, gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { icon: '🎯', label: '已答题数', value: 0, gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { icon: '📊', label: '正确率', value: '0%', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
]);

let statsData: any = null;
const chartInstances: echarts.ECharts[] = [];
let resizeHandler: (() => void) | null = null;

function getEChartsTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    textColor: isDark ? '#94a3b8' : '#64748b',
    bgColor: 'transparent',
  };
}

function initCharts() {
  if (!statsData) return;
  const theme = getEChartsTheme();

  // Pie chart - Subject distribution
  if (pieChartRef.value) {
    const pie = echarts.init(pieChartRef.value);
    chartInstances.push(pie);
    const pieData = statsData.bySubject.map((s: any) => ({
      name: getSubjectLabel(s.subject as Subject),
      value: s._count,
      itemStyle: { color: SUBJECT_COLORS[s.subject as Subject] },
    }));
    pie.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} 题 ({d}%)' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '50%'],
        data: pieData,
        label: { show: true, fontSize: 12, color: theme.textColor },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } },
      }],
    });
  }

  // Bar chart - Difficulty distribution
  if (barChartRef.value) {
    const bar = echarts.init(barChartRef.value);
    chartInstances.push(bar);
    const diffData = [1, 2, 3, 4, 5].map(d => {
      const found = statsData.byDifficulty.find((x: any) => x.difficulty === d);
      return { name: DIFFICULTY_LABELS[d as Difficulty], value: found?._count || 0 };
    });
    bar.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: diffData.map(d => d.name), axisLabel: { fontSize: 12, color: theme.textColor } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: theme.textColor } },
      series: [{
        type: 'bar',
        data: diffData.map((d, i) => ({
          value: d.value,
          itemStyle: { color: DIFFICULTY_COLORS[(i + 1) as Difficulty], borderRadius: [6, 6, 0, 0] },
        })),
        barWidth: '40%',
      }],
      grid: { left: 40, right: 16, top: 16, bottom: 30 },
    });
  }

  // Type chart
  if (typeChartRef.value) {
    const typeChart = echarts.init(typeChartRef.value);
    chartInstances.push(typeChart);
    const typeData = statsData.byType.map((t: any) => ({
      name: QUESTION_TYPE_LABELS[t.type as QuestionType] || t.type,
      value: t._count,
    }));
    typeChart.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: typeData.map((t: any) => t.name), axisLabel: { fontSize: 11, rotate: 15, color: theme.textColor } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: theme.textColor } },
      series: [{
        type: 'bar',
        data: typeData.map((t: any, i: number) => ({
          value: t.value,
          itemStyle: {
            color: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'][i % 6],
            borderRadius: [6, 6, 0, 0],
          },
        })),
        barWidth: '50%',
      }],
      grid: { left: 40, right: 16, top: 16, bottom: 30 },
    });
  }

  // 统一 resize handler
  resizeHandler = () => chartInstances.forEach(c => c.resize());
  window.addEventListener('resize', resizeHandler);
}

const loading = ref(true);

onUnmounted(() => {
  chartInstances.forEach(c => c.dispose());
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
});

onMounted(async () => {
  try {
    const [qJson, pJson] = await Promise.all([
      apiGet('/questions?pageSize=1'),
      apiGet('/papers?pageSize=1'),
    ]);

    stats.value[0].value = qJson.data?.total || 0;
    stats.value[1].value = pJson.data?.total || 0;

    const psJson = await apiGet('/practice/stats');
    if (psJson.success) {
      stats.value[2].value = psJson.data.totalAnswered;
      stats.value[3].value = psJson.data.accuracy + '%';
    }

    const statsJson = await apiGet('/questions/stats/summary');
    if (statsJson.success) {
      statsData = statsJson.data;
      await nextTick();
      initCharts();
    }

    // 加载待复习数量
    const [fcStats, errStats] = await Promise.all([
      apiGet('/flashcards/stats'),
      apiGet('/practice/errors/stats'),
    ]);
    if (fcStats.success) reviewInfo.value.flashcardDue = fcStats.data?.due || 0;
    if (errStats.success) reviewInfo.value.errorDue = errStats.data?.dueToday || 0;
  } catch (e) {
    console.error('Dashboard load error:', e);
  } finally {
    loading.value = false;
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

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}

.chart-card {
  min-height: 300px;
}

.chart-container {
  width: 100%;
  height: 250px;
}

@media (max-width: 768px) {
  .charts-row {
    grid-template-columns: 1fr;
  }
}

.review-banner {
  background: linear-gradient(135deg, var(--primary-50), var(--success-light));
  border: 1px solid var(--primary-200);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  margin-bottom: 16px;
}
.review-banner-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.onboarding-card {
  background: var(--bg-card);
  border: 2px dashed var(--primary-200);
  border-radius: var(--radius-xl);
  padding: 48px 32px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 16px;
}

.onboarding-step {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--bg);
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: var(--text);
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}
.onboarding-step:hover {
  border-color: var(--primary);
  background: var(--primary-50);
}
</style>
