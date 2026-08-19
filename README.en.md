# 👁️ dsh-vision-hub — Eyes for DeepSeek Harness EAC

**One repo, three tools**: pixel-level vision tools × bridge inline preview ×
drag-and-drop file upload. Give your text-only DeepSeek model real vision —
images come in, get understood, get used.

## Components

| Component | What it does |
|---|---|
| `tool-vision/` | Enhanced dsh-tool-vision **0.4.0**: `inspect_image` + **14 pixel-level vision tools** (describe/ground/detect/crop/pixel-diff/colors/OCR/long-OCR/trace/cutout/screenshots/present/materialize), all driven by ONE OpenAI-compatible endpoint (baseURL/apiKey/model) — no provider chains, no local models, no extra settings. |
| `bridge-preview/` | Inline thumbnails for bridged images: pasted images render in the bubble, click to zoom; the `[图片: <path>]` marker text hides once the image loads (model-side text untouched). |
| `file-drop/` | Drag-and-drop upload for non-image files (PDF/Word/Excel/ZIP/text) → workspace path. |

## Highlights

- **Clean transcripts**: bridge marker shrunk to `[图片: <路径>]`; the usage
  rule lives in a system-prompt section, so the model still reads it.
- **Stability fixes**: Uint8Array encoding, rate-limit/5xx auto-retry,
  content-safety classification (`VISION_CONTENT_FILTERED`), long-OCR budget,
  stat pre-check + 20MB caps, path containment, export filename sanitization.
- **Safety**: loopback preview route restricted to the bridge export dir
  (host/ext/size/containment checks); HTML screenshots are network-blocked.
- **EAC-native**: all 12 settings stay in the native settings page, hot-applied.

## Quick start

Give the install/configure prompts from the Chinese README to any AI agent,
or manually:

```yaml
tool-vision:
  baseURL: https://open.bigmodel.cn/api/paas/v4   # any OpenAI-compatible endpoint
  model: glm-4v-flash
  apiKey: sk-xxxx
```

Paste an image → short marker + inline thumbnail → ask the model → it calls
`inspect_image` / `vision_*` automatically.

## Docs

- [docs/ENHANCEMENTS.md](docs/ENHANCEMENTS.md) — what's new vs upstream
- [docs/ADAPTABILITY.md](docs/ADAPTABILITY.md) — host/model/settings/platform fit
- [docs/SETTINGS.md](docs/SETTINGS.md) — the 12 settings
- [docs/EAC-ADAPTABILITY.md](docs/EAC-ADAPTABILITY.md) — EAC platform fit
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — data flow & design constraints
- [docs/INSTALL.md](docs/INSTALL.md) / [docs/presets.md](docs/presets.md) / [docs/FAQ.md](docs/FAQ.md) / [docs/TIPS.md](docs/TIPS.md)

## Credits

- Pixel tool semantics ported from [dsh-vision-router](https://github.com/ysr666/dsh-vision-router) (© ysr666, MIT)
- Bridge & inspect_image from [dsh-tool-vision](https://github.com/Scorp1o117/dsh-tool-vision) (© Scorp1o117, MIT)
- bridge-preview & file-drop: authored/maintained by xing666173

MIT — see [LICENSE](LICENSE).
