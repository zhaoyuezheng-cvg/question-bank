import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Question, QuestionFilter, PaginatedResponse } from 'shared/src/index';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api';

export const useQuestionStore = defineStore('questions', () => {
  const questions = ref<Question[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(20);
  const totalPages = ref(0);
  const loading = ref(false);
  const currentQuestion = ref<Question | null>(null);
  const filter = ref<QuestionFilter>({});

  async function fetchQuestions(newFilter?: QuestionFilter) {
    if (newFilter) {
      filter.value = { ...newFilter };
      page.value = newFilter.page || 1;
    }
    loading.value = true;
    try {
      const params = new URLSearchParams();
      const f = filter.value;
      if (f.subject) params.set('subject', f.subject);
      if (f.category) params.set('category', f.category);
      if (f.subCategory) params.set('subCategory', f.subCategory);
      if (f.type) params.set('type', f.type);
      if (f.difficulty) params.set('difficulty', String(f.difficulty));
      if (f.tags?.length) params.set('tags', f.tags.join(','));
      if (f.keyword) params.set('keyword', f.keyword);
      if ((f as any).sortBy) params.set('sortBy', (f as any).sortBy);
      params.set('page', String(page.value));
      params.set('pageSize', String(pageSize.value));

      const json = await apiGet<PaginatedResponse<Question>>(`/questions?${params}`);
      if (json.success) {
        questions.value = json.data!.items;
        total.value = json.data!.total;
        totalPages.value = json.data!.totalPages;
      }
    } finally {
      loading.value = false;
    }
  }

  async function fetchQuestion(id: string) {
    const json = await apiGet<Question>(`/questions/${id}`);
    if (json.success) {
      currentQuestion.value = json.data!;
    }
    return json.data;
  }

  async function createQuestion(data: Partial<Question>) {
    const json = await apiPost('/questions', data);
    if (json.success) await fetchQuestions();
    return json;
  }

  async function updateQuestion(id: string, data: Partial<Question>) {
    const json = await apiPut(`/questions/${id}`, data);
    if (json.success) await fetchQuestions();
    return json;
  }

  async function deleteQuestion(id: string) {
    const json = await apiDelete(`/questions/${id}`);
    if (json.success) await fetchQuestions();
    return json;
  }

  async function batchDelete(ids: string[]) {
    const json = await apiPost('/questions/batch-delete', { ids });
    if (json.success) await fetchQuestions();
    return json;
  }

  return {
    questions, total, page, pageSize, totalPages, loading,
    currentQuestion, filter,
    fetchQuestions, fetchQuestion, createQuestion,
    updateQuestion, deleteQuestion, batchDelete,
  };
});
