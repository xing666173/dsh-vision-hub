# 架构说明

dsh-vision-hub 是三个独立插件的组合,共享一条设计主线:
**纯文本模型 + 外部视觉端点 = 看得见的 EAC**。

## 数据流:一张图片的旅程

```
用户粘贴图片
   │
   ▼
tool-vision 桥接(agent/pre-step)
   │  图片导出到 <tmp>/dsh-vision-bridge,消息改写为 [图片: <路径>] 标记
   │  (使用规则已在系统提示段,模型读到标记即知调用 inspect_image)
   ▼
模型回合:inspect_image / vision_* 工具
   │  base64(data URL)→ 视觉端点(GLM/Qwen/…)
   ▼
视觉模型回答 → 工具结果回传对话
   │
   ▼
bridge-preview(浏览器端)
   │  扫描 [图片: …] 标记 → 同源回环路由取图 → 内联缩略图
   │  图像加载成功 → 隐藏标记文本(界面只剩图片)
   ▼
用户看到:气泡内的图片缩略图 + 模型的文字回答
```

## 三层职责

| 层 | 组件 | 职责 |
|---|---|---|
| 桥接层 | tool-vision(index.js) | pre-step 改写、导出、历史修复、系统提示规则、inspect_image |
| 工具层 | tool-vision(lib/vision-tools.js) | 14 个像素级工具,单端点驱动 |
| 展示层 | bridge-preview(client.js + 回环路由) | 内联缩略图、灯箱、标记文本隐藏 |

file-drop 与视觉无关,补齐"非图片文件"的输入通道。

## 关键设计约束

1. **请求重建 invariant**:桥接在 `agent/pre-step` 完成,改写结果进入持久化
   日志,`llm/stream` 请求严格从日志推导——不会 desync。
2. **数据层红线**:展示层的"隐藏"只发生在浏览器渲染;模型侧始终看到
   完整标记(含路径)。
3. **单端点**:所有视觉调用复用 tool-vision 的 baseURL/apiKey/model,
   无 provider 链、无模型路由——配置就是 12 项,零新增。
4. **安全边界**:回环路由只读导出目录(扩展名白名单/20MB/Host 本机/
   containment);工具读文件有路径 containment 与大小预检;HTML 截图禁网。

## 目录结构

```
dsh-vision-hub/
├── tool-vision/      # 增强版 dsh-tool-vision(桥接 + 15 工具)
│   ├── index.js      # 桥接/预览路由(上游)/inspect_image/工具注册
│   └── lib/          # 14 个像素级工具 + 辅助
├── bridge-preview/   # 内联预览插件(浏览器端 + 回环路由)
├── file-drop/        # 拖拽上传插件
├── docs/             # 架构/增强/适配/设置/FAQ/预设
└── screenshots/      # 效果截图
```
