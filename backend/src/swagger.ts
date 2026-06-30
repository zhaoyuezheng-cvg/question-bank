/**
 * Swagger/OpenAPI 文档配置
 */
export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: '私人题库系统 API',
    version: '3.1.0',
    description: '一个功能完善的个人题库管理系统 API 文档',
    license: { name: 'MIT' },
  },
  servers: [
    { url: '/api', description: 'API Server' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Question: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          subject: { type: 'string', enum: ['chinese', 'math', 'english', 'history', 'physics', 'chemistry', 'biology', 'geography', 'politics'] },
          category: { type: 'string' },
          subCategory: { type: 'string' },
          type: { type: 'string', enum: ['choice', 'multi_choice', 'fill_blank', 'short_answer', 'essay', 'true_false'] },
          difficulty: { type: 'integer', minimum: 1, maximum: 5 },
          content: { type: 'string' },
          options: { type: 'array', items: { type: 'string' }, nullable: true },
          answer: { type: 'string' },
          analysis: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' }, nullable: true },
          source: { type: 'string', nullable: true },
        },
      },
      ErrorBook: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          questionId: { type: 'string' },
          wrongAnswer: { type: 'string' },
          errorNote: { type: 'string', nullable: true },
          isResolved: { type: 'boolean' },
          easeFactor: { type: 'number' },
          interval: { type: 'integer' },
          repetitions: { type: 'integer' },
          nextReview: { type: 'integer' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
        },
      },
      PaginatedResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              items: { type: 'array' },
              total: { type: 'integer' },
              page: { type: 'integer' },
              pageSize: { type: 'integer' },
              totalPages: { type: 'integer' },
            },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        tags: ['认证'],
        summary: '用户登录',
        security: [],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', required: ['username', 'password'], properties: { username: { type: 'string' }, password: { type: 'string' } } } } },
        },
        responses: {
          '200': { description: '登录成功', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { token: { type: 'string' }, user: { type: 'object' } } } } } } } },
          '401': { description: '用户名或密码错误' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['认证'],
        summary: '注册用户（首次为管理员）',
        security: [],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', required: ['username', 'password'], properties: { username: { type: 'string' }, password: { type: 'string', minLength: 8 }, role: { type: 'string', enum: ['admin', 'user'] } } } } },
        },
        responses: {
          '201': { description: '注册成功' },
          '400': { description: '参数错误' },
        },
      },
    },
    '/questions': {
      get: {
        tags: ['题目'],
        summary: '查询题目列表',
        parameters: [
          { name: 'subject', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'difficulty', in: 'query', schema: { type: 'integer' } },
          { name: 'keyword', in: 'query', schema: { type: 'string' } },
          { name: 'tags', in: 'query', schema: { type: 'string' }, description: '逗号分隔的标签' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          '200': { description: '成功', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } },
        },
      },
      post: {
        tags: ['题目'],
        summary: '创建题目',
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Question' } } },
        },
        responses: {
          '201': { description: '创建成功' },
          '400': { description: '参数错误' },
        },
      },
    },
    '/questions/{id}': {
      get: {
        tags: ['题目'],
        summary: '获取题目详情',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: '成功' }, '404': { description: '题目不存在' } },
      },
      put: {
        tags: ['题目'],
        summary: '更新题目',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Question' } } } },
        responses: { '200': { description: '更新成功' }, '404': { description: '题目不存在' } },
      },
      delete: {
        tags: ['题目'],
        summary: '删除题目',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { name: 'force', in: 'query', schema: { type: 'boolean' } }],
        responses: { '200': { description: '删除成功' }, '409': { description: '存在关联数据' } },
      },
    },
    '/questions/batch-delete': {
      post: {
        tags: ['题目'],
        summary: '批量删除题目',
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } }, force: { type: 'boolean' } } } } } },
        responses: { '200': { description: '删除成功' } },
      },
    },
    '/questions/batch-update': {
      post: {
        tags: ['题目'],
        summary: '批量更新题目',
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } }, updates: { type: 'object' } } } } } },
        responses: { '200': { description: '更新成功' } },
      },
    },
    '/practice/errors': {
      get: {
        tags: ['练习'],
        summary: '获取错题列表',
        parameters: [
          { name: 'subject', in: 'query', schema: { type: 'string' } },
          { name: 'isResolved', in: 'query', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { '200': { description: '成功', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } } },
      },
      post: {
        tags: ['练习'],
        summary: '加入错题本',
        requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['questionId'], properties: { questionId: { type: 'string' }, wrongAnswer: { type: 'string' }, errorNote: { type: 'string' } } } } } },
        responses: { '201': { description: '添加成功' } },
      },
    },
    '/practice/errors/{id}/review': {
      post: {
        tags: ['练习'],
        summary: '错题复习评估（SM-2）',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['quality'], properties: { quality: { type: 'integer', minimum: 0, maximum: 5, description: '0=完全忘了 3=有印象 5=记得住' } } } } } },
        responses: { '200': { description: '复习结果' } },
      },
    },
    '/practice/submit': {
      post: {
        tags: ['练习'],
        summary: '提交答题',
        requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['questionId', 'userAnswer'], properties: { questionId: { type: 'string' }, userAnswer: { type: 'string' }, timeSpent: { type: 'integer' } } } } } },
        responses: { '200': { description: '答题结果' } },
      },
    },
    '/import/text': {
      post: {
        tags: ['导入'],
        summary: '文本批量导入',
        requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, subject: { type: 'string' }, category: { type: 'string' } } } } } },
        responses: { '200': { description: '导入结果' } },
      },
    },
    '/import/excel': {
      post: {
        tags: ['导入'],
        summary: 'Excel 文件导入',
        requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, subject: { type: 'string' }, category: { type: 'string' } } } } } },
        responses: { '200': { description: '导入结果' } },
      },
    },
    '/ai/parse': {
      post: {
        tags: ['AI'],
        summary: 'AI 解析试题',
        requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' }, apiKey: { type: 'string' }, apiBase: { type: 'string' }, model: { type: 'string' } } } } } },
        responses: { '200': { description: '解析结果' } },
      },
    },
    '/ai/generate': {
      post: {
        tags: ['AI'],
        summary: 'AI 生成题目',
        requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['topic'], properties: { topic: { type: 'string' }, subject: { type: 'string' }, type: { type: 'string' }, difficulty: { type: 'string' }, count: { type: 'integer' } } } } } },
        responses: { '200': { description: '生成结果' } },
      },
    },
    '/ai/explain': {
      post: {
        tags: ['AI'],
        summary: 'AI 解题详解',
        requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['content'], properties: { content: { type: 'string' }, answer: { type: 'string' }, type: { type: 'string' } } } } } },
        responses: { '200': { description: '详解结果' } },
      },
    },
    '/ai/rewrite': {
      post: {
        tags: ['AI'],
        summary: 'AI 改写题目',
        requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['content'], properties: { content: { type: 'string' }, answer: { type: 'string' }, targetDifficulty: { type: 'string' }, targetType: { type: 'string' } } } } } },
        responses: { '200': { description: '改写结果' } },
      },
    },
    '/exam/start': {
      post: {
        tags: ['考试'],
        summary: '开始考试',
        requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['paperId'], properties: { paperId: { type: 'string' }, timeLimit: { type: 'integer' } } } } } },
        responses: { '200': { description: '考试信息' } },
      },
    },
    '/flashcards/due': {
      get: {
        tags: ['闪卡'],
        summary: '获取待复习闪卡',
        parameters: [
          { name: 'subject', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { '200': { description: '待复习卡片列表' } },
      },
    },
    '/words': {
      get: {
        tags: ['单词'],
        summary: '单词列表',
        parameters: [
          { name: 'unit', in: 'query', schema: { type: 'string' } },
          { name: 'mastery', in: 'query', schema: { type: 'integer' } },
          { name: 'keyword', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: '成功' } },
      },
    },
    '/study/report': {
      get: {
        tags: ['学习'],
        summary: '学习报告',
        parameters: [
          { name: 'days', in: 'query', schema: { type: 'integer', default: 7 }, description: '统计天数' },
        ],
        responses: { '200': { description: '报告数据' } },
      },
    },
    '/backup/export': {
      get: {
        tags: ['备份'],
        summary: '导出全量备份',
        responses: { '200': { description: 'JSON 备份文件' } },
      },
    },
    '/backup/import': {
      post: {
        tags: ['备份'],
        summary: '导入备份',
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: '导入结果' } },
      },
    },
    '/export/errors/word': {
      get: {
        tags: ['导出'],
        summary: '错题本导出 Word',
        parameters: [
          { name: 'subject', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Word 文件' } },
      },
    },
    '/health': {
      get: {
        tags: ['系统'],
        summary: '健康检查',
        security: [],
        responses: { '200': { description: '服务正常' } },
      },
    },
  },
  tags: [
    { name: '认证', description: '用户登录注册' },
    { name: '题目', description: '题目 CRUD 及关联管理' },
    { name: '练习', description: '答题练习、错题本、收藏夹' },
    { name: '导入', description: '文本/Excel 批量导入' },
    { name: 'AI', description: 'AI 智能功能' },
    { name: '考试', description: '考试模拟' },
    { name: '闪卡', description: '闪卡间隔重复' },
    { name: '单词', description: '英语单词本' },
    { name: '学习', description: '学习计划与报告' },
    { name: '备份', description: '数据备份恢复' },
    { name: '导出', description: '数据导出' },
    { name: '系统', description: '系统健康检查' },
  ],
};
