# 📖 英语单词导入提示词

将以下提示词发送给通义千问、豆包、DeepSeek 等 AI，附上单词表，即可生成可直接导入的 JSON 数据。

---

## 提示词（直接复制使用）

```
请将以下英语单词表解析为 JSON 格式，用于导入题库系统的单词本。

输出格式：

```json
[
  {
    "word": "hello",
    "phonetic": "/həˈloʊ/",
    "meaning": "你好；打招呼",
    "partOfSpeech": "interj.",
    "example": "Hello, how are you?"
  }
]
```

字段说明：
- word：英文单词（小写）
- phonetic：音标（可选）
- meaning：中文释义（必填，多个释义用分号分隔）
- partOfSpeech：词性（可选，如 n./v./adj./adv./prep./conj./interj.）
- example：例句（可选）

规则：
1. 严格输出 JSON 数组，不要输出其他内容
2. 单词统一小写
3. 如果原文没有音标或例句，对应字段留空字符串 ""
4. 一词多义时，释义用分号分隔，如 "银行；河岸"
5. 如果单词表按单元组织，每个单元单独一个数组

请解析以下单词表：
（在此粘贴单词表）
```

---

## 使用方法

1. 复制上面的提示词
2. 发给 AI 助手（千问/豆包/DeepSeek 等）
3. 在末尾粘贴单词表（可以是课本单词表、试卷词汇等）
4. AI 返回 JSON 数据
5. 在题库系统中：进入「📖 单词本」页面
6. 点击「📥 导入」
7. 填写默认单元（如 Unit 1），粘贴 JSON，点击「开始导入」

## 示例

**输入（给 AI 的文本）：**
```
Unit 1 Here and Now
hello /həˈloʊ/ 你好
world /wɜːrld/ 世界
meet /miːt/ 遇见；会面
name /neɪm/ 名字
nice /naɪs/ 好的；令人愉快的
```

**输出（AI 返回的 JSON）：**
```json
[
  { "word": "hello", "phonetic": "/həˈloʊ/", "meaning": "你好", "partOfSpeech": "interj.", "example": "" },
  { "word": "world", "phonetic": "/wɜːrld/", "meaning": "世界", "partOfSpeech": "n.", "example": "" },
  { "word": "meet", "phonetic": "/miːt/", "meaning": "遇见；会面", "partOfSpeech": "v.", "example": "" },
  { "word": "name", "phonetic": "/neɪm/", "meaning": "名字", "partOfSpeech": "n.", "example": "" },
  { "word": "nice", "phonetic": "/naɪs/", "meaning": "好的；令人愉快的", "partOfSpeech": "adj.", "example": "" }
]
```

---

## 按 Unit 批量导入

如果要一次导入多个 Unit，让 AI 返回包含 unit 字段的数组：

```json
[
  { "word": "hello", "meaning": "你好", "unit": "Unit 1" },
  { "word": "watch", "meaning": "观看", "unit": "Unit 2" }
]
```

或者分批导入，每次指定不同的默认单元。
