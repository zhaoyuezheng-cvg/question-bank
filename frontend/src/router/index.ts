import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { title: '仪表盘' },
  },
  {
    path: '/questions',
    name: 'questions',
    component: () => import('@/views/QuestionListView.vue'),
    meta: { title: '题目管理' },
  },
  {
    path: '/questions/new',
    name: 'question-new',
    component: () => import('@/views/QuestionEditView.vue'),
    meta: { title: '新建题目' },
  },
  {
    path: '/questions/:id/edit',
    name: 'question-edit',
    component: () => import('@/views/QuestionEditView.vue'),
    meta: { title: '编辑题目' },
  },
  {
    path: '/papers',
    name: 'papers',
    component: () => import('@/views/PaperListView.vue'),
    meta: { title: '试卷管理' },
  },
  {
    path: '/papers/new',
    name: 'paper-new',
    component: () => import('@/views/PaperEditView.vue'),
    meta: { title: '新建试卷' },
  },
  {
    path: '/papers/:id',
    name: 'paper-detail',
    component: () => import('@/views/PaperDetailView.vue'),
    meta: { title: '试卷详情' },
  },
  {
    path: '/papers/:id/edit',
    name: 'paper-edit',
    component: () => import('@/views/PaperEditView.vue'),
    meta: { title: '编辑试卷' },
  },
  {
    path: '/import',
    name: 'import',
    component: () => import('@/views/ImportView.vue'),
    meta: { title: '批量导入' },
  },
  {
    path: '/practice',
    name: 'practice',
    component: () => import('@/views/PracticeView.vue'),
    meta: { title: '答题练习' },
  },
  {
    path: '/practice/errors',
    name: 'error-book',
    component: () => import('@/views/ErrorBookEnhancedView.vue'),
    meta: { title: '错题本' },
  },
  {
    path: '/study',
    name: 'study',
    component: () => import('@/views/StudyPlanView.vue'),
    meta: { title: '学习计划' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/favorites',
    name: 'favorites',
    component: () => import('@/views/FavoritesView.vue'),
    meta: { title: '收藏夹' },
  },
  {
    path: '/words',
    name: 'words',
    component: () => import('@/views/WordBookView.vue'),
    meta: { title: '单词本' },
  },
  {
    path: '/textbooks',
    name: 'textbooks',
    component: () => import('@/views/TextbookListView.vue'),
    meta: { title: '教材目录' },
  },
  {
    path: '/ai-import',
    name: 'ai-import',
    component: () => import('@/views/AiImportView.vue'),
    meta: { title: 'AI 智能导入' },
  },
  {
    path: '/passages',
    name: 'passages',
    component: () => import('@/views/PassageListView.vue'),
    meta: { title: '阅读材料' },
  },
  {
    path: '/passages/new',
    name: 'passage-new',
    component: () => import('@/views/PassageEditView.vue'),
    meta: { title: '新建阅读材料' },
  },
  {
    path: '/passages/:id',
    name: 'passage-detail',
    component: () => import('@/views/PassageDetailView.vue'),
    meta: { title: '阅读材料详情' },
  },
  {
    path: '/passages/:id/edit',
    name: 'passage-edit',
    component: () => import('@/views/PassageEditView.vue'),
    meta: { title: '编辑阅读材料' },
  },
  {
    path: '/exam',
    name: 'exam',
    component: () => import('@/views/ExamView.vue'),
    meta: { title: '考试模拟' },
  },
  {
    path: '/flashcards',
    name: 'flashcards',
    component: () => import('@/views/FlashcardView.vue'),
    meta: { title: '闪卡记忆' },
  },
  {
    path: '/stats',
    name: 'stats',
    component: () => import('@/views/StatsView.vue'),
    meta: { title: '数据分析' },
  },
  {
    path: '/report',
    name: 'report',
    component: () => import('@/views/StudyReportView.vue'),
    meta: { title: '学习报告' },
  },
  {
    path: '/challenge',
    name: 'challenge',
    component: () => import('@/views/ChallengeView.vue'),
    meta: { title: '答题闯关' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { title: '设置' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 全局 loading bar
let loadingBarEl: HTMLDivElement | null = null;
let loadingTimer: ReturnType<typeof setTimeout> | null = null;

function showLoadingBar() {
  if (!loadingBarEl) {
    loadingBarEl = document.createElement('div');
    loadingBarEl.id = 'global-loading-bar';
    loadingBarEl.style.cssText = 'position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,#6366f1,#818cf8);z-index:99999;transition:width 0.3s ease;border-radius:0 2px 2px 0;';
    document.body.appendChild(loadingBarEl);
  }
  loadingBarEl.style.width = '0%';
  loadingBarEl.style.opacity = '1';
  // Animate to 70%
  loadingTimer = setTimeout(() => { if (loadingBarEl) loadingBarEl.style.width = '70%'; }, 50);
}

function hideLoadingBar() {
  if (loadingTimer) { clearTimeout(loadingTimer); loadingTimer = null; }
  if (loadingBarEl) {
    loadingBarEl.style.width = '100%';
    setTimeout(() => {
      if (loadingBarEl) loadingBarEl.style.opacity = '0';
      setTimeout(() => { if (loadingBarEl) loadingBarEl.style.width = '0%'; }, 300);
    }, 200);
  }
}

// 路由守卫：未登录跳转登录页
router.beforeEach((to, _from, next) => {
  showLoadingBar();
  const token = localStorage.getItem('qb-token');
  const isPublic = to.meta.public === true;

  if (!token && !isPublic) {
    next({ name: 'login', query: { redirect: to.fullPath } });
  } else if (token && to.name === 'login') {
    // 已登录时访问登录页，跳转首页
    next('/');
  } else {
    next();
  }
});

// Update page title + hide loading bar
router.afterEach((to) => {
  const title = to.meta.title as string;
  if (title) {
    document.title = `${title} - 私人题库`;
  }
  hideLoadingBar();
});

export default router;
