/**
 * dsh-bridge-preview — 浏览器端(client half,手写 bundle,无构建依赖)。
 *
 * 观察用户气泡里 dsh-tool-vision 的桥接提示文本
 *   [User sent an image..., exported to: <path>...]
 * 提取本地图片路径,在气泡内文本块上方插入同源 <img> 预览。
 *
 * 纯展示层:不修改任何持久化消息、不碰插槽系统、不影响模型请求。
 *
 * 健壮性设计:
 *  - 去重键 = 消息自己的文本块元素(而非向上找的祖先容器)——避免不同消息
 *    走到同一祖先被误判"已处理"而跳过;
 *  - MutationObserver + 2s 周期兜底扫描(观察器被 HMR 释放后仍能恢复);
 *  - 图片加载失败(onerror)自动移除,静默降级。
 */
window.__ModuleLoader__.load({ id: "dsh-bridge-preview", factory: function (require) {
"use strict";
var name = "dsh-bridge-preview";
var inject = [];
var ROUTE = "/plugins/dsh-bridge-preview/image";
var HINT_RE = /(?:exported to:\s*|\[图片:\s*|\[image:\s*)("[^"]+"|'[^']+'|[A-Za-z]:[\\/][^\s\]]+?\.(?:png|jpe?g|webp|gif|avif|bmp))/gi;
var MARK = "data-dshbp";
var pendingTimer = null;
var intervalTimer = null;
// 旧格式提示含 "exported to:";新格式是 [图片: <path>] / [image: <path>]。
var HINT_MARKER_RE = /exported to:|\[图片:\s*|\[image:\s*/i;
// 整段标记(含路径)的匹配,用于图像加载成功后把标记文本从界面隐藏——
// 模型侧仍然看得到标记(请求从日志推导),用户侧只留下内联图像。
var MARKER_SPAN_RE = /\[(?:图片|image|User sent an image)[^\]]*\]/g;

function extractPath(m) {
  var s = m[1];
  if (s.length >= 2) {
    var first = s[0];
    var last = s[s.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) s = s.slice(1, -1);
  }
  return s;
}

function processTextNode(textNode) {
  var data = textNode.data;
  if (typeof data !== "string" || !HINT_MARKER_RE.test(data)) return;
  var matches = [];
  var seen = {};
  var m;
  HINT_RE.lastIndex = 0;
  while ((m = HINT_RE.exec(data)) !== null) {
    var path = extractPath(m);
    if (path in seen) continue;
    seen[path] = true;
    matches.push(path);
  }
  if (matches.length === 0) return;

  var block = textNode.parentElement;
  if (!block) return;
  if (block.hasAttribute(MARK)) return;

  // 插入目标 = 文本块的直接父容器(气泡/文本容器)内部、文字上方。
  // 防游离图片:文本直接挂在消息列表/body 下(拖拽图片进输入框的场景)时跳过,
  // 绝不把图片插进列表容器。
  var container = block.parentElement;
  if (!container || container === document.body) return;
  if (container.childElementCount > 3) return;
  if (container.querySelector("[" + MARK + "]") !== null) return;

  block.setAttribute(MARK, "1");
  // 图像成功显示后,把标记文本从界面隐藏(仅用户侧;模型侧请求仍含标记)。
  // 加载失败时保留文本,避免用户什么都看不到。
  var hidden = false;
  var hideMarkerText = function () {
    if (hidden) return;
    hidden = true;
    var cleaned = data.replace(MARKER_SPAN_RE, "");
    textNode.data = cleaned.trim() === "" ? "" : cleaned;
  };
  // 倒序插入到文本块前,保证多图顺序正确;margin-left:auto 让图片在气泡内右对齐
  for (var j = matches.length - 1; j >= 0; j--) {
    var img = document.createElement("img");
    img.setAttribute(MARK, "1");
    img.src = ROUTE + "?p=" + encodeURIComponent(matches[j]);
    img.alt = "图片预览";
    img.style.cssText = "display:block;margin-left:auto;margin-right:0;max-width:min(360px,100%);max-height:420px;border-radius:8px;margin-top:4px;margin-bottom:6px;object-fit:contain;cursor:zoom-in;";
    img.addEventListener("load", hideMarkerText);
    img.addEventListener("error", function () {
      // 图片加载失败:移除自身,静默降级(标记文本保留,避免无限重试)
      this.remove();
    });
    img.addEventListener("click", function () {
      openLightbox(this.src, this.alt);
    });
    container.insertBefore(img, block);
  }
}

/**
 * 灯箱:点击缩略图 → 全屏大图;点任意处或按 Esc 关闭。
 */
function openLightbox(src, alt) {
  var overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;z-index:2147483000;cursor:zoom-out;";
  var big = document.createElement("img");
  big.src = src;
  big.alt = alt || "图片预览";
  big.style.cssText = "max-width:92vw;max-height:92vh;object-fit:contain;border-radius:4px;box-shadow:0 8px 40px rgba(0,0,0,0.5);";
  var close = function () {
    overlay.remove();
    document.removeEventListener("keydown", onKey, true);
  };
  var onKey = function (e) {
    if (e.key === "Escape") close();
  };
  big.addEventListener("error", close);
  overlay.addEventListener("click", close);
  overlay.appendChild(big);
  document.body.appendChild(overlay);
  document.addEventListener("keydown", onKey, true);
}

function scan() {
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      if (!node.data || !HINT_MARKER_RE.test(node.data)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  var nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (var i = 0; i < nodes.length; i++) processTextNode(nodes[i]);
}

function apply(ctx) {
  ctx.effect(function () {
    scan();
    var observer = new MutationObserver(function () {
      if (pendingTimer !== null) return;
      pendingTimer = setTimeout(function () {
        pendingTimer = null;
        scan();
      }, 250);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    // 兜底:观察器被 HMR 释放或事件丢失时,周期重扫仍能补上预览
    intervalTimer = setInterval(function () { scan(); }, 2000);
    return function () {
      observer.disconnect();
      if (pendingTimer !== null) { clearTimeout(pendingTimer); pendingTimer = null; }
      if (intervalTimer !== null) { clearInterval(intervalTimer); intervalTimer = null; }
    };
  }, "dsh-bridge-preview: preview observer");
}

return { apply: apply, inject: inject, name: name };
}});
