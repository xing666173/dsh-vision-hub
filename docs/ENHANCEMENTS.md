# 第一部分:新增与修改,及相对原项目的优点

### 1.1 相对 dsh-vision-router(ysr666)的取舍

router 是一个重型视觉插件:14 个工具 + 五级供应商降级链 + 独立设置卡 + 模型路由
区分 + 渐进式工具挂载 + 自更新/诊断等机制。我们**只取其工具语义**,砍掉架构。

| 保留(移植) | 砍掉 |
|---|---|
| 14 个工具的 prompt 设计、参数契约、像素后处理(裁剪/取色/抠图/矢量化/像素对比/截图) | 五级供应商降级链、本地 Ollama/LM Studio、模型路由区分 |
| 内容哈希缓存、统一降采样、potrace worker 防阻塞 | 独立设置卡、渐进式挂载、vision_activate 激活机制 |
| 长截图 OCR 的防幻觉策略(JPEG 去 alpha、EMPTY 哨兵、超长重试) | 回合记忆/熔断器等韧性层(单端点下不需要) |
| 结构化失败契约(ok:false / 代码化错误) | router 的 provider 组合权重体系 |

**优点**:router 的"视觉识别效果"全部保留,而复杂度大幅下降——一个 OpenAI 兼容
端点(baseURL/apiKey/model)驱动全部工具,没有模型选择负担,设置形态与 EAC 原生
一致,用户不需要理解 provider 链。

### 1.2 相对 dsh-tool-vision(Scorp1o117,0.3.10)的新增

1. **14 个像素级视觉工具**:vision_describe / ground / detect / crop / pixel_diff /
   ocr / long_screenshot_ocr / trace / extract_foreground / colors /
   html_screenshot / screenshot / present / materialize,全部走与 inspect_image
   相同的单一端点,零新增配置。
2. **系统提示下沉**:桥接标记从大段指令缩短为 `[图片: <路径>]`,使用规则注册为
   系统提示段(tool-vision-image-bridge),模型从 prompt 装配层读取规则,对话
   记录保持干净,请求重建 invariant 不受影响。
3. **内容安全识别**:端点拒绝敏感图片时返回 `VISION_CONTENT_FILTERED` +
   明确中文提示,不再误报"服务不可用",模型据此告知用户换图而非重试。
4. **限流/瞬时故障自动重试**:429/408/5xx 感知 Retry-After 退避重试(最多 3 次),
   免费端点高峰期可用性显著提升。
5. **附件字节安全**:attachments 服务返回 Uint8Array,base64 编码先转 Buffer
   (修复"逗号数字串"导致 GLM 400 的致命 bug)。
6. **递归桥接与历史修复**:嵌套图片块(tool/result 内部)也能桥接;启动后自动
   修复历史日志中的残留图片块(覆盖 user/message 与 tool/result)。
7. **导出文件安全**:文件名消毒(消除 NTFS ADS 冒号陷阱),写前内容比对防前缀
   碰撞覆盖;启动时清理 7 天前的导出文件。
8. **模型调用质量**:所有工具统一 4MP 降采样;max_tokens 截断(finish_reason=
   length)明确提示;缓存 key 含端点/模型身份,失败结果不缓存(防缓存中毒)。
9. **长截图 OCR 上限**:120s 总预算、40 chunk 上限、取消检查、首块失败即停,
   杜绝"57 chunk × 114 分钟"失控。
10. **读取安全**:文件读取前 stat 预检(防大文件 OOM),attachment 分支统一
    20MB 上限;相对路径工作区 containment。
11. **HTML 截图禁网**:兑现描述承诺,仅放行 file:/data:/blob:,其余请求中断,
    防恶意本地页外联。
12. **EXT_BY_MEDIA 统一**:BMP/AVIF/SVG/ICO 附件桥接不再断链。

### 1.3 相对 0.3.10 的修改

- 桥接提示格式:`[User sent an image..., exported to: ..., Inspect it with the
  inspect_image tool...]` → `[图片: <路径>]`(规则下沉系统提示)。
- `requestGuard` 配置项:因 DSH agent-loop 对请求对象 deepFreeze + cordis
  waterfall 的 next() 无参,llm/stream 层无法改写消息,改为**诊断模式**(检测
  到带图请求输出明确告警并透传),真实防线是递归桥接 + 历史修复。
- 依赖:新增 sharp / potrace / puppeteer-core(工具所需,懒加载,缺失时给出
  安装提示,不影响其余工具)。
- inspect_image 描述补充 `[图片: <path>]` 标记说明与内容安全提示语义。

### 1.4 优点小结

- **轻量**:单端点、零模型路由、设置全在 EAC 原生设置页,无需理解 provider 体系。
- **效果好**:router 的像素工具语义原样保留;OCR/取色/定位/对比等质量不降。
- **稳**:Uint8Array/缓存/重试/预算/预检等修复消除了一整类线上故障。
- **安全**:路径 containment、禁网截图、导出消毒、内容安全识别。
- **体验**:对话干净(短标记 + 内联预览),限流自动扛,失败有明确指引。

---
