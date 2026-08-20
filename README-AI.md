---
document_id: orglist-ai-guide
document_version: 1.1.0
application: Orglist
application_version: 2.0.0
language: zh-CN
audience:
  - ai_assistant
  - developer
  - user
scope:
  - search_grammar
  - user_operations
  - ai_intents
  - safety_boundaries
source_of_truth:
  search_engine: Orglist.html#compileSearch
  user_manual: README.md
last_updated: 2026-08-20
---

# Orglist AI 可读操作与搜索说明

## 0. 读取规则

- 本文使用稳定的章节 ID、字段表、前置条件和结果描述，供 AI 检索或加入系统提示词。
- 搜索语法以 `Orglist.html` 中的 `compileSearch` 为最终依据。
- AI 不应声称已经写回、删除、完成或修改任务，除非用户在界面中明确执行并看到成功结果。
- 默认不得向外部 AI 发送任务标题、正文、Org 原文、密码或 API Key。
- “应用搜索”只改变当前页面筛选，不修改 Org 文件。

## 1. 应用能力模型

```yaml
app:
  name: Orglist
  storage: local_first
  inputs:
    - local_org_folder
    - selected_org_files
    - webdav_org_files
  views:
    open: 待办
    today: 今天
    habits: 习惯
    upcoming: 未来
    overdue: 已逾期
    no-date: 无日期
    completed: 已完成
    countdown: 倒计时
    statistics: 统计
    all: 全部条目
    quadrant: 四象限
    calendar: 日历
  browse_modes:
    global: 全局清单
    hierarchy: 层级浏览
  persistence_rule: 页面内修改先成为未写回修改，只有用户主动写回才修改原文件或 WebDAV
```

## 2. 搜索语法规范

### 2.1 逻辑运算

| 目的 | 语法 | 示例 | 解释 |
|---|---|---|---|
| AND | 空格 | `报名 教师` | 同时满足两个条件 |
| OR | `|` 或 `OR` | `TODO | NEXT` | 满足任一组 |
| NOT | 条件前加 `-` | `报名 -宁波` | 包含报名且排除宁波 |
| 完整短语 | 单/双引号 | `"结构化 面试"` | 空格保留在同一条件内 |
| 正则 | `/表达式/标志` | `/教师|事业单位/i` | 标志只支持 `i m s u` |

规则：AND 的优先级高于 OR 分组。表达式 `A B | C D` 表示 `(A AND B) OR (C AND D)`。

### 2.2 可搜索字段

| 字段 | 中文别名 | 值类型 | 说明 |
|---|---|---|---|
| `grep` | 无 | 文本或正则 | 标题、正文、文件、路径、状态、优先级、标签、日期和属性的完整索引文本；不写字段时默认使用它 |
| `title` | `标题` | 文本或正则 | 标题 |
| `body` | `正文` | 文本或正则 | 正文 |
| `tag` | `标签` | 文本或正则 | Org 标签 |
| `file`, `files` | `文件` | 文本列表 | 文件名；逗号/中文逗号/分号连接的值表示 OR |
| `path` | `路径` | 文本列表 | 文件路径 |
| `status` | `状态` | 文本列表 | `TODO`、`NEXT`、`DONE`、`CNCL` 或自定义状态 |
| `priority` | `优先级` | 文本列表 | 常用值 `A`、`B`、`C` |
| `prop`, `property` | 无 | 属性表达式 | `KEY` 表示属性存在；`KEY=value` 表示值匹配 |
| `level` | `层级` | 数字或范围 | `2` 或 `1..3` |
| `scheduled` | `计划` | 日期表达式 | SCHEDULED |
| `deadline` | `截止` | 日期表达式 | DEADLINE |
| `closed` | `完成` | 日期表达式 | CLOSED |
| `orgdate` | 无 | 日期表达式 | 主 Org 日期属性 |
| `date` | 无 | 日期表达式 | 行动日期：SCHEDULED、DEADLINE、主 Org 日期和下一次农历日期 |
| `anydate` | 无 | 日期表达式 | 所有日期，额外包含 CLOSED |
| `modified` | `修改`, `最近修改` | 修改日期表达式 | `MODIFIED` 属性或页面跟踪的修改时间 |
| `countdown` | 无 | 倒计时表达式 | 倒计时状态或日期 |
| `has` | 无 | 字段存在性 | 某种日期、标签、正文、优先级等是否存在 |
| `overdue` | 无 | 布尔值 | 是否逾期 |
| `done` | 无 | 布尔值 | 是否完成 |
| `re`, `regex` | 无 | 正则 | `grep` 的别名 |

### 2.3 文本字段规则

- 文本匹配不区分大小写，默认是“包含”而不是“完全相等”。
- 字段中的逗号、中文逗号或分号表示多个候选值，命中任意一个即可。
- `file:all`、`file:*` 表示全部文件；不写 `file:` 时本来就是全部文件。
- 正则表达式最长 240 个字符。

```text
title:考试 tag:工作
file:inbox.org,nextactions.org
status:TODO,NEXT priority:A
grep:/CLOSED:.*2026-07/i
```

### 2.4 日期表达式

支持以下值：

```text
2026-08-20
today
yesterday
tomorrow
2026-08-01..2026-08-31
<2026-09-01
<=2026-08-31
>2026-08-01
>=2026-08-01
```

范围是闭区间。范围任一端可留空，例如 `deadline:..2026-08-31`。

`modified` 还支持 `7d`、`30d` 等最近天数表达式。

`countdown` 还支持：

| 值 | 含义 |
|---|---|
| `today` | 今天到期 |
| `active` | 今天及以后、当前可见的倒计时 |
| `overdue`, `expired` | 已过期 |
| `pinned` | 固定显示 |
| `next7d` | 未来 7 天（含今天） |
| `next30d` | 未来 30 天（含今天） |

### 2.5 存在性和布尔值

```text
has:deadline
has:date
has:anydate
has:countdown
has:tag
overdue:true
overdue:false
done:true
done:false
```

布尔值的假值为 `false`、`0`、`no`；其他值按真处理。

### 2.6 常用自然语言到搜索语法映射

| 自然语言 | 推荐表达式 |
|---|---|
| 今天未完成 | `date:today done:false` |
| 今天截止且未完成 | `deadline:today done:false` |
| 已逾期工作任务 | `overdue:true tag:工作` |
| 本月完成 | `closed:YYYY-MM-01..YYYY-MM-last` |
| 没有日期的待办 | `done:false -has:date` |
| A 优先级 TODO 或 NEXT | `priority:A status:TODO,NEXT` |
| 两个指定文件中的报名任务 | `file:inbox.org,nextactions.org 报名` |
| 最近 7 天修改 | `modified:7d` |
| 未来 7 天倒计时 | `countdown:next7d` |

AI 生成“本周”“本月”等范围时，应根据当前日期换算成明确的 `YYYY-MM-DD..YYYY-MM-DD`，不要把不支持的中文相对日期直接写入搜索框。

## 3. 搜索和筛选的叠加关系

```yaml
result_rule:
  relationship: AND
  inputs:
    - current_view
    - selected_file
    - status_filter
    - priority_filter
    - tag_filter
    - date_field_and_range
    - search_expression
```

如果 AI 搜索结果为空，应先提示用户检查顶部筛选条件，因为 AI 生成的表达式会继续与现有筛选叠加。

## 4. 用户操作说明

### OP-OPEN-LOCAL：打开本地 Org

- 前置条件：使用 Chrome 或 Edge。
- 操作：点击左侧“打开 Org 文件夹”，选择含 `.org` 文件的目录并授权。
- 结果：加载目录中的 Org；目录授权方式通常允许写回。
- 备用：使用“选择一个或多个文件”，但浏览器可能只能下载修改副本。

### OP-SEARCH：普通搜索

- 操作：保持顶部“AI”按钮未激活，在搜索框输入表达式。
- 行为：输入时即时筛选；Enter 记录搜索历史；Esc 或 `×` 清空。
- 帮助：点击“搜索语法”。

### OP-AI：AI 搜索和问答

- 前置条件：设置 → AI 助手中启用并填写 API 地址、模型和鉴权信息。
- 操作：点击搜索框内“AI”，输入自然语言，按 Enter。
- 搜索意图：AI 返回表达式；应用先经过本地语法校验，成功后自动关闭 AI 面板并切回普通搜索结果界面。
- 解释意图：AI 根据本文说明功能步骤。
- 操作意图：AI 只能建议打开清单、设置、新增窗口、清除筛选或切换浏览模式。
- 退出：Esc、面板 `×` 或再次点击“AI”。

### OP-ADD：新增条目

- 操作：点击顶部橙色 `＋`。
- 单条：选择文件、位置、标题、状态、优先级、标签、计划/截止日期和正文。
- 批量：切换“批量新增”，每行一条，检查预览后新增；最多 300 条。
- 安全：新增先留在页面内，仍需用户主动写回。

### OP-EDIT：编辑条目

- 打开条目详情。
- “可视化编辑”修改常用字段；“编辑原文”修改当前 Org 区块。
- “编辑整个文件”修改完整文件。
- 修改完成后检查页面提示，再决定写回或下载。

### OP-BATCH：批量操作

- 点击顶部 `☑`，或使用条目滑动/拖动手势进入批量选择。
- 可批量修改状态、优先级、标签、日期，移动为子项，删除或写回涉及的文件。
- 删除和写回属于高影响操作，AI 只能解释步骤，不得自动执行。

### OP-SAVE：保存和写回

| 动作 | 结果 |
|---|---|
| 应用到当前页面 | 仅更新内存中的当前页面 |
| 写回原文件 | 修改已经授权的本地文件或 WebDAV 文件 |
| 下载副本 | 生成新文件，不覆盖原文件 |

刷新页面前若有未写回修改，应先写回或下载，否则可能丢失。

### OP-WEBDAV：WebDAV

- Windows 推荐双击 `OrglistWebDAV.cmd`，在自动打开的页面配置连接，以避开浏览器 CORS。
- 设置中填写服务器地址、用户名、密码、目录和递归选项，再测试并读取清单。
- Android 可直接配置 WebDAV；具体安装和权限见 `README-Android.md`。

### OP-AI-SETTINGS：AI 设置

| 设置 | 含义 |
|---|---|
| 启用 | 控制搜索框能否进入 AI 模式 |
| 配置预设 | 默认 `DeepSeek V4 Flash`；自动填写官方地址、Chat Completions 协议、模型和 Bearer 鉴权 |
| 接口协议 | 默认 `Chat Completions`；自定义服务也可选择 `Responses` |
| API 地址 | 默认 `https://api.deepseek.com/chat/completions`；可填基础地址或完整接口路径 |
| 模型 | 默认 `deepseek-v4-flash`；自定义时填写服务商支持的模型 ID |
| 鉴权 | Bearer、`api-key`、`x-api-key` 或无需鉴权 |
| API Key | 发给配置的 API 服务；默认只保存在当前标签页会话 |
| 记住 Key | 勾选后保存在当前浏览器本地存储 |
| 分享元数据 | 只分享文件名、标签、状态和筛选摘要，不分享标题/正文/Org 原文 |
| 额外请求头 | JSON 对象；配置备份时会被清空 |
| 补充指令 | 用户对回答风格或行为的附加要求 |

默认 DeepSeek 配置如下：

```yaml
preset: deepseek-flash
api_format: chat
api_url: https://api.deepseek.com/chat/completions
resolved_endpoint: https://api.deepseek.com/chat/completions
model: deepseek-v4-flash
auth: Authorization Bearer
```

使用 `OrglistWebDAV.cmd` 打开的页面时，AI 请求会经本机桥接转发，可减少 CORS 问题。API Key 和额外请求头不会进入配置备份。

## 5. AI 意图与允许动作

```json
{
  "mode": "search | explain | action",
  "message": "给用户的简短中文回答",
  "searchQuery": "合法搜索表达式或空字符串",
  "action": {
    "name": "open_view | open_settings | open_add | clear_filters | switch_mode",
    "args": {}
  }
}
```

允许动作：

| 动作 | 参数 | 是否修改 Org |
|---|---|---|
| `open_view` | `view` 为第 1 节视图键 | 否 |
| `open_settings` | `section` 为设置章节键 | 否 |
| `open_add` | 无 | 否，只打开新增窗口 |
| `clear_filters` | 无 | 否 |
| `switch_mode` | `mode=global|hierarchy` | 否 |

禁止 AI 动作：写回、下载、删除、完成任务、编辑任务、保存密码、安装插件、发送通知、修改提醒记录。

## 6. 故障判断

| 现象 | 优先检查 |
|---|---|
| AI 按钮要求配置 | 设置 → AI 助手是否已启用 |
| 401/403 | API Key、鉴权头和模型权限 |
| 404 | 接口协议是否与服务商匹配、地址补全后的路径和模型名是否存在 |
| 浏览器无法直连/CORS | 改用 `OrglistWebDAV.cmd` 打开的页面 |
| AI 返回格式错误 | 模型是否能按 JSON 指令输出；重试或换模型 |
| AI 搜索为空 | 当前清单、文件、状态、优先级、标签和日期筛选是否叠加过严 |
| 修改刷新后丢失 | 修改只应用在页面，尚未写回或下载 |

## 7. AI 回答原则

1. 先识别用户要“找任务”“问功能”还是“打开页面”。
2. 找任务时优先输出最短、合法、可验证的搜索表达式。
3. 不确定字段或功能时引用本文，不创造不存在的语法或按钮。
4. 涉及写回、删除、批量修改、插件或密码时说明风险和确认点。
5. 搜索无结果时解释筛选叠加关系，不直接判断“没有任务”。
6. 把“已经执行”和“建议用户执行”严格区分。

## 8. 安全边界

- AI 可自动应用的唯一状态变化是当前页面的搜索表达式；这不会修改文件。
- AI 建议动作必须来自第 5 节允许列表，并由用户点击后执行。
- 写回、删除、完成、编辑、批量修改、密码保存、插件安装和提醒记录维护不在 AI 动作权限内。
- 配置导出不包含 API Key，并会清空 AI 额外请求头。
