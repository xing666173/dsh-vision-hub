# Changelog

## 2026-08-19 — dsh-vision-hub 视觉全家桶(重构发布)

仓库从「vision-router 移植」重构为「视觉全家桶」:一个仓库装下视觉工具箱、
桥接内联预览、拖拽文件上传三件套。

### 新增

- **tool-vision 0.4.0 增强版**(基于 dsh-tool-vision 0.3.10):
  - 14 个像素级视觉工具(vision_describe / ground / detect / crop / pixel_diff /
    colors / ocr / long_screenshot_ocr / trace / extract_foreground /
    html_screenshot / screenshot / present / materialize),单端点驱动;
  - 桥接标记极简化(`[图片: <路径>]`)+ 使用规则下沉系统提示段;
  - 内容安全识别(VISION_CONTENT_FILTERED)、限流/5xx 自动重试;
  - Uint8Array 编码修复、导出文件名消毒、长截图 OCR 预算、路径 containment 等
    稳定性与安全修复;
- **bridge-preview 0.1.1**:桥接内联预览,图像加载后隐藏标记文本;
- **file-drop 1.0.0**:拖拽上传非图片文件(PDF/Word/Excel/ZIP/文本);
- **测试与 CI**:21 个工具测试 + 4 个 manifest 测试 + bridge-preview 正则/路由
  测试;GitHub Actions(Node 22/24)自动运行;
- **文档体系**:docs/ 十二篇(架构/示例/对比/增强/适配/设置/EAC/FAQ/安装/
  预设/技巧/安全/迁移)+ 索引页 + 中英文 README + CHANGELOG。

### 变更

- 仓库内容整体替换(旧 vision-router 移植内容移除);
- 根 README 重写:三大组件介绍、效果截图、Agent 安装/配置提示词、致谢。

### 依赖

- tool-vision 新增:sharp / potrace / puppeteer-core(懒加载降级)。
