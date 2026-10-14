// Loaded into each saved page during the publish step (see prerender-pages.py).
// React reports every finished draw to a developer-tools hook. This stand-in hook copies the page at
// React's first draw over the saved copy: the same moment a visitor's browser compares the two, before
// any page effects run. Classes, data-/aria- attributes, ids and inline styles are reset to what React
// itself rendered, so effects that switch things on (reveals, lit cards, armed sections) start fresh
// for every visitor, and React's ids match the ones a visitor's browser expects.
(() => {
  let parsed = null;
  document.addEventListener("readystatechange", () => {
    if (document.readyState === "interactive") parsed = document.getElementById("root")?.firstElementChild ?? null;
  });

  // React adds "px" to plain numbers except on these properties (React 18's list).
  const UNITLESS = new Set(["animationIterationCount", "aspectRatio", "borderImageOutset", "borderImageSlice", "borderImageWidth", "boxFlex", "boxFlexGroup", "boxOrdinalGroup", "columnCount", "columns", "flex", "flexGrow", "flexPositive", "flexShrink", "flexNegative", "flexOrder", "gridArea", "gridRow", "gridRowEnd", "gridRowSpan", "gridRowStart", "gridColumn", "gridColumnEnd", "gridColumnSpan", "gridColumnStart", "fontWeight", "lineClamp", "lineHeight", "opacity", "order", "orphans", "tabSize", "widows", "zIndex", "zoom", "fillOpacity", "floodOpacity", "stopOpacity", "strokeDasharray", "strokeDashoffset", "strokeMiterlimit", "strokeOpacity", "strokeWidth"]);
  const unprefixed = (name) => name.replace(/^(Webkit|ms|Moz|O)([A-Z])/, (_, __, first) => first.toLowerCase());
  const hyphenated = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).replace(/^ms-/, "-ms-");
  const propsOf = (el) => {
    const key = Object.keys(el).find((name) => name.startsWith("__reactProps$"));
    return key ? el[key] || {} : null;
  };
  const text = (el, name, value) => {
    if (value == null || typeof value === "function" || typeof value === "symbol") el.removeAttribute(name);
    else el.setAttribute(name, String(value));
  };
  const flag = (el, name, value) => (value ? el.setAttribute(name, "") : el.removeAttribute(name));

  function markup(root) {
    const copy = root.cloneNode(true);
    const live = root.querySelectorAll("*");
    const saved = copy.querySelectorAll("*");
    const ids = new Map();
    for (let i = 0; i < live.length; i += 1) {
      const props = propsOf(live[i]);
      if (!props) continue;
      const el = saved[i];
      const className = typeof props.className === "string" || typeof props.className === "number" ? String(props.className) : typeof props.class === "string" ? props.class : "";
      if (className) el.setAttribute("class", className);
      else el.removeAttribute("class");
      for (const { name } of [...el.attributes]) if (/^(data|aria)-/.test(name) && !(name in props)) el.removeAttribute(name);
      for (const name in props) if (/^(data|aria)-/.test(name)) text(el, name, props[name]);
      if ("id" in props) {
        const before = el.getAttribute("id");
        text(el, "id", props.id);
        const after = el.getAttribute("id");
        if (before && after && before !== after) ids.set(before, after);
      }
      if ("htmlFor" in props) text(el, "for", props.htmlFor);
      if ("tabIndex" in props) text(el, "tabindex", props.tabIndex);
      if ("disabled" in props) flag(el, "disabled", props.disabled);
      // React sets `muted` as a property only; written into the saved page so videos start muted.
      if (el.tagName === "VIDEO" && props.muted) el.setAttribute("muted", "");
      flag(el, "hidden", props.hidden);
      el.removeAttribute("style");
      const style = props.style;
      if (style && typeof style === "object") {
        for (const name in style) {
          const value = style[name];
          if (value == null || typeof value === "boolean" || value === "") continue;
          if (name.startsWith("--")) el.style.setProperty(name, String(value).trim());
          else el.style.setProperty(hyphenated(name), typeof value === "number" && value !== 0 && !UNITLESS.has(unprefixed(name)) ? `${value}px` : String(value).trim());
        }
        if (!el.getAttribute("style")) el.removeAttribute("style");
      }
    }
    // Ids React made for the first, from-scratch draw (":r1:") become the ones a hydrating draw uses
    // (":R6iqe:") everywhere they appear, including references such as url(#...) and href="#...".
    const swap = new Map();
    for (const [before, after] of ids) {
      const from = before.match(/:r[0-9a-v]+:/g) ?? [];
      const to = after.match(/:R[0-9a-zA-Z]*:/g) ?? [];
      if (from.length === to.length) from.forEach((token, i) => swap.set(token, to[i]));
    }
    if (swap.size) {
      for (const el of saved) {
        for (const { name, value } of [...el.attributes]) {
          const next = value.replace(/:r[0-9a-v]+:/g, (token) => swap.get(token) ?? token);
          if (next !== value) el.setAttribute(name, next);
        }
      }
    }
    // Neighboring pieces of text keep a <!-- --> marker between them (a browser would merge them otherwise),
    // and drawings made in code (data-drawn) stay empty; the browser draws them again on load.
    const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
    const pieces = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) pieces.push(node);
    for (const node of pieces) if (node.nextSibling && node.nextSibling.nodeType === Node.TEXT_NODE) node.parentNode.insertBefore(document.createComment(" "), node.nextSibling);
    copy.querySelectorAll("[data-drawn]").forEach((el) => { el.innerHTML = ""; });
    return copy.innerHTML;
  }

  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    isDisabled: false,
    supportsFiber: true,
    renderers: new Map(),
    inject: () => 1,
    checkDCE: () => {},
    onScheduleFiberRoot: () => {},
    onCommitFiberUnmount: () => {},
    onPostCommitFiberRoot: () => {},
    onCommitFiberRoot(_renderer, fiberRoot) {
      if (window.__STM_FIRST_DRAW__ !== undefined) return;
      const root = document.getElementById("root");
      if (!root || fiberRoot?.containerInfo !== root || !root.firstElementChild) return;
      try {
        // If React had to throw the saved copy away, its first draw is made of new elements.
        window.__STM_FIRST_DRAW__ = parsed && root.firstElementChild === parsed ? { ok: true, html: markup(root) } : { ok: false, why: "the saved copy did not match React's first draw" };
      } catch (error) {
        window.__STM_FIRST_DRAW__ = { ok: false, why: String(error) };
      }
    },
  };
})();
