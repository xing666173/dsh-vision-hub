# 端点配置预设(免费优先)

tool-vision 的视觉模型配置在 `$DSH_HOME/settings.yaml` 的 `tool-vision` 段
(或在 EAC 设置 → 视觉模型 编辑,热加载生效)。

```yaml
tool-vision:
  baseURL: <端点地址>
  model: <模型名>
  apiKey: <你的密钥>        # 或 apiKeyEnv: <环境变量名>
  maxTokens: <按端点上限>
  bridgeTextOnly: true
  requestGuard: true
```

## 智谱 GLM(免费档)

```yaml
tool-vision:
  baseURL: https://open.bigmodel.cn/api/paas/v4
  model: glm-4v-flash        # 免费;glm-4v-plus 质量更高(收费)
  maxTokens: 1024            # glm-4v-flash 上限
```

- 注册:https://open.bigmodel.cn(实名后送免费额度)
- 注意:免费档高峰时段可能 429;内容安全过滤较严(见 FAQ)

## 阿里云百炼 Qwen-VL

```yaml
tool-vision:
  baseURL: https://dashscope.aliyuncs.com/compatible-mode/v1
  model: qwen3-vl-flash      # 免费档;识别/OCR 质量好
  maxTokens: 4096
```

- 注册:https://dashscope.console.aliyun.com(新用户送免费额度)

## 硅基流动 SiliconFlow

```yaml
tool-vision:
  baseURL: https://api.siliconflow.cn/v1
  model: Qwen/Qwen2.5-VL-7B-Instruct   # 标 FREE 的模型免费
  maxTokens: 4096
```

- 注册:https://siliconflow.cn(注册送 14 元体验金)

## 本地 Ollama(可选,离线)

```yaml
tool-vision:
  baseURL: http://localhost:11434/v1
  model: llama3.2-vision
  apiKey: dummy              # 本地无需密钥,占位即可
  maxTokens: 4096
```

## 通用建议

- 换端点只需改 `baseURL` / `model` / `apiKey` 三项(缓存按端点+模型隔离,
  不会串答案);
- 免费档遇到限流,可临时切回稳定端点;429 会自动退避重试,不必手动处理。
