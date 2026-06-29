<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">📊</span>
        学习报告
      </h1>
      <div class="btn-group">
        <button v-for="d in periodOptions" :key="d.value" class="btn btn-sm" :class="{ 'btn-primary': period === d.value }" @click="period = d.value; loadData()">
          {{ d.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <template v-else-if="report">
      <!-- Summary Cards -->
      <div class="stats-grid">
        <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          <div class="stat-icon">📝</div>
          <div class="stat-info">
            <div class="stat-value">{{ report.summary.totalAnswered }}</div>
            <div class="stat-label">总答题数</div>
          </div>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
          <div class="stat-icon">📅</div>
          <div class="stat-info">
            <div class="stat-value">{{ report.summary.studyDays }}</div>
            <div class="stat-label">学习天数</div>
          </div>
        </div>
        <div class="stat-card" :style="{ background: report.summary.accuracy >= 70 ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)' }">
          <div class="stat-icon">🎯</div>
          <div class="stat-info">
            <div class="stat-value">{{ report.summary.accuracy }}%</div>
            <div class="stat-label">正确率</div>
          </div>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
          <div class="stat-icon">📊</div>
          <div class="stat-info">
            <div class="stat-value">{{ report.summary.avgPerDay }}</div>
            <div class="stat-label">日均答题</div>
          </div>
        </div>
      </div>

      <!-- Error Stats -->
      <div class="card" style="margin-top: 16px;">
        <div class="card-header">
          <span class="card-title">📋 错题动态</span>
        </div>
        <div style="display: flex; gap: 32px; font-size: 15px;">
          <div><strong style="color: var(--danger);">+{{ report.summary.newErrors }}</strong> 道新错题</div>
          <div><strong style="color: var(--success);">{{ report.summary.resolvedErrors }}</strong> 道已掌握</div>
          <div>净增 <strong>{{ report.summary.newErrors - report.summary.resolvedErrors }}</strong> 道</div>
        </div>
      </div>

      <!-- Subject Stats -->
      <div class="card" style="margin-top: 16px;">
        <div class="card-header">
          <span class="card-title">📈 学科表现</span>
        </div>
        <div v-if="report.subjectStats.length" class="subject-bars">
          <div v-for="s in report.subjectStats" :key="s.subject" class="subject-bar-item">
            <div class="subject-bar-label">
              <span class="tag" :style="{ background: SUBJECT_COLORS[s.subject as Subject] + '18', color: SUBJECT_COLORS[s.subject as Subject] }">
                {{ getSubjectLabel(s.subject as Subject) }}
              </span>
              <span style="font-size: 13px; color: var(--text-secondary);">{{ s.total }} 题</span>
            </div>
            <div class="subject-bar">
              <div class="subject-bar-fill" :style="{ width: s.accuracy + '%', background: SUBJECT_COLORS[s.subject as Subject] }"></div>
            </div>
            <span class="subject-bar-value" :style="{ color: s.accuracy >= 70 ? 'var(--success)' : s.accuracy >= 50 ? 'var(--warning)' : 'var(--danger)' }">{{ s.accuracy }}%</span>
          </div>
        </div>
        <div v-else class="empty-state" style="padding: 24px;">暂无数据</div>
      </div>

      <!-- Difficulty Stats -->
      <div class="card" style="margin-top: 16px;">
        <div class="card-header">
          <span class="card-title">📊 难度分析</span>
        </div>
        <div v-if="report.difficultyStats.length" style="display: flex; gap: 12px; flex-wrap: wrap;">
          <div v-for="d in report.difficultyStats" :key="d.difficulty" class="diff-stat-card">
            <div class="diff-badge" :style="{ background: DIFFICULTY_COLORS[d.difficulty as Difficulty] }">
              {{ getDifficultyLabel(d.difficulty) }}
            </div>
            <div style="font-size: 13px; color: var(--text-secondary);">{{ d.total }} 题</div>
            <div style="font-size: 18px; font-weight: 700;" :style="{ color: d.accuracy >= 70 ? 'var(--success)' : d.accuracy >= 50 ? 'var(--warning)' : 'var(--danger)' }">
              {{ d.accuracy }}%
            </div>
          </div>
        </div>
        <div v-else class="empty-state" style="padding: 24px;">暂无数据</div>
      </div>

      <!-- Daily Trend -->
      <div class="card" style="margin-top: 16px;">
        <div class="card-header">
          <span class="card-title">📅 每日趋势</span>
        </div>
        <div v-if="report.trend.length" ref="trendChartRef" style="width: 100%; height: 250px;"></div>
        <div v-else class="empty-state" style="padding: 24px;">暂无数据</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import * as echarts from 'echarts';
import { getSubjectLabel, getDifficultyLabel, SUBJECT_COLORS, DIFFICULTY_COLORS } from '@/utils/constants';
import type { Subject, Difficulty } from 'shared/src/index';
import { apiGet } from '@/utils/api';

const period = ref('7');
const loading = ref(true);
const report = ref<any>(null);
const trendChartRef = ref<HTMLElement>();
let trendChart: echarts.ECharts | null = null;
let resizeHandler: (() => void) | null = null;

const periodOptions = [
  { label: '近7天', value: '7' },
  { label: '近14天', value: '14' },
  { label: '近30天', value: '30' },
];

async function loadData() {
  loading.value = true;
  try {
    const json = await apiGet(`/study/report?days=${period.value}`);
    if (json.success) {
      report.value = json.data;
      await nextTick();
      initChart();
    }
  } finally {
    loading.value = false;
  }
}

function initChart() {
  if (!trendChartRef.value || !report.value?.trend?.length) return;
  if (trendChart) trendChart.dispose();
  trendChart = echarts.init(trendChartRef.value);
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['答题数', '正确率'], bottom: 0 },
    xAxis: { type: 'category', data: report.value.trend.map((t: any) => t.date.slice(5)), axisLabel: { fontSize: 11 } },
    yAxis: [
      { type: 'value', name: '题数', minInterval: 1 },
      { type: 'value', name: '正确率%', max: 100 },
    ],
    series: [
      { name: '答题数', type: 'bar', data: report.value.trend.map((t: any) => t.total), itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] }, barWidth: '40%' },
      { name: '正确率', type: 'line', yAxisIndex: 1, data: report.value.trend.map((t: any) => t.accuracy), smooth: true, lineStyle: { color: '#10b981' }, itemStyle: { color: '#10b981' }, areaStyle: { color: 'rgba(16,185,129,0.1)' } },
    ],
    grid: { left: 50, right: 50, top: 20, bottom: 40 },
  });
  resizeHandler = () => trendChart?.resize();
  window.addEventListener('resize', resizeHandler);
}

onMounted(loadData);
onUnmounted(() => {
  trendChart?.dispose();
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
});
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
}
.stat-icon { font-size: 32px; }
.stat-value { font-size: 32px; font-weight: 800; line-height: 1.1; }
.stat-label { font-size: 13px; opacity: 0.85; margin-top: 4px; font-weight: 500; }

.subject-bars { display: flex; flex-direction: column; gap: 12px; }
.subject-bar-item { display: flex; align-items: center; gap: 12px; }
.subject-bar-label { display: flex; align-items: center; gap: 8px; min-width: 140px; }
.subject-bar { flex: 1; height: 10px; background: var(--border); border-radius: 5px; overflow: hidden; }
.subject-bar-fill { height: 100%; border-radius: 5px; transition: width 0.6s ease; }
.subject-bar-value { font-size: 14px; font-weight: 700; min-width: 45px; text-align: right; }

.diff-stat-card {
  flex: 1;
  min-width: 100px;
  text-align: center;
  padding: 16px;
  background: var(--bg);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
</style>
