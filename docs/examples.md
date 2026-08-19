# 工具用法示例

所有工具由同一个端点驱动,`baseURL`/`model`/`apiKey` 见 docs/presets.md。
工具名即模型可见名称,以下为典型调用方式(参数契约与工具描述一致)。

## 看图问答

```
vision_describe(paths=["C:\\图.png"], question="这个页面的按钮在什么位置?")
vision_describe(paths=["mock.png", "impl.png"], question="两张图有哪些差异?", json=true)
```

## 定位与检测

```
vision_ground(image="C:\\图.png", target="the send button")
# → {"x1":..,"y1":..,"x2":..,"y2":..} + 标注 PNG

vision_detect(image="C:\\图.png", target="buttons")
# → 编号元素清单 + 标注 PNG(模型可引用 "element #3")
```

## 裁剪与对比

```
vision_crop(image="C:\\图.png", region="120,80,320,260")
vision_pixel_diff(original="ref.png", rebuilt="impl.png", threshold=16)
# → 差异比例 + 最差区域 + 热图 + JSON 报告
```

## 取色与 OCR

```
vision_colors(image="C:\\图.png", top=8)
vision_ocr(image="C:\\图.png")
vision_long_screenshot_ocr(image="C:\\长截图.png", chunkHeight=1200)
# → 转写文本 + ocr.md + manifest
```

## 矢量化与抠图

```
vision_trace(image="C:\\icon.png")                    # 彩色 SVG(默认 8 色)
vision_trace(image="C:\\icon.png", color=false, steps=4)  # 灰度分层
vision_extract_foreground(image="C:\\logo.png", tolerance=40)
# → 透明背景 PNG
```

## 截图

```
vision_html_screenshot(source="C:\\page.html", width=1200, height=720, fullPage=true)
vision_screenshot(identify=true)   # 截屏并顺带识别屏幕内容
```

## 展示与落盘

```
vision_present(image="C:\\生成.png", label="设计稿 v2")   # 正式展示给用户
vision_materialize(image="sha256:...")                   # 附件 → 工作区路径
```

## 提示

- 图片参数支持:本地绝对路径、相对工作区路径、会话附件 id(sha256:…);
- 产物统一写入 `<工作区>/.dsh-tool-vision/`;
- 失败时工具返回结构化 `ok:false` + 代码(如 VISION_CONTENT_FILTERED /
  VISION_BACKEND_UNAVAILABLE),模型会据此处理,不要反复重试。
