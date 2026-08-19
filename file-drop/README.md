# dsh-file-drop · 拖拽上传任意文件

DeepSeek Harness 持久插件：支持拖拽 / 点击上传**非图片**文件（PDF / Word / Excel / ZIP / 文本等），把文件路径直接写入输入框草稿，agent 即可读取。

## 工作方式（三个入口共用一套逻辑）

| 入口 | 行为 |
|---|---|
| **拖拽到窗口任意位置** | 全屏高亮浮层 → 松手 → 获取文件 |
| **回形针按钮**（输入框工具行左侧，28px 圆形原生风格） | 点击弹系统文件选择器（多选） |
| **hover 气泡** | 「点击选择文件 · 也可把文件拖到窗口任意位置」，1.5s 自动消失，每次 hover 循环 |

处理顺序（按可用性优先）：

1. **桌面壳直取原始路径**（Electron 壳 `window.dshDesktop`，`webUtils.getPathForFile`）—— 零上传，拿到 Finder 里的真实路径；
2. **拖拽自带路径**（`text/uri-list`，如 Obsidian 拖笔记）；
3. **上传兜底**（浏览器/无壳时）—— `POST /api/dsh-file-drop` 保存到 `<会话工作区>/.dsh-drops/`，返回工作区路径。

拖拽监听挂在 **window 捕获阶段**，先于 DSH 自带的 document 级图片拖拽处理拦截（`stopPropagation`），不会触发「不支持非图片格式」报错。

## 限制

- 单文件 ≤ 25MB（上传兜底路径；壳直取路径不受限）
- 文本类（md/txt/json/代码等）按文本直写；二进制（PDF/Word/Excel/ZIP 等）经 base64 解码写真实字节
- 壳直取路径指向工作区外文件时，agent 读取需要沙箱放行（workspace-write 模式下需权限配置）

## 文件结构

```
index.js          Host half：POST /api/dsh-file-drop 保存路由（node fs 原生能力）
client.js         Client half：回形针按钮 + 拖拽监听 + 状态徽标（__ModuleLoader__ 格式）
cordis.patch.yml  组合行（inject: webServer, sessions）
dsh.plugin.json   插件清单
```

## 安装（已安装，仅备查）

```sh
dsh plugin --profile web add "link:/Users/fanxiaokang/dsh-file-drop"
# 重启 dsh web 生效
```

## 配套桌面壳（可选，推荐）

`~/dsh-desktop/`：Electron 壳，`npm start` 启动。自动复用/拉起 `dsh web`（127.0.0.1:3080），
preload 注入 `window.dshDesktop`（`getPathForFile` + `drainDroppedPaths`），使拖拽直取 Finder 原始路径。

## 视觉引擎基准（modlens，2026-08 实测）

DSH 的 `modlens_read_image` 走 modlens 视觉桥；单次分析为一次结构化输出（summary/OCR/版面/语义/视觉/不确定项）。

| 引擎 | 完整流程耗时 | 结论 |
| :-- | :-- | :-- |
| 智谱 **glm-4v-flash**（国内直连，免费） | **~3.7s** | ✅ 当前配置，最优 |
| 智谱 glm-4.6v | ~17s | ❌ 慢 4.6 倍 |
| 智谱 glm-4.5v | 失败 | ❌ 不返回符合 schema 的 JSON |
| Gemini 免费 key（海外） | 429 额度用尽 / 兜底 codex-cli ~14s | ❌ |

配置位置：`~/.modlens/config.json`（`providers.openai` → `baseUrl=https://open.bigmodel.cn/api/paas/v4`，`model=glm-4v-flash`）。

> 端到端等待（贴图→回复）≈ 读图 3.7s + 模型回复生成时间，后者通常是主要部分。
