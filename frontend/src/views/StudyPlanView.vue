<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">📅</span>
        学习计划
      </h1>
      <div class="btn-group">
        <button class="btn" :class="{ 'btn-primary': view === 'plan' }" @click="view = 'plan'">📋 今日计划</button>
        <button class="btn" :class="{ 'btn-primary': view === 'calendar' }" @click="view = 'calendar'">📅 打卡日历</button>
        <button class="btn" :class="{ 'btn-primary': view === 'weak' }" @click="view = 'weak'; loadWeakPoints()">🎯 薄弱点</button>
      </div>
    </div>

    <!-- Today Plan -->
    <div v-if="view === 'plan'">
      <div class="card">
        <div class="card-header">
          <span class="card-title">📋 {{ today }} 学习计划</span>
          <button class="btn btn-sm btn-primary" @click="showAddPlan = true">➕ 添加计划</button>
        </div>

        <div v-if="!plans.length" class="empty-state" style="padding: 24px;">
          <p>今天还没有学习计划，点击上方添加</p>
        </div>

        <div v-for="p in plans" :key="p.id" class="plan-item" :class="{ done: p.status === 'done' }">
          <div class="plan-info">
            <span class="tag" :style="{ background: SUBJECT_COLORS[p.subject as keyof typeof SUBJECT_COLORS] + '18', color: SUBJECT_COLORS[p.subject as keyof typeof SUBJECT_COLORS] }">
              {{ getSubjectLabel(p.subject as any) }}
            </span>
            <span class="plan-target">目标 {{ p.targetCount }} 题</span>
            <span v-if="p.doneCount > 0" class="plan-done">已完成 {{ p.doneCount }} 题</span>
          </div>
          <div class="btn-group">
            <button v-if="p.status !== 'done'" class="btn btn-sm btn-success" @click="markDone(p)">✅ 完成</button>
            <span v-else style="color: var(--success); font-weight: 600;">✅ 已完成</span>
            <button class="btn btn-sm btn-ghost" style="color: var(--danger);" @click="deletePlan(p.id)">🗑️</button>
          </div>
        </div>

        <!-- Streak -->
        <div v-if="streak > 0" style="margin-top: 16px; text-align: center; padding: 16px; background: var(--bg); border-radius: var(--radius-lg);">
          <div style="font-size: 36px; font-weight: 800; color: var(--primary);">🔥 {{ streak }}</div>
          <div style="font-size: 13px; color: var(--text-muted);">连续学习天数</div>
        </div>
      </div>

      <!-- Add Plan Modal -->
      <div v-if="showAddPlan" class="modal-overlay" @click.self="showAddPlan = false">
        <div class="modal">
          <div class="modal-title">添加学习计划</div>
          <div class="form-group">
            <label class="form-label">学科</label>
            <select class="form-select" v-model="newPlan.subject">
              <option v-for="(label, key) in SUBJECT_LABELS" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">目标题数</label>
            <input class="form-input" v-model.number="newPlan.targetCount" type="number" min="1" />
          </div>
          <div class="btn-group" style="justify-content: flex-end;">
            <button class="btn" @click="showAddPlan = false">取消</button>
            <button class="btn btn-primary" @click="addPlan">确定</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Calendar -->
    <div v-if="view === 'calendar'">
      <div class="card">
        <div class="card-header">
          <span class="card-title">📅 学习打卡日历</span>
          <div class="btn-group">
            <button class="btn btn-sm" @click="calendarMonth--; loadCheckins()">◀</button>
            <span style="font-weight: 600; min-width: 100px; text-align: center;">{{ calendarMonth + 1 }} 月</span>
            <button class="btn btn-sm" @click="calendarMonth++; loadCheckins()">▶</button>
          </div>
        </div>
        <div class="calendar-grid">
          <div v-for="day in calendarDays" :key="day.date" class="calendar-day" :class="{ today: day.isToday, checked: day.checked, empty: !day.date }">
            <div class="day-num">{{ day.day }}</div>
            <div v-if="day.checked" class="day-check">✅</div>
            <div v-if="day.count > 0" class="day-count">{{ day.count }}题</div>
          </div>
        </div>
        <div style="margin-top: 16px; display: flex; gap: 16px; justify-content: center; font-size: 13px; color: var(--text-secondary);">
          <span>本月打卡: <strong>{{ checkedDays }}</strong> 天</span>
          <span>本月做题: <strong>{{ monthTotal }}</strong> 题</span>
          <span>连续: <strong>{{ streak }}</strong> 天</span>
        </div>
      </div>
    </div>

    <!-- Weak Points -->
    <div v-if="view === 'weak'">
      <div v-if="!weakPoints.length" class="card empty-state" style="padding: 32px;">
        <p>暂无薄弱知识点数据，开始答题后自动生成</p>
      </div>
      <div v-for="(w, idx) in weakPoints" :key="idx" class="card weak-card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span class="tag">{{ getSubjectLabel(w.subject as any) }}</span>
              <span class="tag">{{ w.category }}</span>
              <span v-if="w.subType" class="tag" style="background: var(--primary-50); color: var(--primary);">{{ w.subType }}</span>
            </div>
            <div style="font-size: 13px; color: var(--text-secondary);">
              {{ w.total }} 题 · 正确 {{ w.correct }} · 正确率
              <strong :style="{ color: w.accuracy < 50 ? 'var(--danger)' : 'var(--warning)' }">{{ w.accuracy }}%</strong>
            </div>
          </div>
          <button class="btn btn-sm btn-primary" @click="practiceWeak(w)">🎯 专练</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue';
import { useRouter } from 'vue-router';
import { SUBJECT_LABELS, SUBJECT_COLORS, getSubjectLabel } from '@/utils/constants';

const router = useRouter();
const toast = inject<(type: string, msg: string) => void>('toast')!;

const view = ref<'plan' | 'calendar' | 'weak'>('plan');
const today = new Date().toISOString().slice(0, 10);
const plans = ref<any[]>([]);
const checkins = ref<any[]>([]);
const weakPoints = ref<any[]>([]);
const streak = ref(0);
const showAddPlan = ref(false);
const newPlan = ref({ subject: 'chinese', targetCount: 10 });
const calendarMonth = ref(new Date().getMonth());

const checkedDays = computed(() => checkins.value.filter(c => c.date.startsWith(`${new Date().getFullYear()}-${String(calendarMonth.value + 1).padStart(2, '0')}`)).length);
const monthTotal = computed(() => checkins.value.filter(c => c.date.startsWith(`${new Date().getFullYear()}-${String(calendarMonth.value + 1).padStart(2, '0')}`)).reduce((s, c) => s + c.totalDone, 0));

const calendarDays = computed(() => {
  const year = new Date().getFullYear();
  const month = calendarMonth.value;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: any[] = [];

  for (let i = 0; i < firstDay; i++) days.push({ date: '', day: '', checked: false, count: 0, isToday: false });

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const checkin = checkins.value.find(c => c.date === dateStr);
    days.push({
      date: dateStr,
      day: d,
      checked: !!checkin,
      count: checkin?.totalDone || 0,
      isToday: dateStr === today,
    });
  }
  return days;
});

async function loadPlans() {
  const res = await fetch(`/api/study/plan?date=${today}`);
  const json = await res.json();
  if (json.success) plans.value = json.data;
}

async function loadCheckins() {
  const res = await fetch('/api/study/checkin');
  const json = await res.json();
  if (json.success) {
    checkins.value = json.data;
    streak.value = json.data[0]?.streak || 0;
  }
}

async function addPlan() {
  await fetch('/api/study/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: today, ...newPlan.value }),
  });
  showAddPlan.value = false;
  loadPlans();
}

async function markDone(p: any) {
  await fetch(`/api/study/plan/${p.id}/done`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doneCount: p.targetCount }),
  });
  // Also checkin
  const totalDone = plans.value.reduce((s, pl) => s + (pl.status === 'done' ? pl.targetCount : 0), 0) + p.targetCount;
  await fetch('/api/study/checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: today, totalDone }),
  });
  toast('success', '🎉 今日计划已完成！');
  loadPlans();
  loadCheckins();
}

async function deletePlan(id: string) {
  // Simple delete via update status
  await fetch(`/api/study/plan/${id}/done`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doneCount: 0 }),
  });
  loadPlans();
}

async function loadWeakPoints() {
  const res = await fetch('/api/study/weak-points');
  const json = await res.json();
  if (json.success) weakPoints.value = json.data;
}

function practiceWeak(w: any) {
  const params = new URLSearchParams();
  params.set('subject', w.subject);
  if (w.category) params.set('category', w.category);
  if (w.subType) params.set('subType', w.subType);
  router.push({ path: '/practice', query: Object.fromEntries(params) });
}

onMounted(() => { loadPlans(); loadCheckins(); });
</script>

<style scoped>
.plan-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; border: 1px solid var(--border-light); border-radius: var(--radius);
  margin-bottom: 8px; transition: all var(--transition-fast);
}
.plan-item.done { background: var(--success-light); border-color: var(--success); }
.plan-info { display: flex; align-items: center; gap: 8px; }
.plan-target { font-size: 13px; color: var(--text-secondary); }
.plan-done { font-size: 12px; color: var(--success); font-weight: 600; }

.calendar-grid {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;
}
.calendar-day {
  aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  border-radius: var(--radius); background: var(--bg); font-size: 13px; position: relative;
  transition: all var(--transition-fast);
}
.calendar-day.empty { background: transparent; }
.calendar-day.today { border: 2px solid var(--primary); }
.calendar-day.checked { background: var(--success-light); }
.day-num { font-weight: 600; }
.day-check { font-size: 10px; }
.day-count { font-size: 9px; color: var(--text-muted); }

.weak-card { margin-bottom: 8px; }
</style>
