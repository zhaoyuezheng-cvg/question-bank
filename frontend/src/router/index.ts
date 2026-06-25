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
    component: () => import('@/views/ErrorBookView.vue'),
    meta: { title: '错题本' },
  },
  {
    path: '/favorites',
    name: 'favorites',
    component: () => import('@/views/FavoritesView.vue'),
    meta: { title: '收藏夹' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Update page title
router.afterEach((to) => {
  const title = to.meta.title as string;
  if (title) {
    document.title = `${title} - 私人题库`;
  }
});

export default router;
