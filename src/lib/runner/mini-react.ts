/**
 * A tiny React stand-in for the in-app sandbox. Learner code runs in an
 * isolated page with no network, so the real React can't be loaded there.
 * This covers what exercises need: JSX, function components, hooks for the
 * first render, context, and `render()` to a static HTML string.
 *
 * It must match `react-dom/server`'s `renderToStaticMarkup` for the content we
 * ship: the seed verifier runs every React exercise with both and fails if
 * they disagree. Known difference: React 19 puts a `<link rel="preload">` before
 * `<img>`; this doesn't, so exercises shouldn't assert on image markup.
 * Plain ES5 source, evaluated inside the sandbox.
 */
export const MINI_REACT = String.raw`
var React = (function () {
  var FRAGMENT = { __fragment: true };
  var VOID = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, source: 1, track: 1, wbr: 1 };
  var UNITLESS = { opacity: 1, zIndex: 1, fontWeight: 1, lineHeight: 1, flex: 1, flexGrow: 1, flexShrink: 1, order: 1, zoom: 1 };
  var ATTR_NAMES = { className: 'class', htmlFor: 'for' };

  function createElement(type, props) {
    var p = {};
    var key = null;
    if (props) for (var k in props) {
      if (k === 'key') key = props[k];
      else if (k !== 'ref' && k !== '__self' && k !== '__source') p[k] = props[k];
    }
    var children = Array.prototype.slice.call(arguments, 2);
    if (children.length === 1) p.children = children[0];
    else if (children.length > 1) p.children = children;
    return { __element: true, type: type, props: p, key: key };
  }

  function escapeText(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  }

  function styleString(style) {
    return Object.keys(style).filter(function (k) { return style[k] != null && style[k] !== '' && typeof style[k] !== 'boolean'; })
      .map(function (k) {
        var v = style[k];
        var name = k.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); });
        if (typeof v === 'number' && v !== 0 && !UNITLESS[k]) v = v + 'px';
        return name + ':' + String(v).trim();
      }).join(';');
  }

  // ---- hooks: state lives on the component instance being rendered
  var current = null;
  function hookSlot(init) {
    if (!current) throw new Error('Invalid hook call. Hooks can only be called inside the body of a function component.');
    var i = current.index++;
    if (!(i in current.hooks)) current.hooks[i] = init();
    return i;
  }
  function useReducer(reducer, initialArg, init) {
    var inst = current;
    var i = hookSlot(function () { return { value: init ? init(initialArg) : initialArg }; });
    var slot = inst.hooks[i];
    var dispatch = function (action) {
      var next = reducer(slot.value, action);
      if (!Object.is(next, slot.value)) {
        slot.value = next;
        if (inst.rendering) inst.dirty = true;
      }
    };
    return [slot.value, dispatch];
  }
  function useState(initial) {
    return useReducer(function (s, a) { return typeof a === 'function' ? a(s) : a; }, initial,
      function (v) { return typeof v === 'function' ? v() : v; });
  }
  function useRef(initial) { var i = hookSlot(function () { return { current: initial }; }); return current.hooks[i]; }
  function useMemo(fn) { var i = hookSlot(function () { return { value: fn() }; }); return current.hooks[i].value; }
  function useCallback(fn) { return useMemo(function () { return fn; }); }
  function noop() {}
  function useEffect() { hookSlot(function () { return {}; }); }
  function useId() { var i = hookSlot(function () { return { value: ':r' + (idCounter++).toString(32) + ':' }; }); return current.hooks[i].value; }
  var idCounter = 0;

  var contextValues = [];
  function createContext(defaultValue) {
    var ctx = { __context: true, defaultValue: defaultValue };
    ctx.Provider = { __provider: true, context: ctx };
    ctx.Consumer = { __consumer: true, context: ctx };
    return ctx;
  }
  function useContext(ctx) {
    for (var i = contextValues.length - 1; i >= 0; i--) if (contextValues[i].ctx === ctx) return contextValues[i].value;
    return ctx.defaultValue;
  }

  function renderComponent(fn, props) {
    var inst = { hooks: [], index: 0, dirty: false, rendering: true };
    var out;
    for (var n = 0; ; n++) {
      if (n > 25) throw new Error('Too many re-renders. React limits the number of renders to prevent an infinite loop.');
      var prev = current;
      current = inst;
      inst.index = 0;
      inst.dirty = false;
      try { out = fn(props); } finally { current = prev; }
      if (!inst.dirty) break;
    }
    inst.rendering = false;
    return out;
  }

  function render(node) {
    if (node == null || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint') return escapeText(node);
    if (Array.isArray(node)) return node.map(render).join('');
    if (!node.__element) throw new Error('Objects are not valid as a React child (found: ' + Object.prototype.toString.call(node) + ').');
    var type = node.type, props = node.props;
    if (type === FRAGMENT) return render(props.children);
    if (type && type.__provider) {
      contextValues.push({ ctx: type.context, value: props.value });
      try { return render(props.children); } finally { contextValues.pop(); }
    }
    if (type && type.__consumer) return render(props.children(useContextOutside(type.context)));
    if (type && type.__memo) return render(createElement.apply(null, [type.type, props]));
    if (typeof type === 'function') return render(renderComponent(type, props));
    if (typeof type !== 'string') throw new Error('Element type is invalid: ' + String(type));

    var html = '<' + type;
    var inner = null;
    for (var k in props) {
      var v = props[k];
      if (k === 'children' || v == null || typeof v === 'function' || /^on[A-Z]/.test(k)) continue;
      if (k === 'dangerouslySetInnerHTML') { inner = v.__html; continue; }
      if (k === 'style' && typeof v === 'object') { var css = styleString(v); if (css) html += ' style="' + escapeText(css) + '"'; continue; }
      if (k === 'value' && (type === 'textarea' || type === 'select')) continue;
      if (k === 'defaultValue' || k === 'defaultChecked') continue;
      var name = ATTR_NAMES[k] || k;
      if (v === true) { html += ' ' + name + '=""'; continue; }
      if (v === false && !/^(aria|data)-/.test(name)) continue;
      html += ' ' + name + '="' + escapeText(v) + '"';
    }
    if (VOID[type]) return html + '/>';
    html += '>';
    if (inner != null) html += inner;
    else if (type === 'textarea' && props.value != null) html += escapeText(props.value);
    else html += render(props.children);
    return html + '</' + type + '>';
  }
  function useContextOutside(ctx) { return useContext(ctx); }

  return {
    createElement: createElement,
    Fragment: FRAGMENT,
    useState: useState,
    useReducer: useReducer,
    useRef: useRef,
    useMemo: useMemo,
    useCallback: useCallback,
    useEffect: useEffect,
    useLayoutEffect: useEffect,
    useId: useId,
    createContext: createContext,
    useContext: useContext,
    memo: function (type) { return { __memo: true, type: type }; },
    forwardRef: function (fn) { return function (props) { return fn(props, null); }; },
    StrictMode: FRAGMENT,
    renderToStaticMarkup: render,
    __noop: noop,
  };
})();
var render = function (element) { return React.renderToStaticMarkup(element); };
`;

/** Options for sucrase so JSX compiles to calls on the mini React above. */
export const SUCRASE_JSX_OPTIONS = {
  jsxPragma: 'React.createElement',
  jsxFragmentPragma: 'React.Fragment',
} as const;
