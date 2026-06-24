import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
  },
  {
    path: '/questions',
    name: 'questions',
    component: () => import('@/views/QuestionListView.vue'),
  },
  {
    path: '/questions/new',
    name: 'question-new',
    component: () => import('@/views/QuestionEditView.vue'),
  },
  {
    path: '/questions/:id/edit',
    name: 'question-edit',
    component: () => import('@/views/QuestionEditView.vue'),
  },
  {
    path: '/papers',
    name: 'papers',
    component: () => import('@/views/PaperListView.vue'),
  },
  {
    path: '/papers/new',
    name: 'paper-new',
    component: () => import('@/views/PaperEditView.vue'),
  },
  {
    path: '/papers/:id',
    name: 'paper-detail',
    component: () => import('@/views/PaperDetailView.vue'),
  },
  {
    path: '/papers/:id/edit',
    name: 'paper-edit',
    component: () => import('@/views/PaperEditView.vue'),
  },
  {
    path: '/import',
    name: 'import',
    component: () => import('@/views/ImportView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
