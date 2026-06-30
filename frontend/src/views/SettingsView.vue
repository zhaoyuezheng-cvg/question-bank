<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">⚙️</span>
        设置
      </h1>
    </div>

    <!-- Tab Navigation -->
    <div class="btn-group" style="margin-bottom: 20px;">
      <button class="btn" :class="{ 'btn-primary': tab === 'profile' }" @click="tab = 'profile'">👤 个人信息</button>
      <button class="btn" :class="{ 'btn-primary': tab === 'password' }" @click="tab = 'password'">🔒 修改密码</button>
      <button v-if="isAdmin" class="btn" :class="{ 'btn-primary': tab === 'users' }" @click="tab = 'users'; loadUsers()">👥 用户管理</button>
      <button v-if="isAdmin" class="btn" :class="{ 'btn-primary': tab === 'audit' }" @click="tab = 'audit'; loadAuditLogs()">📋 审计日志</button>
    </div>

    <!-- Profile Tab -->
    <div v-if="tab === 'profile'" class="card" style="max-width: 500px;">
      <div class="card-header"><span class="card-title">👤 个人信息</span></div>
      <div class="form-group">
        <label class="form-label">用户名</label>
        <input class="form-input" :value="user?.username" disabled />
      </div>
      <div class="form-group">
        <label class="form-label">角色</label>
        <input class="form-input" :value="user?.role === 'admin' ? '管理员' : '普通用户'" disabled />
      </div>
      <div class="form-group">
        <label class="form-label">注册时间</label>
        <input class="form-input" :value="user?.createdAt ? new Date(user.createdAt * 1000).toLocaleString('zh-CN') : ''" disabled />
      </div>
    </div>

    <!-- Password Tab -->
    <div v-if="tab === 'password'" class="card" style="max-width: 500px;">
      <div class="card-header"><span class="card-title">🔒 修改密码</span></div>
      <div class="form-group">
        <label class="form-label">当前密码</label>
        <input class="form-input" v-model="pwdForm.oldPassword" type="password" placeholder="输入当前密码" />
      </div>
      <div class="form-group">
        <label class="form-label">新密码</label>
        <input class="form-input" v-model="pwdForm.newPassword" type="password" placeholder="至少8位，包含字母和数字" />
      </div>
      <div class="form-group">
        <label class="form-label">确认新密码</label>
        <input class="form-input" v-model="pwdForm.confirmPassword" type="password" placeholder="再次输入新密码" @keyup.enter="changePassword" />
      </div>
      <button class="btn btn-primary" @click="changePassword" :disabled="pwdLoading">
        {{ pwdLoading ? '修改中...' : '💾 修改密码' }}
      </button>
    </div>

    <!-- Users Tab (Admin) -->
    <div v-if="tab === 'users' && isAdmin">
      <div class="card">
        <div class="card-header">
          <span class="card-title">👥 用户管理</span>
          <button class="btn btn-primary btn-sm" @click="showAddUser = true">➕ 添加用户</button>
        </div>
        <table class="data-table">
          <thead>
            <tr><th>用户名</th><th>角色</th><th>注册时间</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td><strong>{{ u.username }}</strong></td>
              <td><span class="tag" :style="{ background: u.role === 'admin' ? 'var(--primary-50)' : '', color: u.role === 'admin' ? 'var(--primary)' : '' }">{{ u.role === 'admin' ? '管理员' : '用户' }}</span></td>
              <td style="font-size: 13px; color: var(--text-muted);">{{ new Date(u.createdAt * 1000).toLocaleString('zh-CN') }}</td>
              <td>
                <button v-if="u.id !== user?.id" class="btn btn-sm btn-ghost" style="color: var(--danger);" @click="deleteUser(u.id, u.username)">🗑️ 删除</button>
                <span v-else style="font-size: 12px; color: var(--text-muted);">当前用户</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Add User Modal -->
      <div v-if="showAddUser" class="modal-overlay" @click.self="showAddUser = false">
        <div class="modal">
          <div class="modal-title">➕ 添加用户</div>
          <div class="form-group">
            <label class="form-label">用户名</label>
            <input class="form-input" v-model="newUser.username" placeholder="用户名" />
          </div>
          <div class="form-group">
            <label class="form-label">密码</label>
            <input class="form-input" v-model="newUser.password" type="password" placeholder="至少8位，包含字母和数字" />
          </div>
          <div class="form-group">
            <label class="form-label">角色</label>
            <select class="form-select" v-model="newUser.role">
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          <div class="btn-group" style="margin-top: 20px; justify-content: flex-end;">
            <button class="btn" @click="showAddUser = false">取消</button>
            <button class="btn btn-primary" @click="addUser">创建</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Audit Tab (Admin) -->
    <div v-if="tab === 'audit' && isAdmin">
      <div class="card">
        <div class="card-header">
          <span class="card-title">📋 审计日志</span>
          <button class="btn btn-sm" @click="loadAuditLogs">🔄 刷新</button>
        </div>
        <table class="data-table">
          <thead>
            <tr><th>时间</th><th>用户</th><th>操作</th><th>对象</th><th>详情</th><th>IP</th></tr>
          </thead>
          <tbody>
            <tr v-for="log in auditLogs" :key="log.id">
              <td style="font-size: 12px; white-space: nowrap;">{{ new Date(log.createdAt * 1000).toLocaleString('zh-CN') }}</td>
              <td>{{ log.user?.username || '-' }}</td>
              <td><span class="tag">{{ formatAction(log.action) }}</span></td>
              <td>{{ log.target }} {{ log.targetId?.slice(0, 8) }}</td>
              <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ log.detail }}</td>
              <td style="font-size: 12px; color: var(--text-muted);">{{ log.ip }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="!auditLogs.length" style="text-align: center; padding: 32px; color: var(--text-muted);">暂无日志</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue';
import { useRouter } from 'vue-router';
import { apiGet, apiPost, apiDelete } from '@/utils/api';

const router = useRouter();
const toast = inject<(type: string, msg: string) => void>('toast')!;
const confirmFn = inject<(opts: any) => Promise<boolean>>('confirm')!;

const tab = ref<'profile' | 'password' | 'users' | 'audit'>('profile');
const user = ref<any>(null);
const isAdmin = computed(() => user.value?.role === 'admin');

// Password
const pwdForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' });
const pwdLoading = ref(false);

// Users
const users = ref<any[]>([]);
const showAddUser = ref(false);
const newUser = ref({ username: '', password: '', role: 'user' });

// Audit
const auditLogs = ref<any[]>([]);

async function loadUser() {
  const json = await apiGet('/auth/me');
  if (json.success) user.value = json.data;
  else router.push('/login');
}

async function changePassword() {
  if (!pwdForm.value.oldPassword || !pwdForm.value.newPassword) { toast('error', '请填写完整'); return; }
  if (pwdForm.value.newPassword.length < 8) { toast('error', '新密码至少8位'); return; }
  if (!/[a-zA-Z]/.test(pwdForm.value.newPassword) || !/[0-9]/.test(pwdForm.value.newPassword)) { toast('error', '新密码需包含字母和数字'); return; }
  if (pwdForm.value.newPassword !== pwdForm.value.confirmPassword) { toast('error', '两次输入不一致'); return; }

  pwdLoading.value = true;
  try {
    const json = await apiPost('/auth/change-password', { oldPassword: pwdForm.value.oldPassword, newPassword: pwdForm.value.newPassword });
    if (json.success) {
      toast('success', '密码修改成功，请重新登录');
      localStorage.removeItem('qb-token');
      localStorage.removeItem('qb-user');
      router.push('/login');
    } else {
      toast('error', json.error || '修改失败');
    }
  } finally {
    pwdLoading.value = false;
  }
}

async function loadUsers() {
  const json = await apiGet('/auth/users');
  if (json.success) users.value = json.data;
}

async function addUser() {
  if (!newUser.value.username || !newUser.value.password) { toast('error', '请填写完整'); return; }
  const json = await apiPost('/auth/register', newUser.value);
  if (json.success) {
    toast('success', '用户创建成功');
    showAddUser.value = false;
    newUser.value = { username: '', password: '', role: 'user' };
    loadUsers();
  } else {
    toast('error', json.error || '创建失败');
  }
}

async function deleteUser(id: string, username: string) {
  const ok = await confirmFn({ message: `确定删除用户「${username}」？`, icon: '⚠️' });
  if (!ok) return;
  const json = await apiDelete(`/auth/users/${id}`);
  if (json.success) { toast('success', '已删除'); loadUsers(); }
  else toast('error', json.error || '删除失败');
}

async function loadAuditLogs() {
  const json = await apiGet('/auth/audit-logs?pageSize=50');
  if (json.success) auditLogs.value = json.data.items;
}

function formatAction(action: string) {
  const map: Record<string, string> = { login: '🔐 登录', register: '📝 注册', delete: '🗑️ 删除', create: '➕ 创建', update: '✏️ 修改' };
  return map[action] || action;
}

onMounted(loadUser);
</script>
