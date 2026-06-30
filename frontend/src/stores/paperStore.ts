import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ExamPaper } from 'shared/src/index';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api';

export const usePaperStore = defineStore('papers', () => {
  const papers = ref<ExamPaper[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const currentPaper = ref<ExamPaper | null>(null);

  async function fetchPapers(page = 1, pageSize = 20, subject?: string) {
    loading.value = true;
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (subject) params.set('subject', subject);

      const json = await apiGet(`/papers?${params}`);
      if (json.success) {
        papers.value = json.data.items;
        total.value = json.data.total;
      }
    } finally {
      loading.value = false;
    }
  }

  async function fetchPaper(id: string) {
    const json = await apiGet(`/papers/${id}`);
    if (json.success) currentPaper.value = json.data;
    return json.data;
  }

  async function createPaper(data: Partial<ExamPaper> & { questionIds?: string[] }) {
    const json = await apiPost('/papers', data);
    if (json.success) await fetchPapers();
    return json;
  }

  async function updatePaper(id: string, data: Partial<ExamPaper> & { questionIds?: string[] }) {
    const json = await apiPut(`/papers/${id}`, data);
    if (json.success) await fetchPapers();
    return json;
  }

  async function deletePaper(id: string) {
    const json = await apiDelete(`/papers/${id}`);
    if (json.success) await fetchPapers();
    return json;
  }

  return {
    papers, total, loading, currentPaper,
    fetchPapers, fetchPaper, createPaper, updatePaper, deletePaper,
  };
});
