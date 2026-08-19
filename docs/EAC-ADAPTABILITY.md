# 第四部分:EAC 平台适配度

> EAC(DeepSeek Harness EAC 桌面版)是本插件的目标宿主。以下逐项说明
> 插件对 EAC 各机制的适配度与配合方式。

### 4.1 桌面壳内置插件机制(适配度:完全适配)
- EAC 以内置插件形式分发:`resources/app/assets/plugins/` 为内置源,启动时
  `copyPluginPackage` 同步到 profile 的 node_modules,`cordis.patch.yml` 声明
  挂载行。本插件保持该形态:`assets` 与 `src` 源码仓库同步,更新/重装后
  自动恢复,不会因客户端升级丢失。
- 依赖(shar/potrace/puppeteer-core)可解析于 EAC 的 profile/agent 依赖树;
  缺失时工具懒加载降级并提示安装命令,不阻塞 EAC 启动。

### 4.2 原生设置体系(适配度:完全适配)
- 设置全部通过 `dsh-settings` 命名空间 `tool-vision` 暴露,EAC 原生
  「设置 → 视觉模型」页展示与编辑,热加载即时生效。
- 不引入独立设置页/设置卡;`requestGuard` 等新增项以原生设置项形态出现,
  与 EAC 设置 UI 的 schema 渲染完全兼容。

### 4.3 纯文本主模型与请求管道(适配度:完全适配)
- EAC 主模型(如 deepseek-v4-flash)为 chat-completions 纯文本适配器,请求
  中任何图片块都会被整体拒绝。插件通过 `agent/pre-step` 把图片**在进入
  持久化日志之前**改写为 `[图片: <路径>]` 标记,请求自日志推导 → 满足
  log-reconstruction invariant,prompt 准入不再触发。
- EAC 对 `llm/stream` 请求对象 `deepFreeze`(不可改写):requestGuard 因此
  采用诊断模式(告警 + 透传),真实防线为递归桥接 + 历史修复——这是对
  EAC 设计约束的主动适配,而非绕过。

### 4.4 附件体系(适配度:完全适配)
- EAC `attachments` 服务内容寻址存储(sha256 附件 id)、`readImage` 返回
  Uint8Array:插件已针对 Uint8Array 做 Buffer 包装(base64 正确性),文件
  读取统一 stat 预检 + 20MB 上限,与 EAC 附件准入(maxImageBytes 放宽补丁)
  配合。

### 4.5 系统提示装配(适配度:完全适配)
- 通过 EAC `systemPrompt.section()` 注册 `tool-vision-image-bridge` 规则段
  (图片标记含义、inspect_image 调用规则、内容安全指引),模型从装配层读取,
  对话记录只留短标记。服务缺失时降级 warn,不影响桥接功能。

### 4.6 宿主版本契约(适配度:完全适配)
- 基于 dsh-tool-vision 0.3.10 的 rc.6/rc.7 服务契约(settings/tools/llm/
  attachments),未引入新宿主 API;EAC v4.1.0 环境下验证通过。

### 4.7 浏览器端集成(适配度:完全适配)
- client.js 为手写 ModuleLoader bundle,随 EAC WebView 注入,无构建步骤;
  与 EAC 主题令牌(如 `--dsw-alias-*`)协同,深浅色主题均可读。

### 4.8 与其他 EAC 插件共存(适配度:良好)
- 与 dsh-bridge-preview(内联预览)联动:预览插件识别新老两种桥接标记,
  图像加载成功后隐藏标记文本,用户界面只留内联图像。
- 与侧边栏类插件(任务面板/临时会话)互不干扰:视觉插件不占用右缘热区,
  不修改其他插件的 DOM。

### 4.9 已知的 EAC 限制与对策

| EAC 限制 | 对策 |
|---|---|
| 纯文本适配器拒绝图片块 | pre-step 递归桥接 + 历史修复,请求永不带图 |
| llm/stream 请求 deepFreeze,waterfall next 无参 | requestGuard 诊断化,不伪装可改写 |
| 免费视觉端点限流(429) | 自动退避重试 + 失败契约 ok:false 防模型空转 |
| 端点内容安全过滤 | VISION_CONTENT_FILTERED 明确提示,指引换图 |
| 附件 Uint8Array | Buffer 包装,base64 正确 |
| 空容器/常驻 DOM 类插件干扰(如侧边栏判定) | 判定基于内部实际渲染元素(已修) |

---
