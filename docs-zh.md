# dsh-tool-vision 0.4.0 增强说明(相对原项目)

> 本文档梳理本地增强版相对两个上游项目(dsh-vision-router / dsh-tool-vision)的
> 新增、修改、优点、适配性与设置项适配。供仓库文档与评审使用。

---

## 第一部分:新增与修改,及相对原项目的优点

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

## 第二部分:适配性

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

## 第四部分:EAC 平台适配度

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

## 第三部分:我们做出的改变,及对 12 项设置的适配

### 3.1 改变总览(按类别)

| 类别 | 改变 |
|---|---|
| 能力 | 新增 14 个像素级视觉工具;inspect_image 描述增强 |
| 桥接 | 标记极简化 + 系统提示下沉;递归桥接(嵌套图片块);历史修复覆盖 tool/result |
| 请求安全 | requestGuard 诊断模式;内容安全识别(VISION_CONTENT_FILTERED) |
| 质量 | 统一 4MP 降采样;缓存 key 含端点身份;失败不缓存;截断提示 |
| 稳定性 | 429/5xx 自动重试;长 OCR 预算/上限/取消;Uint8Array 修复;文件预检 |
| 安全 | 导出消毒 + 防覆盖;路径 containment;HTML 截图禁网;导出清理 |
| 兼容 | EXT_BY_MEDIA 统一;新老桥接标记前端兼容;桥接预览联动(独立插件) |

### 3.2 12 项设置及其适配

EAC 原生设置页 `tool-vision` 命名空间现有 **12 项**,全部保持原生形态:

| # | 设置项 | 来源 | 适配说明 |
|---|---|---|---|
| 1 | `baseURL` | 原有 | OpenAI 兼容端点地址,全部工具共用 |
| 2 | `apiKey` | 原有 | 只写密钥,优先于环境变量 |
| 3 | `apiKeyEnv` | 原有 | 环境变量兜底 |
| 4 | `model` | 原有 | 视觉模型 ID,所有工具统一使用 |
| 5 | `maxTokens` | 原有 | 输出上限;截断时工具附明确提示(新增行为) |
| 6 | `timeoutMs` | 原有 | 单次请求超时;叠加 429/5xx 重试(新增行为) |
| 7 | `maxImageBytes` | 原有 | 图片大小上限;现在文件分支 stat 预检 + attachment 分支同限(修复) |
| 8 | `description` | 原有 | 工具描述;已补充标记说明与内容安全语义(修改) |
| 9 | `bridgeTextOnly` | 原有 | 桥接开关;递归桥接 + 历史修复在开/关下行为一致(增强) |
| 10 | `bridgeExportDir` | 原有 | 导出目录;新增启动清理 7 天旧文件(增强) |
| 11 | `multimodalModels` | 原有 | 直收图片块的模型白名单;requestGuard 诊断同样尊重它 |
| 12 | `requestGuard` | **新增** | llm/stream 层诊断:检测到非白名单模型请求携带图片块时告警(因宿主 deepFreeze 无法改写,真实防线是桥接与修复) |

**适配原则**:不新增设置页/设置卡;所有新能力复用既有 12 项配置或零配置;
唯一新增的 `requestGuard` 也以原生设置项形式呈现,默认开启,关闭即回到
0.3.10 行为。
