# 第二部分:适配性

### 2.1 DSH 宿主版本
- 基于 dsh-tool-vision 0.3.10(适配 DSH 0.1.0-rc.6/rc.7 的 settings/tools/
  llm/attachments 服务契约),修改未引入新宿主 API:
  - `ctx.get("systemPrompt")` 的 `section()` 为 DSH 既有服务(缺失时降级为
    warn,不影响功能)。
  - `ctx.tools.register` 使用与 0.3.10 相同的 defineTool 路径。
  - 桥接/修复沿用 `agent/pre-step` 与 `session.append` 既有机制。

### 2.2 模型适配
- **主模型(纯文本)**:deepseek-v4-flash 等 chat-completions 纯文本模型——
  图片经 pre-step 递归桥接为文本标记,请求不含图片块,prompt 准入与
  log-reconstruction invariant 均满足。
- **视觉端点**:任意 OpenAI 兼容 `/chat/completions`(已验证智谱
  GLM-4V-Flash;maxTokens 按端点上限配置,截断有提示)。
- **多模态模型**:`multimodalModels` 白名单内的模型直收图片块,不走桥接。

### 2.3 设置体系适配
- 全部设置项(12 项)留在 EAC 原生设置页(dsh-settings 命名空间
  `tool-vision`),热加载即时生效,无需重启。
- 设置同时可写入 `$DSH_HOME/settings.yaml` 与 profile `cordis.patch.yml`。

### 2.4 平台适配
- Windows:桌面截屏走 PowerShell CopyFromScreen;桥接导出文件已消毒,规避
  NTFS ADS 问题;路径处理兼容盘符/反斜杠。
- 浏览器端:client.js 为手写 ModuleLoader bundle,无构建依赖,新旧桥接标记
  格式均可扫描。

### 2.5 部署适配
- 内置插件(assets)与独立安装(profile node_modules)两种形态一致;工具依赖
  缺失时懒加载降级并给出安装命令,不影响其他工具。

---
