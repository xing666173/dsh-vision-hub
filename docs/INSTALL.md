# 安装说明

## 环境要求

- DeepSeek Harness EAC 桌面版(或任意 DSH profile,`web-desktop` 已实测);
- Node ≥ 20.18;
- 视觉端点:任意 OpenAI 兼容 `/chat/completions`(免费档见 docs/presets.md);
- 工具依赖:`sharp` / `potrace` / `puppeteer-core`(懒加载,缺失时仅相关
  工具降级并提示安装命令)。

## 安装方式

### 方式一:交给 Agent(推荐)

复制 README 中的提示词给任意 AI 助手,它会完成:取文件 → 装入 profile →
挂载确认 → 依赖检查 → 提示重启。

### 方式二:手动

```
tool-vision/     → profile 插件目录(或 assets/plugins 内置)
bridge-preview/  → profile 插件目录
file-drop/       → profile 插件目录
```

然后在 profile 的 `cordis.patch.yml` 确认/添加挂载行(或依赖各包内
`cordis.patch.yml` 自动挂载),并保证依赖可解析:

```bash
pnpm add sharp potrace puppeteer-core @deepseek-ai/schemastery
```

## 配置

`$DSH_HOME/settings.yaml` 的 `tool-vision` 段(或 EAC 设置 → 视觉模型),
热加载生效,通常无需重启;安装新代码后才需要重启 dsh。

## 从旧版本升级

- 旧桥接提示(长指令格式)在对话历史中仍可被预览与 inspect_image 识别,
  无需清理;
- 新导出文件名已消毒(不再含冒号);若旧文件被系统清理,对应旧提示会失效
  (属预期,新粘贴的图片不受影响)。

## 常见问题

见 docs/FAQ.md(400/429/内容过滤/依赖缺失等)。
