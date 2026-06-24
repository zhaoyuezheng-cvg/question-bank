import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Question, QuestionFilter, PaginatedResponse } from 'shared/src/index';

const API = '/api/questions';

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
      params.set('page', String(page.value));
      params.set('pageSize', String(pageSize.value));

      const res = await fetch(`${API}?${params}`);
      const json = await res.json();
      if (json.success) {
        const data: PaginatedResponse<Question> = json.data;
        questions.value = data.items;
        total.value = data.total;
        totalPages.value = data.totalPages;
      }
    } finally {
      loading.value = false;
    }
  }

  async function fetchQuestion(id: string) {
    const res = await fetch(`${API}/${id}`);
    const json = await res.json();
    if (json.success) {
      currentQuestion.value = json.data;
    }
    return json.data;
  }

  async function createQuestion(data: Partial<Question>) {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) await fetchQuestions();
    return json;
  }

  async function updateQuestion(id: string, data: Partial<Question>) {
    const res = await fetch(`${API}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) await fetchQuestions();
    return json;
  }

  async function deleteQuestion(id: string) {
    const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) await fetchQuestions();
    return json;
  }

  async function batchDelete(ids: string[]) {
    const res = await fetch(`${API}/batch-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    const json = await res.json();
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
