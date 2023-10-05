import { router, setupProgress } from "@inertiajs/core";
import isEqual from "lodash.isequal";
import cloneDeep from "lodash.clonedeep";
import createServer from "@inertiajs/core/server";
function noop() {
}
function run(fn) {
  return fn();
}
function blank_object() {
  return /* @__PURE__ */ Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
function is_function(thing) {
  return typeof thing === "function";
}
function safe_not_equal(a2, b2) {
  return a2 != a2 ? b2 == b2 : a2 !== b2 || (a2 && typeof a2 === "object" || typeof a2 === "function");
}
function subscribe(store2, ...callbacks) {
  if (store2 == null) {
    return noop;
  }
  const unsub = store2.subscribe(...callbacks);
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function compute_rest_props(props, keys) {
  const rest = {};
  keys = new Set(keys);
  for (const k2 in props)
    if (!keys.has(k2) && k2[0] !== "$")
      rest[k2] = props[k2];
  return rest;
}
function compute_slots(slots) {
  const result = {};
  for (const key in slots) {
    result[key] = true;
  }
  return result;
}
let current_component;
function set_current_component(component) {
  current_component = component;
}
const _boolean_attributes = [
  "allowfullscreen",
  "allowpaymentrequest",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "defer",
  "disabled",
  "formnovalidate",
  "hidden",
  "inert",
  "ismap",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "selected"
];
const boolean_attributes = /* @__PURE__ */ new Set([..._boolean_attributes]);
const void_element_names = /^(?:area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)$/;
function is_void(name) {
  return void_element_names.test(name) || name.toLowerCase() === "!doctype";
}
const invalid_attribute_name_character = /[\s'">/=\u{FDD0}-\u{FDEF}\u{FFFE}\u{FFFF}\u{1FFFE}\u{1FFFF}\u{2FFFE}\u{2FFFF}\u{3FFFE}\u{3FFFF}\u{4FFFE}\u{4FFFF}\u{5FFFE}\u{5FFFF}\u{6FFFE}\u{6FFFF}\u{7FFFE}\u{7FFFF}\u{8FFFE}\u{8FFFF}\u{9FFFE}\u{9FFFF}\u{AFFFE}\u{AFFFF}\u{BFFFE}\u{BFFFF}\u{CFFFE}\u{CFFFF}\u{DFFFE}\u{DFFFF}\u{EFFFE}\u{EFFFF}\u{FFFFE}\u{FFFFF}\u{10FFFE}\u{10FFFF}]/u;
function spread(args, attrs_to_add) {
  const attributes = Object.assign({}, ...args);
  if (attrs_to_add) {
    const classes_to_add = attrs_to_add.classes;
    const styles_to_add = attrs_to_add.styles;
    if (classes_to_add) {
      if (attributes.class == null) {
        attributes.class = classes_to_add;
      } else {
        attributes.class += " " + classes_to_add;
      }
    }
    if (styles_to_add) {
      if (attributes.style == null) {
        attributes.style = style_object_to_string(styles_to_add);
      } else {
        attributes.style = style_object_to_string(merge_ssr_styles(attributes.style, styles_to_add));
      }
    }
  }
  let str = "";
  Object.keys(attributes).forEach((name) => {
    if (invalid_attribute_name_character.test(name))
      return;
    const value = attributes[name];
    if (value === true)
      str += " " + name;
    else if (boolean_attributes.has(name.toLowerCase())) {
      if (value)
        str += " " + name;
    } else if (value != null) {
      str += ` ${name}="${value}"`;
    }
  });
  return str;
}
function merge_ssr_styles(style_attribute, style_directive) {
  const style_object = {};
  for (const individual_style of style_attribute.split(";")) {
    const colon_index = individual_style.indexOf(":");
    const name = individual_style.slice(0, colon_index).trim();
    const value = individual_style.slice(colon_index + 1).trim();
    if (!name)
      continue;
    style_object[name] = value;
  }
  for (const name in style_directive) {
    const value = style_directive[name];
    if (value) {
      style_object[name] = value;
    } else {
      delete style_object[name];
    }
  }
  return style_object;
}
const ATTR_REGEX = /[&"]/g;
const CONTENT_REGEX = /[&<]/g;
function escape$1(value, is_attr = false) {
  const str = String(value);
  const pattern = is_attr ? ATTR_REGEX : CONTENT_REGEX;
  pattern.lastIndex = 0;
  let escaped = "";
  let last = 0;
  while (pattern.test(str)) {
    const i2 = pattern.lastIndex - 1;
    const ch = str[i2];
    escaped += str.substring(last, i2) + (ch === "&" ? "&amp;" : ch === '"' ? "&quot;" : "&lt;");
    last = i2 + 1;
  }
  return escaped + str.substring(last);
}
function escape_attribute_value(value) {
  const should_escape = typeof value === "string" || value && typeof value === "object";
  return should_escape ? escape$1(value, true) : value;
}
function escape_object(obj) {
  const result = {};
  for (const key in obj) {
    result[key] = escape_attribute_value(obj[key]);
  }
  return result;
}
function each(items, fn) {
  let str = "";
  for (let i2 = 0; i2 < items.length; i2 += 1) {
    str += fn(items[i2], i2);
  }
  return str;
}
const missing_component = {
  $$render: () => ""
};
function validate_component(component, name) {
  if (!component || !component.$$render) {
    if (name === "svelte:component")
      name += " this={...}";
    throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules. Otherwise you may need to fix a <${name}>.`);
  }
  return component;
}
let on_destroy;
function create_ssr_component(fn) {
  function $$render(result, props, bindings, slots, context) {
    const parent_component = current_component;
    const $$ = {
      on_destroy,
      context: new Map(context || (parent_component ? parent_component.$$.context : [])),
      // these will be immediately discarded
      on_mount: [],
      before_update: [],
      after_update: [],
      callbacks: blank_object()
    };
    set_current_component({ $$ });
    const html = fn(result, props, bindings, slots);
    set_current_component(parent_component);
    return html;
  }
  return {
    render: (props = {}, { $$slots = {}, context = /* @__PURE__ */ new Map() } = {}) => {
      on_destroy = [];
      const result = { title: "", head: "", css: /* @__PURE__ */ new Set() };
      const html = $$render(result, props, {}, $$slots, context);
      run_all(on_destroy);
      return {
        html,
        css: {
          code: Array.from(result.css).map((css2) => css2.code).join("\n"),
          map: null
          // TODO
        },
        head: result.title + result.head
      };
    },
    $$render
  };
}
function add_attribute(name, value, boolean) {
  if (value == null || boolean && !value)
    return "";
  const assignment = boolean && value === true ? "" : `="${escape$1(value, true)}"`;
  return ` ${name}${assignment}`;
}
function style_object_to_string(style_object) {
  return Object.keys(style_object).filter((key) => style_object[key]).map((key) => `${key}: ${escape_attribute_value(style_object[key])};`).join(" ");
}
const subscriber_queue = [];
function readable(value, start) {
  return {
    subscribe: writable(value, start).subscribe
  };
}
function writable(value, start = noop) {
  let stop;
  const subscribers = /* @__PURE__ */ new Set();
  function set(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue.push(subscriber, value);
        }
        if (run_queue) {
          for (let i2 = 0; i2 < subscriber_queue.length; i2 += 2) {
            subscriber_queue[i2][0](subscriber_queue[i2 + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update(fn) {
    set(fn(value));
  }
  function subscribe2(run2, invalidate = noop) {
    const subscriber = [run2, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set) || noop;
    }
    run2(value);
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0 && stop) {
        stop();
        stop = null;
      }
    };
  }
  return { set, update, subscribe: subscribe2 };
}
function derived(stores, fn, initial_value) {
  const single = !Array.isArray(stores);
  const stores_array = single ? [stores] : stores;
  const auto = fn.length < 2;
  return readable(initial_value, (set) => {
    let started = false;
    const values = [];
    let pending = 0;
    let cleanup = noop;
    const sync = () => {
      if (pending) {
        return;
      }
      cleanup();
      const result = fn(single ? values[0] : values, set);
      if (auto) {
        set(result);
      } else {
        cleanup = is_function(result) ? result : noop;
      }
    };
    const unsubscribers = stores_array.map((store2, i2) => subscribe(store2, (value) => {
      values[i2] = value;
      pending &= ~(1 << i2);
      if (started) {
        sync();
      }
    }, () => {
      pending |= 1 << i2;
    }));
    started = true;
    sync();
    return function stop() {
      run_all(unsubscribers);
      cleanup();
      started = false;
    };
  });
}
const store = writable({
  component: null,
  layout: [],
  page: {},
  key: null
});
const h$1 = (component, props, children) => {
  return {
    component,
    ...props ? { props } : {},
    ...children ? { children } : {}
  };
};
const Render = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $store, $$unsubscribe_store;
  $$unsubscribe_store = subscribe(store, (value) => $store = value);
  let { component } = $$props;
  let { props = {} } = $$props;
  let { children = [] } = $$props;
  if ($$props.component === void 0 && $$bindings.component && component !== void 0)
    $$bindings.component(component);
  if ($$props.props === void 0 && $$bindings.props && props !== void 0)
    $$bindings.props(props);
  if ($$props.children === void 0 && $$bindings.children && children !== void 0)
    $$bindings.children(children);
  $$unsubscribe_store();
  return `${$store.component ? `${validate_component(component || missing_component, "svelte:component").$$render($$result, Object.assign({}, props), {}, {
    default: () => {
      return `${each(children, (child, index) => {
        return `${validate_component(Render, "svelte:self").$$render($$result, Object.assign({}, child), {}, {})}`;
      })}`;
    }
  })}` : ``}`;
});
const App = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let child;
  let layout;
  let components;
  let $store, $$unsubscribe_store;
  $$unsubscribe_store = subscribe(store, (value) => $store = value);
  child = $store.component && h$1($store.component.default, $store.page.props);
  layout = $store.component && $store.component.layout;
  components = layout ? Array.isArray(layout) ? layout.concat(child).reverse().reduce((child2, layout2) => h$1(layout2, $store.page.props, [child2])) : h$1(layout, $store.page.props, [child]) : child;
  $$unsubscribe_store();
  return `${validate_component(Render, "Render").$$render($$result, Object.assign({}, components), {}, {})}`;
});
const SSR = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { id, initialPage } = $$props;
  if ($$props.id === void 0 && $$bindings.id && id !== void 0)
    $$bindings.id(id);
  if ($$props.initialPage === void 0 && $$bindings.initialPage && initialPage !== void 0)
    $$bindings.initialPage(initialPage);
  return `<div data-server-rendered="true"${add_attribute("id", id, 0)}${add_attribute("data-page", JSON.stringify(initialPage), 0)}>${validate_component(App, "App").$$render($$result, {}, {}, {})}</div>`;
});
async function createInertiaApp({ id = "app", resolve, setup, progress = {}, page: page2 }) {
  const isServer = typeof window === "undefined";
  const el = isServer ? null : document.getElementById(id);
  const initialPage = page2 || JSON.parse(el.dataset.page);
  const resolveComponent = (name) => Promise.resolve(resolve(name));
  await resolveComponent(initialPage.component).then((initialComponent) => {
    store.set({
      component: initialComponent,
      page: initialPage
    });
  });
  if (!isServer) {
    router.init({
      initialPage,
      resolveComponent,
      swapComponent: async ({ component, page: page3, preserveState }) => {
        store.update((current) => ({
          component,
          page: page3,
          key: preserveState ? current.key : Date.now()
        }));
      }
    });
    if (progress) {
      setupProgress(progress);
    }
    return setup({
      el,
      App,
      props: {
        initialPage,
        resolveComponent
      }
    });
  }
  if (isServer) {
    const { html, head } = SSR.render({ id, initialPage });
    return {
      body: html,
      head: [head]
    };
  }
}
const Link$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "href",
    "as",
    "data",
    "method",
    "replace",
    "preserveScroll",
    "preserveState",
    "only",
    "headers",
    "queryStringArrayFormat"
  ]);
  let { href } = $$props;
  let { as = "a" } = $$props;
  let { data = {} } = $$props;
  let { method = "get" } = $$props;
  let { replace = false } = $$props;
  let { preserveScroll = false } = $$props;
  let { preserveState = null } = $$props;
  let { only = [] } = $$props;
  let { headers = {} } = $$props;
  let { queryStringArrayFormat = "brackets" } = $$props;
  if ($$props.href === void 0 && $$bindings.href && href !== void 0)
    $$bindings.href(href);
  if ($$props.as === void 0 && $$bindings.as && as !== void 0)
    $$bindings.as(as);
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  if ($$props.method === void 0 && $$bindings.method && method !== void 0)
    $$bindings.method(method);
  if ($$props.replace === void 0 && $$bindings.replace && replace !== void 0)
    $$bindings.replace(replace);
  if ($$props.preserveScroll === void 0 && $$bindings.preserveScroll && preserveScroll !== void 0)
    $$bindings.preserveScroll(preserveScroll);
  if ($$props.preserveState === void 0 && $$bindings.preserveState && preserveState !== void 0)
    $$bindings.preserveState(preserveState);
  if ($$props.only === void 0 && $$bindings.only && only !== void 0)
    $$bindings.only(only);
  if ($$props.headers === void 0 && $$bindings.headers && headers !== void 0)
    $$bindings.headers(headers);
  if ($$props.queryStringArrayFormat === void 0 && $$bindings.queryStringArrayFormat && queryStringArrayFormat !== void 0)
    $$bindings.queryStringArrayFormat(queryStringArrayFormat);
  return `${((tag) => {
    return tag ? `<${as}${spread([escape_object(as === "a" ? { href } : {}), escape_object($$restProps)], {})}>${is_void(tag) ? "" : `${slots.default ? slots.default({}) : ``}`}${is_void(tag) ? "" : `</${tag}>`}` : "";
  })(as)}`;
});
const page = derived(store, ($store) => $store.page);
function useForm(...args) {
  const rememberKey = typeof args[0] === "string" ? args[0] : null;
  const data = (typeof args[0] === "string" ? args[1] : args[0]) || {};
  const restored = rememberKey ? router.restore(rememberKey) : null;
  let defaults = cloneDeep(data);
  let cancelToken = null;
  let recentlySuccessfulTimeoutId = null;
  let transform = (data2) => data2;
  const store2 = writable({
    ...restored ? restored.data : data,
    isDirty: false,
    errors: restored ? restored.errors : {},
    hasErrors: false,
    progress: null,
    wasSuccessful: false,
    recentlySuccessful: false,
    processing: false,
    setStore(key, value) {
      store2.update((store3) => {
        return Object.assign(store3, typeof key === "string" ? { [key]: value } : key);
      });
    },
    data() {
      return Object.keys(data).reduce((carry, key) => {
        carry[key] = this[key];
        return carry;
      }, {});
    },
    transform(callback) {
      transform = callback;
      return this;
    },
    defaults(key, value) {
      if (typeof key === "undefined") {
        defaults = Object.assign(defaults, cloneDeep(this.data()));
        return this;
      }
      defaults = Object.assign(defaults, cloneDeep(value ? { [key]: value } : key));
      return this;
    },
    reset(...fields) {
      let clonedDefaults = cloneDeep(defaults);
      if (fields.length === 0) {
        this.setStore(clonedDefaults);
      } else {
        this.setStore(
          Object.keys(clonedDefaults).filter((key) => fields.includes(key)).reduce((carry, key) => {
            carry[key] = clonedDefaults[key];
            return carry;
          }, {})
        );
      }
      return this;
    },
    setError(key, value) {
      this.setStore("errors", {
        ...this.errors,
        ...value ? { [key]: value } : key
      });
      return this;
    },
    clearErrors(...fields) {
      this.setStore(
        "errors",
        Object.keys(this.errors).reduce(
          (carry, field) => ({
            ...carry,
            ...fields.length > 0 && !fields.includes(field) ? { [field]: this.errors[field] } : {}
          }),
          {}
        )
      );
      return this;
    },
    submit(method, url, options = {}) {
      const data2 = transform(this.data());
      const _options = {
        ...options,
        onCancelToken: (token) => {
          cancelToken = token;
          if (options.onCancelToken) {
            return options.onCancelToken(token);
          }
        },
        onBefore: (visit) => {
          this.setStore("wasSuccessful", false);
          this.setStore("recentlySuccessful", false);
          clearTimeout(recentlySuccessfulTimeoutId);
          if (options.onBefore) {
            return options.onBefore(visit);
          }
        },
        onStart: (visit) => {
          this.setStore("processing", true);
          if (options.onStart) {
            return options.onStart(visit);
          }
        },
        onProgress: (event) => {
          this.setStore("progress", event);
          if (options.onProgress) {
            return options.onProgress(event);
          }
        },
        onSuccess: async (page2) => {
          this.setStore("processing", false);
          this.setStore("progress", null);
          this.clearErrors();
          this.setStore("wasSuccessful", true);
          this.setStore("recentlySuccessful", true);
          recentlySuccessfulTimeoutId = setTimeout(() => this.setStore("recentlySuccessful", false), 2e3);
          if (options.onSuccess) {
            return options.onSuccess(page2);
          }
        },
        onError: (errors) => {
          this.setStore("processing", false);
          this.setStore("progress", null);
          this.clearErrors().setError(errors);
          if (options.onError) {
            return options.onError(errors);
          }
        },
        onCancel: () => {
          this.setStore("processing", false);
          this.setStore("progress", null);
          if (options.onCancel) {
            return options.onCancel();
          }
        },
        onFinish: () => {
          this.setStore("processing", false);
          this.setStore("progress", null);
          cancelToken = null;
          if (options.onFinish) {
            return options.onFinish();
          }
        }
      };
      if (method === "delete") {
        router.delete(url, { ..._options, data: data2 });
      } else {
        router[method](url, data2, _options);
      }
    },
    get(url, options) {
      this.submit("get", url, options);
    },
    post(url, options) {
      this.submit("post", url, options);
    },
    put(url, options) {
      this.submit("put", url, options);
    },
    patch(url, options) {
      this.submit("patch", url, options);
    },
    delete(url, options) {
      this.submit("delete", url, options);
    },
    cancel() {
      if (cancelToken) {
        cancelToken.cancel();
      }
    }
  });
  store2.subscribe((form) => {
    if (form.isDirty === isEqual(form.data(), defaults)) {
      form.setStore("isDirty", !form.isDirty);
    }
    const hasErrors = Object.keys(form.errors).length > 0;
    if (form.hasErrors !== hasErrors) {
      form.setStore("hasErrors", !form.hasErrors);
    }
    if (rememberKey) {
      router.remember({ data: form.data(), errors: form.errors }, rememberKey);
    }
  });
  return store2;
}
const InputLabel = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { value = null, classes } = $$props;
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  return `<label${spread(
    [
      {
        class: "block font-medium text-sm text-gray-700 dark:text-gray-300 " + escape$1(classes, true)
      },
      escape_object($$props)
    ],
    {}
  )}>${value ? `<span>${escape$1(value)}</span>` : `<span>${slots.default ? slots.default({}) : ``}</span>`}</label>`;
});
const TextInput = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["value", "classes"]);
  let { value = "", classes = "" } = $$props;
  let inputElement;
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  return `<input${spread(
    [
      {
        class: "border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm mt-1 block w-full " + escape$1(classes, true)
      },
      escape_object($$restProps)
    ],
    {}
  )}${add_attribute("value", value, 0)}${add_attribute("this", inputElement, 0)}>`;
});
const InputError = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { message = null } = $$props;
  if ($$props.message === void 0 && $$bindings.message && message !== void 0)
    $$bindings.message(message);
  return `${message ? `<p class="text-sm text-red-600 dark:text-red-400 mt-2">${escape$1(message)}</p>` : ``}`;
});
const PrimaryButton = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { type = "submit", disabled = false, classes = "" } = $$props;
  if ($$props.type === void 0 && $$bindings.type && type !== void 0)
    $$bindings.type(type);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0)
    $$bindings.disabled(disabled);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  return `<button ${disabled ? "disabled" : ""}${add_attribute("type", type, 0)} class="${"inline-flex items-center px-4 py-2 bg-gray-800 dark:bg-gray-200 border border-transparent rounded-md font-semibold text-xs text-white dark:text-gray-800 uppercase tracking-widest hover:bg-gray-700 dark:hover:bg-white focus:bg-gray-700 dark:focus:bg-white active:bg-gray-900 dark:active:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition ease-in-out duration-150 " + escape$1(classes, true) + " " + escape$1(disabled ? "opacity-25" : "", true)}">${slots.default ? slots.default({}) : ``}</button>`;
});
const ConfirmPassword = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $form, $$unsubscribe_form;
  const form = useForm({ password: "" });
  $$unsubscribe_form = subscribe(form, (value) => $form = value);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    $$rendered = `${$$result.head += `<!-- HEAD_svelte-ft9boq_START -->${$$result.title = `<title>Confirm Password</title>`, ""}<!-- HEAD_svelte-ft9boq_END -->`, ""}

<div class="mb-4 text-sm text-gray-600 dark:text-gray-400">This is a secure area of the application. Please confirm your password
    before continuing.
</div>

<form><div>${validate_component(InputLabel, "InputLabel").$$render($$result, { for: "password", value: "Password" }, {}, {})}
        ${validate_component(TextInput, "TextInput").$$render(
      $$result,
      {
        id: "password",
        type: "password",
        classes: "mt-1 block w-full",
        required: true,
        autocomplete: "current-password",
        autofocus: true,
        value: $form.password
      },
      {
        value: ($$value) => {
          $form.password = $$value;
          $$settled = false;
        }
      },
      {}
    )}
        ${validate_component(InputError, "InputError").$$render(
      $$result,
      {
        classes: "mt-2",
        message: $form.errors.password
      },
      {},
      {}
    )}</div>

    <div class="flex justify-end mt-4">${validate_component(PrimaryButton, "PrimaryButton").$$render($$result, { disabled: $form.processing }, {}, {
      default: () => {
        return `Confirm`;
      }
    })}</div></form>`;
  } while (!$$settled);
  $$unsubscribe_form();
  return $$rendered;
});
const __vite_glob_0_0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ConfirmPassword
}, Symbol.toStringTag, { value: "Module" }));
const ApplicationLogo = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { classes = "" } = $$props;
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  return `<svg${add_attribute("class", classes, 0)} viewBox="0 0 316 316" xmlns="http://www.w3.org/2000/svg"><path d="M305.8 81.125C305.77 80.995 305.69 80.885 305.65 80.755C305.56 80.525 305.49 80.285 305.37 80.075C305.29 79.935 305.17 79.815 305.07 79.685C304.94 79.515 304.83 79.325 304.68 79.175C304.55 79.045 304.39 78.955 304.25 78.845C304.09 78.715 303.95 78.575 303.77 78.475L251.32 48.275C249.97 47.495 248.31 47.495 246.96 48.275L194.51 78.475C194.33 78.575 194.19 78.725 194.03 78.845C193.89 78.955 193.73 79.045 193.6 79.175C193.45 79.325 193.34 79.515 193.21 79.685C193.11 79.815 192.99 79.935 192.91 80.075C192.79 80.285 192.71 80.525 192.63 80.755C192.58 80.875 192.51 80.995 192.48 81.125C192.38 81.495 192.33 81.875 192.33 82.265V139.625L148.62 164.795V52.575C148.62 52.185 148.57 51.805 148.47 51.435C148.44 51.305 148.36 51.195 148.32 51.065C148.23 50.835 148.16 50.595 148.04 50.385C147.96 50.245 147.84 50.125 147.74 49.995C147.61 49.825 147.5 49.635 147.35 49.485C147.22 49.355 147.06 49.265 146.92 49.155C146.76 49.025 146.62 48.885 146.44 48.785L93.99 18.585C92.64 17.805 90.98 17.805 89.63 18.585L37.18 48.785C37 48.885 36.86 49.035 36.7 49.155C36.56 49.265 36.4 49.355 36.27 49.485C36.12 49.635 36.01 49.825 35.88 49.995C35.78 50.125 35.66 50.245 35.58 50.385C35.46 50.595 35.38 50.835 35.3 51.065C35.25 51.185 35.18 51.305 35.15 51.435C35.05 51.805 35 52.185 35 52.575V232.235C35 233.795 35.84 235.245 37.19 236.025L142.1 296.425C142.33 296.555 142.58 296.635 142.82 296.725C142.93 296.765 143.04 296.835 143.16 296.865C143.53 296.965 143.9 297.015 144.28 297.015C144.66 297.015 145.03 296.965 145.4 296.865C145.5 296.835 145.59 296.775 145.69 296.745C145.95 296.655 146.21 296.565 146.45 296.435L251.36 236.035C252.72 235.255 253.55 233.815 253.55 232.245V174.885L303.81 145.945C305.17 145.165 306 143.725 306 142.155V82.265C305.95 81.875 305.89 81.495 305.8 81.125ZM144.2 227.205L100.57 202.515L146.39 176.135L196.66 147.195L240.33 172.335L208.29 190.625L144.2 227.205ZM244.75 114.995V164.795L226.39 154.225L201.03 139.625V89.825L219.39 100.395L244.75 114.995ZM249.12 57.105L292.81 82.265L249.12 107.425L205.43 82.265L249.12 57.105ZM114.49 184.425L96.13 194.995V85.305L121.49 70.705L139.85 60.135V169.815L114.49 184.425ZM91.76 27.425L135.45 52.585L91.76 77.745L48.07 52.585L91.76 27.425ZM43.67 60.135L62.03 70.705L87.39 85.305V202.545V202.555V202.565C87.39 202.735 87.44 202.895 87.46 203.055C87.49 203.265 87.49 203.485 87.55 203.695V203.705C87.6 203.875 87.69 204.035 87.76 204.195C87.84 204.375 87.89 204.575 87.99 204.745C87.99 204.745 87.99 204.755 88 204.755C88.09 204.905 88.22 205.035 88.33 205.175C88.45 205.335 88.55 205.495 88.69 205.635L88.7 205.645C88.82 205.765 88.98 205.855 89.12 205.965C89.28 206.085 89.42 206.225 89.59 206.325C89.6 206.325 89.6 206.325 89.61 206.335C89.62 206.335 89.62 206.345 89.63 206.345L139.87 234.775V285.065L43.67 229.705V60.135ZM244.75 229.705L148.58 285.075V234.775L219.8 194.115L244.75 179.875V229.705ZM297.2 139.625L253.49 164.795V114.995L278.85 100.395L297.21 89.825V139.625H297.2Z"></path></svg>`;
});
const GuestLayout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div class="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-gray-100 dark:bg-gray-900"><div>${validate_component(Link$1, "Link").$$render($$result, { href: "/" }, {}, {
    default: () => {
      return `${validate_component(ApplicationLogo, "ApplicationLogo").$$render(
        $$result,
        {
          classes: "w-20 h-20 fill-current text-gray-500"
        },
        {},
        {}
      )}`;
    }
  })}</div>

    <div class="w-full sm:max-w-md mt-6 px-6 py-4 bg-white dark:bg-gray-800 shadow-md overflow-hidden sm:rounded-lg">${slots.default ? slots.default({}) : ``}</div></div>`;
});
const ForgotPassword = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $form, $$unsubscribe_form;
  let { status } = $$props;
  const form = useForm({ email: "" });
  $$unsubscribe_form = subscribe(form, (value) => $form = value);
  if ($$props.status === void 0 && $$bindings.status && status !== void 0)
    $$bindings.status(status);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    $$rendered = `${$$result.head += `<!-- HEAD_svelte-fslpkp_START -->${$$result.title = `<title>Forgot Password</title>`, ""}<!-- HEAD_svelte-fslpkp_END -->`, ""}

${validate_component(GuestLayout, "GuestLayout").$$render($$result, {}, {}, {
      default: () => {
        return `<div class="mb-4 text-sm text-gray-600 dark:text-gray-400">Forgot your password? No problem. Just let us know your email address
        and we will email you a password reset link that will allow you to
        choose a new one.
    </div>

    ${status ? `<div class="mb-4 font-medium text-sm text-green-600 dark:text-green-400">${escape$1(status)}</div>` : ``}

    <form><div>${validate_component(InputLabel, "InputLabel").$$render($$result, { for: "email", value: "Email" }, {}, {})}

            ${validate_component(TextInput, "TextInput").$$render(
          $$result,
          {
            id: "email",
            type: "email",
            classes: "mt-1 block w-full",
            required: true,
            autofocus: true,
            autocomplete: "username",
            value: $form.email
          },
          {
            value: ($$value) => {
              $form.email = $$value;
              $$settled = false;
            }
          },
          {}
        )}

            ${validate_component(InputError, "InputError").$$render(
          $$result,
          {
            class: "mt-2",
            message: $form.errors.email
          },
          {},
          {}
        )}</div>

        <div class="flex items-center justify-end mt-4">${validate_component(PrimaryButton, "PrimaryButton").$$render($$result, { disabled: $form.processing }, {}, {
          default: () => {
            return `Email Password Reset Link
            `;
          }
        })}</div></form>`;
      }
    })}`;
  } while (!$$settled);
  $$unsubscribe_form();
  return $$rendered;
});
const __vite_glob_0_1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ForgotPassword
}, Symbol.toStringTag, { value: "Module" }));
const Checkbox = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { checked = false } = $$props;
  if ($$props.checked === void 0 && $$bindings.checked && checked !== void 0)
    $$bindings.checked(checked);
  return `<input${spread(
    [
      { type: "checkbox" },
      escape_object($$props),
      {
        class: "rounded dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-indigo-600 shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:focus:ring-offset-gray-800"
      }
    ],
    {}
  )}${add_attribute("checked", checked, 1)}>`;
});
const Login = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $form, $$unsubscribe_form;
  let { canResetPassword, status } = $$props;
  const form = useForm({ email: "", password: "", remember: false });
  $$unsubscribe_form = subscribe(form, (value) => $form = value);
  if ($$props.canResetPassword === void 0 && $$bindings.canResetPassword && canResetPassword !== void 0)
    $$bindings.canResetPassword(canResetPassword);
  if ($$props.status === void 0 && $$bindings.status && status !== void 0)
    $$bindings.status(status);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    $$rendered = `${$$result.head += `<!-- HEAD_svelte-1ox86gm_START -->${$$result.title = `<title>Log in</title>`, ""}<!-- HEAD_svelte-1ox86gm_END -->`, ""}

${validate_component(GuestLayout, "GuestLayout").$$render($$result, {}, {}, {
      default: () => {
        return `${status ? `<div class="mb-4 font-medium text-sm text-green-600">${escape$1(status)}</div>` : ``}

    <form><div>${validate_component(InputLabel, "InputLabel").$$render($$result, { for: "email", value: "Email" }, {}, {})}

            ${validate_component(TextInput, "TextInput").$$render(
          $$result,
          {
            id: "email",
            type: "email",
            required: true,
            autofocus: true,
            autocomplete: "username",
            value: $form.email
          },
          {
            value: ($$value) => {
              $form.email = $$value;
              $$settled = false;
            }
          },
          {}
        )}

            ${validate_component(InputError, "InputError").$$render($$result, { message: $form.errors.email }, {}, {})}</div>

        <div class="mt-4">${validate_component(InputLabel, "InputLabel").$$render($$result, { for: "password", value: "Password" }, {}, {})}

            ${validate_component(TextInput, "TextInput").$$render(
          $$result,
          {
            id: "password",
            type: "password",
            required: true,
            autocomplete: "current-password",
            value: $form.password
          },
          {
            value: ($$value) => {
              $form.password = $$value;
              $$settled = false;
            }
          },
          {}
        )}

            ${validate_component(InputError, "InputError").$$render($$result, { message: $form.errors.password }, {}, {})}</div>

        <div class="block mt-4"><label class="flex items-center">${validate_component(Checkbox, "Checkbox").$$render(
          $$result,
          {
            name: "remember",
            checked: $form.remember
          },
          {
            checked: ($$value) => {
              $form.remember = $$value;
              $$settled = false;
            }
          },
          {}
        )}
                <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">Remember me</span></label></div>

        <div class="flex items-center justify-end mt-4">${canResetPassword ? `${validate_component(Link$1, "Link").$$render(
          $$result,
          {
            href: route("password.request"),
            class: "underline text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
          },
          {},
          {
            default: () => {
              return `Forgot your password?
                `;
            }
          }
        )}` : ``}

            ${validate_component(PrimaryButton, "PrimaryButton").$$render(
          $$result,
          {
            disabled: $form.processing,
            classes: "ml-4"
          },
          {},
          {
            default: () => {
              return `Log in
            `;
            }
          }
        )}</div></form>`;
      }
    })}`;
  } while (!$$settled);
  $$unsubscribe_form();
  return $$rendered;
});
const __vite_glob_0_2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Login
}, Symbol.toStringTag, { value: "Module" }));
const Register = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $form, $$unsubscribe_form;
  const form = useForm({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    terms: false
  });
  $$unsubscribe_form = subscribe(form, (value) => $form = value);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    $$rendered = `${$$result.head += `<!-- HEAD_svelte-x3krtu_START -->${$$result.title = `<title>Register</title>`, ""}<!-- HEAD_svelte-x3krtu_END -->`, ""}

${validate_component(GuestLayout, "GuestLayout").$$render($$result, {}, {}, {
      default: () => {
        return `<form><div>${validate_component(InputLabel, "InputLabel").$$render($$result, { for: "name", value: "Name" }, {}, {})}

            ${validate_component(TextInput, "TextInput").$$render(
          $$result,
          {
            id: "name",
            type: "text",
            required: true,
            autofocus: true,
            autocomplete: "name",
            value: $form.name
          },
          {
            value: ($$value) => {
              $form.name = $$value;
              $$settled = false;
            }
          },
          {}
        )}

            ${validate_component(InputError, "InputError").$$render(
          $$result,
          {
            class: "mt-2",
            message: $form.errors.name
          },
          {},
          {}
        )}</div>

        <div class="mt-4">${validate_component(InputLabel, "InputLabel").$$render($$result, { for: "email", value: "Email" }, {}, {})}

            ${validate_component(TextInput, "TextInput").$$render(
          $$result,
          {
            id: "email",
            type: "email",
            required: true,
            autocomplete: "email",
            value: $form.email
          },
          {
            value: ($$value) => {
              $form.email = $$value;
              $$settled = false;
            }
          },
          {}
        )}

            ${validate_component(InputError, "InputError").$$render(
          $$result,
          {
            class: "mt-2",
            message: $form.errors.email
          },
          {},
          {}
        )}</div>

        <div class="mt-4">${validate_component(InputLabel, "InputLabel").$$render($$result, { for: "password", value: "Password" }, {}, {})}

            ${validate_component(TextInput, "TextInput").$$render(
          $$result,
          {
            id: "password",
            type: "password",
            required: true,
            autocomplete: "new-password",
            value: $form.password
          },
          {
            value: ($$value) => {
              $form.password = $$value;
              $$settled = false;
            }
          },
          {}
        )}

            ${validate_component(InputError, "InputError").$$render(
          $$result,
          {
            class: "mt-2",
            message: $form.errors.password
          },
          {},
          {}
        )}</div>

        <div class="mt-4">${validate_component(InputLabel, "InputLabel").$$render(
          $$result,
          {
            for: "password_confirmation",
            value: "Confirm Password"
          },
          {},
          {}
        )}

            ${validate_component(TextInput, "TextInput").$$render(
          $$result,
          {
            id: "password_confirmation",
            type: "password",
            required: true,
            autocomplete: "new-password",
            value: $form.password_confirmation
          },
          {
            value: ($$value) => {
              $form.password_confirmation = $$value;
              $$settled = false;
            }
          },
          {}
        )}

            ${validate_component(InputError, "InputError").$$render(
          $$result,
          {
            class: "mt-2",
            message: $form.errors.password_confirmation
          },
          {},
          {}
        )}</div>

        <div class="flex items-center justify-end mt-4">${validate_component(Link$1, "Link").$$render(
          $$result,
          {
            href: route("login"),
            class: "underline text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
          },
          {},
          {
            default: () => {
              return `Already registered?
            `;
            }
          }
        )}

            ${validate_component(PrimaryButton, "PrimaryButton").$$render(
          $$result,
          {
            disabled: $form.processing,
            classes: "ml-4"
          },
          {},
          {
            default: () => {
              return `Register
            `;
            }
          }
        )}</div></form>`;
      }
    })}`;
  } while (!$$settled);
  $$unsubscribe_form();
  return $$rendered;
});
const __vite_glob_0_3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Register
}, Symbol.toStringTag, { value: "Module" }));
const ResetPassword = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $form, $$unsubscribe_form;
  let { email, token } = $$props;
  const form = useForm({
    token,
    email,
    password: "",
    password_confirmation: ""
  });
  $$unsubscribe_form = subscribe(form, (value) => $form = value);
  if ($$props.email === void 0 && $$bindings.email && email !== void 0)
    $$bindings.email(email);
  if ($$props.token === void 0 && $$bindings.token && token !== void 0)
    $$bindings.token(token);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    $$rendered = `${$$result.head += `<!-- HEAD_svelte-yw86u1_START -->${$$result.title = `<title>Reset Password</title>`, ""}<!-- HEAD_svelte-yw86u1_END -->`, ""}

${validate_component(GuestLayout, "GuestLayout").$$render($$result, {}, {}, {
      default: () => {
        return `<form><div>${validate_component(InputLabel, "InputLabel").$$render($$result, { for: "email", value: "Email" }, {}, {})}

            ${validate_component(TextInput, "TextInput").$$render(
          $$result,
          {
            id: "email",
            type: "email",
            required: true,
            autofocus: true,
            autocomplete: "username",
            value: $form.email
          },
          {
            value: ($$value) => {
              $form.email = $$value;
              $$settled = false;
            }
          },
          {}
        )}

            ${validate_component(InputError, "InputError").$$render($$result, { message: $form.errors.email }, {}, {})}</div>

        <div class="mt-4">${validate_component(InputLabel, "InputLabel").$$render($$result, { for: "password", value: "Password" }, {}, {})}

            ${validate_component(TextInput, "TextInput").$$render(
          $$result,
          {
            id: "password",
            type: "password",
            required: true,
            autocomplete: "new-password",
            value: $form.password
          },
          {
            value: ($$value) => {
              $form.password = $$value;
              $$settled = false;
            }
          },
          {}
        )}

            ${validate_component(InputError, "InputError").$$render($$result, { message: $form.errors.password }, {}, {})}</div>

        <div class="mt-4">${validate_component(InputLabel, "InputLabel").$$render(
          $$result,
          {
            for: "password_confirmation",
            value: "Confirm Password"
          },
          {},
          {}
        )}

            ${validate_component(TextInput, "TextInput").$$render(
          $$result,
          {
            id: "password_confirmation",
            type: "password",
            required: true,
            autocomplete: "new-password",
            value: $form.password_confirmation
          },
          {
            value: ($$value) => {
              $form.password_confirmation = $$value;
              $$settled = false;
            }
          },
          {}
        )}

            ${validate_component(InputError, "InputError").$$render(
          $$result,
          {
            message: $form.errors.password_confirmation
          },
          {},
          {}
        )}</div>

        <div class="flex items-center justify-end mt-4">${validate_component(PrimaryButton, "PrimaryButton").$$render($$result, { disabled: $form.processing }, {}, {
          default: () => {
            return `Reset Password
            `;
          }
        })}</div></form>`;
      }
    })}`;
  } while (!$$settled);
  $$unsubscribe_form();
  return $$rendered;
});
const __vite_glob_0_4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: ResetPassword
}, Symbol.toStringTag, { value: "Module" }));
const VerifyEmail = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $form, $$unsubscribe_form;
  let { status } = $$props;
  const form = useForm({});
  $$unsubscribe_form = subscribe(form, (value) => $form = value);
  const verificationLinkSent = status === "verification-link-sent";
  if ($$props.status === void 0 && $$bindings.status && status !== void 0)
    $$bindings.status(status);
  $$unsubscribe_form();
  return `${$$result.head += `<!-- HEAD_svelte-qz6qks_START -->${$$result.title = `<title>Email Verification</title>`, ""}<!-- HEAD_svelte-qz6qks_END -->`, ""}

<div class="mb-4 text-sm text-gray-600 dark:text-gray-400">Thanks for signing up! Before getting started, could you verify your email
    address by clicking on the link we just emailed to you? If you didn&#39;t
    receive the email, we will gladly send you another.
</div>

${verificationLinkSent ? `<div class="mb-4 font-medium text-sm text-green-600 dark:text-green-400">A new verification link has been sent to the email address you provided
        during registration.
    </div>` : ``}

<form><div class="mt-4 flex items-center justify-between">${validate_component(PrimaryButton, "PrimaryButton").$$render(
    $$result,
    {
      class: $form.processing ? "opacity-25" : "",
      ":disabled": "form.processing"
    },
    {},
    {
      default: () => {
        return `Resend Verification Email
        `;
      }
    }
  )}

        ${validate_component(Link$1, "Link").$$render(
    $$result,
    {
      href: route("logout"),
      method: "post",
      as: "button",
      class: "underline text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
    },
    {},
    {
      default: () => {
        return `Log Out`;
      }
    }
  )}</div></form>`;
});
const __vite_glob_0_5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: VerifyEmail
}, Symbol.toStringTag, { value: "Module" }));
const NavLink = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { href = null, active = false } = $$props;
  const classes = active ? "inline-flex items-center px-1 pt-1 border-b-2 border-indigo-400 dark:border-indigo-600 text-sm font-medium leading-5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-700 transition duration-150 ease-in-out" : "inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium leading-5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700 focus:outline-none focus:text-gray-700 dark:focus:text-gray-300 focus:border-gray-300 dark:focus:border-gray-700 transition duration-150 ease-in-out";
  if ($$props.href === void 0 && $$bindings.href && href !== void 0)
    $$bindings.href(href);
  if ($$props.active === void 0 && $$bindings.active && active !== void 0)
    $$bindings.active(active);
  return `${validate_component(Link$1, "Link").$$render($$result, { href, class: classes }, {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Dropdown = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { align = "right", width = "48", contentClasses = "py-1 bg-white dark:bg-gray-700" } = $$props;
  ({ 48: "w-48" })[width.toString()];
  if ($$props.align === void 0 && $$bindings.align && align !== void 0)
    $$bindings.align(align);
  if ($$props.width === void 0 && $$bindings.width && width !== void 0)
    $$bindings.width(width);
  if ($$props.contentClasses === void 0 && $$bindings.contentClasses && contentClasses !== void 0)
    $$bindings.contentClasses(contentClasses);
  return `<div class="relative"><div>${slots.trigger ? slots.trigger({}) : ``}</div>

    
    ${``}

    ${``}</div>`;
});
const DropdownLink = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { href, method = "get", as = "button" } = $$props;
  if ($$props.href === void 0 && $$bindings.href && href !== void 0)
    $$bindings.href(href);
  if ($$props.method === void 0 && $$bindings.method && method !== void 0)
    $$bindings.method(method);
  if ($$props.as === void 0 && $$bindings.as && as !== void 0)
    $$bindings.as(as);
  return `${validate_component(Link$1, "Link").$$render(
    $$result,
    {
      as,
      method,
      href,
      class: "block w-full px-4 py-2 text-left text-sm leading-5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800 transition duration-150 ease-in-out"
    },
    {},
    {
      default: () => {
        return `${slots.default ? slots.default({}) : ``}`;
      }
    }
  )}`;
});
const ResponsiveNavLink = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { href = null, active = false } = $$props;
  const classes = active ? "block w-full pl-3 pr-4 py-2 border-l-4 border-indigo-400 dark:border-indigo-600 text-left text-base font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/50 focus:outline-none focus:text-indigo-800 dark:focus:text-indigo-200 focus:bg-indigo-100 dark:focus:bg-indigo-900 focus:border-indigo-700 dark:focus:border-indigo-300 transition duration-150 ease-in-out" : "block w-full pl-3 pr-4 py-2 border-l-4 border-transparent text-left text-base font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:text-gray-800 dark:focus:text-gray-200 focus:bg-gray-50 dark:focus:bg-gray-700 focus:border-gray-300 dark:focus:border-gray-600 transition duration-150 ease-in-out";
  if ($$props.href === void 0 && $$bindings.href && href !== void 0)
    $$bindings.href(href);
  if ($$props.active === void 0 && $$bindings.active && active !== void 0)
    $$bindings.active(active);
  return `${validate_component(Link$1, "Link").$$render($$result, { href, class: classes }, {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const AuthenticatedLayout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$slots = compute_slots(slots);
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  $$unsubscribe_page();
  return `<div><div class="min-h-screen bg-gray-100 dark:bg-gray-900"><nav class="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div class="flex justify-between h-16"><div class="flex">
                        <div class="shrink-0 flex items-center">${validate_component(Link$1, "Link").$$render($$result, { href: route("dashboard") }, {}, {
    default: () => {
      return `${validate_component(ApplicationLogo, "ApplicationLogo").$$render(
        $$result,
        {
          classes: "block h-9 w-auto fill-current text-gray-800 dark:text-gray-200"
        },
        {},
        {}
      )}`;
    }
  })}</div>

                        
                        <div class="hidden space-x-8 sm:-my-px sm:ml-10 sm:flex">
                            ${validate_component(NavLink, "NavLink").$$render(
    $$result,
    {
      href: route("dashboard"),
      active: route().current("dashboard")
    },
    {},
    {
      default: () => {
        return `Dashboard
                            `;
      }
    }
  )}</div></div>

                    <div class="hidden sm:flex sm:items-center sm:ml-6">
                        <div class="ml-3 relative">${validate_component(Dropdown, "Dropdown").$$render($$result, { align: "right", width: "48" }, {}, {
    content: () => {
      return `
                                    ${validate_component(DropdownLink, "DropdownLink").$$render($$result, { href: route("profile.edit") }, {}, {
        default: () => {
          return `Profile
                                    `;
        }
      })}
                                    ${validate_component(DropdownLink, "DropdownLink").$$render(
        $$result,
        {
          href: route("logout"),
          method: "post",
          as: "button"
        },
        {},
        {
          default: () => {
            return `Log Out
                                    `;
          }
        }
      )}
                                `;
    },
    trigger: () => {
      return `<span class="inline-flex rounded-md"><button type="button" class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none transition ease-in-out duration-150">${escape$1($page.props.auth.user.name)}

                                            <svg class="ml-2 -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg></button></span>`;
    }
  })}</div></div>

                    
                    <div class="-mr-2 flex items-center sm:hidden"><button class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-900 focus:text-gray-500 dark:focus:text-gray-400 transition duration-150 ease-in-out"><svg class="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path${add_attribute("class", "inline-flex", 0)} stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path><path${add_attribute("class", "inline-flex", 0)} stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button></div></div></div>

            
            <div class="${escape$1("hidden", true) + " sm:hidden"}"><div class="pt-2 pb-3 space-y-1">${validate_component(ResponsiveNavLink, "ResponsiveNavLink").$$render(
    $$result,
    {
      href: route("dashboard"),
      active: route().current("dashboard")
    },
    {},
    {
      default: () => {
        return `Dashboard
                    `;
      }
    }
  )}</div>

                
                <div class="pt-4 pb-1 border-t border-gray-200 dark:border-gray-600"><div class="px-4"><div class="font-medium text-base text-gray-800 dark:text-gray-200">${escape$1($page.props.auth.user.name)}</div>
                        <div class="font-medium text-sm text-gray-500">${escape$1($page.props.auth.user.email)}</div></div>

                    <div class="mt-3 space-y-1">${validate_component(ResponsiveNavLink, "ResponsiveNavLink").$$render($$result, { href: route("profile.edit") }, {}, {
    default: () => {
      return `Profile
                        `;
    }
  })}
                        ${validate_component(ResponsiveNavLink, "ResponsiveNavLink").$$render(
    $$result,
    {
      href: route("logout"),
      method: "post",
      as: "button"
    },
    {},
    {
      default: () => {
        return `Log Out
                        `;
      }
    }
  )}</div></div></div></nav>

        ${$$slots.header ? `<header class="bg-white dark:bg-gray-800 shadow"><div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">${slots.header ? slots.header({}) : ``}</div></header>` : ``}

        
        <main>${slots.default ? slots.default({}) : ``}</main></div></div>`;
});
const Dashboard = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${$$result.head += `<!-- HEAD_svelte-lyzp5d_START -->${$$result.title = `<title>Dashboard</title>`, ""}<!-- HEAD_svelte-lyzp5d_END -->`, ""}

${validate_component(AuthenticatedLayout, "AuthenticatedLayout").$$render($$result, {}, {}, {
    header: () => {
      return `<h2 class="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Dashboard
        </h2>
    `;
    },
    default: () => {
      return `<div class="py-12"><div class="max-w-7xl mx-auto sm:px-6 lg:px-8"><div class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg"><div class="p-6 text-gray-900 dark:text-gray-100">You&#39;re logged in!
                </div></div></div></div>`;
    }
  })}`;
});
const __vite_glob_0_6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Dashboard
}, Symbol.toStringTag, { value: "Module" }));
const Modal = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { show = false, maxWidth = "2xl", closeable = true, onClose = () => {
  } } = $$props;
  const maxWidthClass = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
    "2xl": "sm:max-w-2xl"
  }[maxWidth];
  if ($$props.show === void 0 && $$bindings.show && show !== void 0)
    $$bindings.show(show);
  if ($$props.maxWidth === void 0 && $$bindings.maxWidth && maxWidth !== void 0)
    $$bindings.maxWidth(maxWidth);
  if ($$props.closeable === void 0 && $$bindings.closeable && closeable !== void 0)
    $$bindings.closeable(closeable);
  if ($$props.onClose === void 0 && $$bindings.onClose && onClose !== void 0)
    $$bindings.onClose(onClose);
  return `${show ? `<div class="fixed inset-0 overflow-y-auto px-4 py-6 sm:px-0 z-50" scroll-region>${show ? `<div class="fixed inset-0 transform transition-all"><div class="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div></div>` : ``}

        ${show ? `<div class="${"mb-6 bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-xl transform transition-all sm:w-full sm:mx-auto " + escape$1(maxWidthClass, true)}">${show ? `${slots.default ? slots.default({}) : ``}` : ``}</div>` : ``}</div>` : ``}`;
});
const DangerButton = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { type = "submit", onClick = () => {
  }, classes = "" } = $$props;
  if ($$props.type === void 0 && $$bindings.type && type !== void 0)
    $$bindings.type(type);
  if ($$props.onClick === void 0 && $$bindings.onClick && onClick !== void 0)
    $$bindings.onClick(onClick);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  return `<button${add_attribute("type", type, 0)} class="${"inline-flex items-center px-4 py-2 bg-red-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-red-500 active:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition ease-in-out duration-150 " + escape$1(classes, true)}">${slots.default ? slots.default({}) : ``}</button>`;
});
const SecondaryButton = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { type = "button", onClick = () => {
  } } = $$props;
  if ($$props.type === void 0 && $$bindings.type && type !== void 0)
    $$bindings.type(type);
  if ($$props.onClick === void 0 && $$bindings.onClick && onClick !== void 0)
    $$bindings.onClick(onClick);
  return `<button${add_attribute("type", type, 0)} class="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-500 rounded-md font-semibold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-widest shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-25 transition ease-in-out duration-150">${slots.default ? slots.default({}) : ``}</button>`;
});
const DeleteUserForm = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $form, $$unsubscribe_form;
  let { classes } = $$props;
  let confirmingUserDeletion = false;
  const form = useForm({ password: "" });
  $$unsubscribe_form = subscribe(form, (value) => $form = value);
  const confirmUserDeletion = () => {
    confirmingUserDeletion = true;
  };
  const deleteUser = () => {
    $form.delete(route("profile.destroy"), {
      preserveScroll: true,
      onSuccess: () => closeModal(),
      onFinish: () => $form.reset()
    });
  };
  const closeModal = () => {
    confirmingUserDeletion = false;
    $form.clearErrors();
    $form.reset();
  };
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    $$rendered = `<section class="${"space-y-6 " + escape$1(classes, true)}"><header><h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">Delete Account
        </h2>

        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Once your account is deleted, all of its resources and data will be
            permanently deleted. Before deleting your account, please download
            any data or information that you wish to retain.
        </p></header>

    ${validate_component(DangerButton, "DangerButton").$$render($$result, { onClick: confirmUserDeletion }, {}, {
      default: () => {
        return `Delete Account`;
      }
    })}

    ${validate_component(Modal, "Modal").$$render(
      $$result,
      {
        show: confirmingUserDeletion,
        onClose: closeModal
      },
      {},
      {
        default: () => {
          return `<div class="p-6"><h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">Are you sure you want to delete your account?
            </h2>

            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Once your account is deleted, all of its resources and data will
                be permanently deleted. Please enter your password to confirm
                you would like to permanently delete your account.
            </p>

            <div class="mt-6">${validate_component(InputLabel, "InputLabel").$$render(
            $$result,
            {
              for: "password",
              value: "Password",
              classes: "sr-only"
            },
            {},
            {}
          )}

                ${validate_component(TextInput, "TextInput").$$render(
            $$result,
            {
              id: "password",
              type: "password",
              classes: "mt-1 block w-3/4",
              placeholder: "Password",
              value: $form.password
            },
            {
              value: ($$value) => {
                $form.password = $$value;
                $$settled = false;
              }
            },
            {}
          )}

                ${validate_component(InputError, "InputError").$$render($$result, { message: $form.errors.password }, {}, {})}</div>

            <div class="mt-6 flex justify-end">${validate_component(SecondaryButton, "SecondaryButton").$$render($$result, { onClick: closeModal }, {}, {
            default: () => {
              return `Cancel`;
            }
          })}

                ${validate_component(DangerButton, "DangerButton").$$render(
            $$result,
            {
              disabled: $form.processing,
              onClick: deleteUser,
              classes: "ml-3"
            },
            {},
            {
              default: () => {
                return `Delete Account
                `;
              }
            }
          )}</div></div>`;
        }
      }
    )}</section>`;
  } while (!$$settled);
  $$unsubscribe_form();
  return $$rendered;
});
const __vite_glob_0_8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: DeleteUserForm
}, Symbol.toStringTag, { value: "Module" }));
const UpdatePasswordForm = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $form, $$unsubscribe_form;
  let { classes } = $$props;
  const form = useForm({
    current_password: "",
    password: "",
    password_confirmation: ""
  });
  $$unsubscribe_form = subscribe(form, (value) => $form = value);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    $$rendered = `<section${add_attribute("class", classes, 0)}><header><h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">Update Password
        </h2>

        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Ensure your account is using a long, random password to stay secure.
        </p></header>

    <form class="mt-6 space-y-6"><div>${validate_component(InputLabel, "InputLabel").$$render(
      $$result,
      {
        for: "current_password",
        value: "Current Password"
      },
      {},
      {}
    )}

            ${validate_component(TextInput, "TextInput").$$render(
      $$result,
      {
        id: "current_password",
        type: "password",
        classes: "mt-1 block w-full",
        autocomplete: "current-password",
        value: $form.current_password
      },
      {
        value: ($$value) => {
          $form.current_password = $$value;
          $$settled = false;
        }
      },
      {}
    )}

            ${validate_component(InputError, "InputError").$$render($$result, { message: $form.errors.current_password }, {}, {})}</div>

        <div>${validate_component(InputLabel, "InputLabel").$$render($$result, { for: "password", value: "New Password" }, {}, {})}

            ${validate_component(TextInput, "TextInput").$$render(
      $$result,
      {
        id: "password",
        type: "password",
        classes: "mt-1 block w-full",
        autocomplete: "new-password",
        value: $form.password
      },
      {
        value: ($$value) => {
          $form.password = $$value;
          $$settled = false;
        }
      },
      {}
    )}

            ${validate_component(InputError, "InputError").$$render($$result, { message: $form.errors.password }, {}, {})}</div>

        <div>${validate_component(InputLabel, "InputLabel").$$render(
      $$result,
      {
        for: "password_confirmation",
        value: "Confirm Password"
      },
      {},
      {}
    )}

            ${validate_component(TextInput, "TextInput").$$render(
      $$result,
      {
        id: "password_confirmation",
        type: "password",
        classes: "mt-1 block w-full",
        autocomplete: "new-password",
        value: $form.password_confirmation
      },
      {
        value: ($$value) => {
          $form.password_confirmation = $$value;
          $$settled = false;
        }
      },
      {}
    )}

            ${validate_component(InputError, "InputError").$$render(
      $$result,
      {
        message: $form.errors.password_confirmation
      },
      {},
      {}
    )}</div>

        <div class="flex items-center gap-4">${validate_component(PrimaryButton, "PrimaryButton").$$render($$result, { disabled: $form.processing }, {}, {
      default: () => {
        return `Save`;
      }
    })}

            ${$form.recentlySuccessful ? `<p class="text-sm text-gray-600 dark:text-gray-400">Saved.</p>` : ``}</div></form></section>`;
  } while (!$$settled);
  $$unsubscribe_form();
  return $$rendered;
});
const __vite_glob_0_9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: UpdatePasswordForm
}, Symbol.toStringTag, { value: "Module" }));
const UpdateProfileInformationForm = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  let $form, $$unsubscribe_form;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  let { mustVerifyEmail = false, status, classes = "" } = $$props;
  const user = $page.props.auth.user;
  const form = useForm({ name: user.name, email: user.email });
  $$unsubscribe_form = subscribe(form, (value) => $form = value);
  if ($$props.mustVerifyEmail === void 0 && $$bindings.mustVerifyEmail && mustVerifyEmail !== void 0)
    $$bindings.mustVerifyEmail(mustVerifyEmail);
  if ($$props.status === void 0 && $$bindings.status && status !== void 0)
    $$bindings.status(status);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0)
    $$bindings.classes(classes);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    $$rendered = `<section${add_attribute("class", classes, 0)}><header><h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">Profile Information
        </h2>

        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Update your account&#39;s profile information and email address.
        </p></header>

    <form class="mt-6 space-y-6"><div>${validate_component(InputLabel, "InputLabel").$$render($$result, { for: "name", value: "Name" }, {}, {})}

            ${validate_component(TextInput, "TextInput").$$render(
      $$result,
      {
        id: "name",
        type: "text",
        classes: "mt-1 block w-full",
        required: true,
        autofocus: true,
        autocomplete: "name",
        value: $form.name
      },
      {
        value: ($$value) => {
          $form.name = $$value;
          $$settled = false;
        }
      },
      {}
    )}

            ${validate_component(InputError, "InputError").$$render($$result, { message: $form.errors.name }, {}, {})}</div>

        <div>${validate_component(InputLabel, "InputLabel").$$render($$result, { for: "email", value: "Email" }, {}, {})}

            ${validate_component(TextInput, "TextInput").$$render(
      $$result,
      {
        id: "email",
        type: "email",
        classes: "mt-1 block w-full",
        required: true,
        autocomplete: "username",
        value: $form.email
      },
      {
        value: ($$value) => {
          $form.email = $$value;
          $$settled = false;
        }
      },
      {}
    )}

            ${validate_component(InputError, "InputError").$$render($$result, { message: $form.errors.email }, {}, {})}</div>

        ${mustVerifyEmail && user.email_verified_at === null ? `<div><p class="text-sm mt-2 text-gray-800 dark:text-gray-200">Your email address is unverified.
                    ${validate_component(Link, "Link").$$render(
      $$result,
      {
        href: route("verification.send"),
        method: "post",
        as: "button",
        class: "underline text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
      },
      {},
      {
        default: () => {
          return `Click here to re-send the verification email.
                    `;
        }
      }
    )}</p>

                ${status === "verification-link-sent" ? `<div class="mt-2 font-medium text-sm text-green-600 dark:text-green-400">A new verification link has been sent to your email
                        address.
                    </div>` : ``}</div>` : ``}

        <div class="flex items-center gap-4">${validate_component(PrimaryButton, "PrimaryButton").$$render($$result, { disabled: $form.processing }, {}, {
      default: () => {
        return `Save`;
      }
    })}

            ${$form.recentlySuccessful ? `<p class="text-sm text-gray-600 dark:text-gray-400">Saved.</p>` : ``}</div></form></section>`;
  } while (!$$settled);
  $$unsubscribe_page();
  $$unsubscribe_form();
  return $$rendered;
});
const __vite_glob_0_10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: UpdateProfileInformationForm
}, Symbol.toStringTag, { value: "Module" }));
const Edit = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { mustVerifyEmail = false, status = null } = $$props;
  if ($$props.mustVerifyEmail === void 0 && $$bindings.mustVerifyEmail && mustVerifyEmail !== void 0)
    $$bindings.mustVerifyEmail(mustVerifyEmail);
  if ($$props.status === void 0 && $$bindings.status && status !== void 0)
    $$bindings.status(status);
  return `${$$result.head += `<!-- HEAD_svelte-3wb7bs_START -->${$$result.title = `<title>Profile</title>`, ""}<!-- HEAD_svelte-3wb7bs_END -->`, ""}

${validate_component(AuthenticatedLayout, "AuthenticatedLayout").$$render($$result, {}, {}, {
    header: () => {
      return `<h2 class="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Profile
        </h2>
    `;
    },
    default: () => {
      return `<div class="py-12"><div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6"><div class="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg">${validate_component(UpdateProfileInformationForm, "UpdateProfileInformationForm").$$render(
        $$result,
        {
          mustVerifyEmail,
          status,
          classes: "max-w-xl"
        },
        {},
        {}
      )}</div>

            <div class="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg">${validate_component(UpdatePasswordForm, "UpdatePasswordForm").$$render($$result, { classes: "max-w-xl" }, {}, {})}</div>

            <div class="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg">${validate_component(DeleteUserForm, "DeleteUserForm").$$render($$result, { classes: "max-w-xl" }, {}, {})}</div></div></div>`;
    }
  })}`;
});
const __vite_glob_0_7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Edit
}, Symbol.toStringTag, { value: "Module" }));
const Welcome_svelte_svelte_type_style_lang = "";
const css = {
  code: `.bg-dots-darker.svelte-1kc1ayf{background-image:url("data:image/svg+xml,%3Csvg width='30' height='30' viewBox='0 0 30 30' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1.22676 0C1.91374 0 2.45351 0.539773 2.45351 1.22676C2.45351 1.91374 1.91374 2.45351 1.22676 2.45351C0.539773 2.45351 0 1.91374 0 1.22676C0 0.539773 0.539773 0 1.22676 0Z' fill='rgba(0,0,0,0.07)'/%3E%3C/svg%3E")}@media(prefers-color-scheme: dark){.dark\\:bg-dots-lighter.svelte-1kc1ayf{background-image:url("data:image/svg+xml,%3Csvg width='30' height='30' viewBox='0 0 30 30' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1.22676 0C1.91374 0 2.45351 0.539773 2.45351 1.22676C2.45351 1.91374 1.91374 2.45351 1.22676 2.45351C0.539773 2.45351 0 1.91374 0 1.22676C0 0.539773 0.539773 0 1.22676 0Z' fill='rgba(255,255,255,0.07)'/%3E%3C/svg%3E")}}`,
  map: null
};
const Welcome = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  let { canLogin, canRegister, laravelVersion, phpVersion } = $$props;
  if ($$props.canLogin === void 0 && $$bindings.canLogin && canLogin !== void 0)
    $$bindings.canLogin(canLogin);
  if ($$props.canRegister === void 0 && $$bindings.canRegister && canRegister !== void 0)
    $$bindings.canRegister(canRegister);
  if ($$props.laravelVersion === void 0 && $$bindings.laravelVersion && laravelVersion !== void 0)
    $$bindings.laravelVersion(laravelVersion);
  if ($$props.phpVersion === void 0 && $$bindings.phpVersion && phpVersion !== void 0)
    $$bindings.phpVersion(phpVersion);
  $$result.css.add(css);
  $$unsubscribe_page();
  return `${$$result.head += `<!-- HEAD_svelte-y9hxi5_START -->${$$result.title = `<title>Welcome</title>`, ""}<!-- HEAD_svelte-y9hxi5_END -->`, ""}

<div class="relative sm:flex sm:justify-center sm:items-center min-h-screen bg-dots-darker bg-center bg-gray-100 dark:bg-dots-lighter dark:bg-gray-900 selection:bg-red-500 selection:text-white svelte-1kc1ayf">${canLogin ? `<div class="sm:fixed sm:top-0 sm:right-0 p-6 text-right">${$page.props.auth.user ? `${validate_component(Link$1, "Link").$$render(
    $$result,
    {
      href: route("dashboard"),
      class: "font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white focus:outline focus:outline-2 focus:rounded-sm focus:outline-red-500"
    },
    {},
    {
      default: () => {
        return `Dashboard`;
      }
    }
  )}` : `${canLogin ? `${validate_component(Link$1, "Link").$$render(
    $$result,
    {
      href: route("login"),
      class: "font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white focus:outline focus:outline-2 focus:rounded-sm focus:outline-red-500"
    },
    {},
    {
      default: () => {
        return `Log in`;
      }
    }
  )}` : ``}

                ${canRegister ? `${validate_component(Link$1, "Link").$$render(
    $$result,
    {
      href: route("register"),
      class: "ml-4 font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white focus:outline focus:outline-2 focus:rounded-sm focus:outline-red-500"
    },
    {},
    {
      default: () => {
        return `Register`;
      }
    }
  )}` : ``}`}</div>` : ``}

    <div class="max-w-7xl mx-auto p-6 lg:p-8"><div class="flex justify-center"><svg viewBox="0 0 62 65" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-16 w-auto bg-gray-100 dark:bg-gray-900"><path d="M61.8548 14.6253C61.8778 14.7102 61.8895 14.7978 61.8897 14.8858V28.5615C61.8898 28.737 61.8434 28.9095 61.7554 29.0614C61.6675 29.2132 61.5409 29.3392 61.3887 29.4265L49.9104 36.0351V49.1337C49.9104 49.4902 49.7209 49.8192 49.4118 49.9987L25.4519 63.7916C25.3971 63.8227 25.3372 63.8427 25.2774 63.8639C25.255 63.8714 25.2338 63.8851 25.2101 63.8913C25.0426 63.9354 24.8666 63.9354 24.6991 63.8913C24.6716 63.8838 24.6467 63.8689 24.6205 63.8589C24.5657 63.8389 24.5084 63.8215 24.456 63.7916L0.501061 49.9987C0.348882 49.9113 0.222437 49.7853 0.134469 49.6334C0.0465019 49.4816 0.000120578 49.3092 0 49.1337L0 8.10652C0 8.01678 0.0124642 7.92953 0.0348998 7.84477C0.0423783 7.8161 0.0598282 7.78993 0.0697995 7.76126C0.0884958 7.70891 0.105946 7.65531 0.133367 7.6067C0.152063 7.5743 0.179485 7.54812 0.20192 7.51821C0.230588 7.47832 0.256763 7.43719 0.290416 7.40229C0.319084 7.37362 0.356476 7.35243 0.388883 7.32751C0.425029 7.29759 0.457436 7.26518 0.498568 7.2415L12.4779 0.345059C12.6296 0.257786 12.8015 0.211853 12.9765 0.211853C13.1515 0.211853 13.3234 0.257786 13.475 0.345059L25.4531 7.2415H25.4556C25.4955 7.26643 25.5292 7.29759 25.5653 7.32626C25.5977 7.35119 25.6339 7.37362 25.6625 7.40104C25.6974 7.43719 25.7224 7.47832 25.7523 7.51821C25.7735 7.54812 25.8021 7.5743 25.8196 7.6067C25.8483 7.65656 25.8645 7.70891 25.8844 7.76126C25.8944 7.78993 25.9118 7.8161 25.9193 7.84602C25.9423 7.93096 25.954 8.01853 25.9542 8.10652V33.7317L35.9355 27.9844V14.8846C35.9355 14.7973 35.948 14.7088 35.9704 14.6253C35.9792 14.5954 35.9954 14.5692 36.0053 14.5405C36.0253 14.4882 36.0427 14.4346 36.0702 14.386C36.0888 14.3536 36.1163 14.3274 36.1375 14.2975C36.1674 14.2576 36.1923 14.2165 36.2272 14.1816C36.2559 14.1529 36.292 14.1317 36.3244 14.1068C36.3618 14.0769 36.3942 14.0445 36.4341 14.0208L48.4147 7.12434C48.5663 7.03694 48.7383 6.99094 48.9133 6.99094C49.0883 6.99094 49.2602 7.03694 49.4118 7.12434L61.3899 14.0208C61.4323 14.0457 61.4647 14.0769 61.5021 14.1055C61.5333 14.1305 61.5694 14.1529 61.5981 14.1803C61.633 14.2165 61.6579 14.2576 61.6878 14.2975C61.7103 14.3274 61.7377 14.3536 61.7551 14.386C61.7838 14.4346 61.8 14.4882 61.8199 14.5405C61.8312 14.5692 61.8474 14.5954 61.8548 14.6253ZM59.893 27.9844V16.6121L55.7013 19.0252L49.9104 22.3593V33.7317L59.8942 27.9844H59.893ZM47.9149 48.5566V37.1768L42.2187 40.4299L25.953 49.7133V61.2003L47.9149 48.5566ZM1.99677 9.83281V48.5566L23.9562 61.199V49.7145L12.4841 43.2219L12.4804 43.2194L12.4754 43.2169C12.4368 43.1945 12.4044 43.1621 12.3682 43.1347C12.3371 43.1097 12.3009 43.0898 12.2735 43.0624L12.271 43.0586C12.2386 43.0275 12.2162 42.9888 12.1887 42.9539C12.1638 42.9203 12.1339 42.8916 12.114 42.8567L12.1127 42.853C12.0903 42.8156 12.0766 42.7707 12.0604 42.7283C12.0442 42.6909 12.023 42.656 12.013 42.6161C12.0005 42.5688 11.998 42.5177 11.9931 42.4691C11.9881 42.4317 11.9781 42.3943 11.9781 42.3569V15.5801L6.18848 12.2446L1.99677 9.83281ZM12.9777 2.36177L2.99764 8.10652L12.9752 13.8513L22.9541 8.10527L12.9752 2.36177H12.9777ZM18.1678 38.2138L23.9574 34.8809V9.83281L19.7657 12.2459L13.9749 15.5801V40.6281L18.1678 38.2138ZM48.9133 9.14105L38.9344 14.8858L48.9133 20.6305L58.8909 14.8846L48.9133 9.14105ZM47.9149 22.3593L42.124 19.0252L37.9323 16.6121V27.9844L43.7219 31.3174L47.9149 33.7317V22.3593ZM24.9533 47.987L39.59 39.631L46.9065 35.4555L36.9352 29.7145L25.4544 36.3242L14.9907 42.3482L24.9533 47.987Z" fill="#FF2D20"></path></svg></div>

        <div class="mt-16"><div class="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8"><a href="https://laravel.com/docs" class="scale-100 p-6 bg-white dark:bg-gray-800/50 dark:bg-gradient-to-bl from-gray-700/50 via-transparent dark:ring-1 dark:ring-inset dark:ring-white/5 rounded-lg shadow-2xl shadow-gray-500/20 dark:shadow-none flex motion-safe:hover:scale-[1.01] transition-all duration-250 focus:outline focus:outline-2 focus:outline-red-500"><div><div class="h-16 w-16 bg-red-50 dark:bg-red-800/20 flex items-center justify-center rounded-full"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" class="w-7 h-7 stroke-red-500"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"></path></svg></div>

                        <h2 class="mt-6 text-xl font-semibold text-gray-900 dark:text-white">Documentation
                        </h2>

                        <p class="mt-4 text-gray-500 dark:text-gray-400 text-sm leading-relaxed">Laravel has wonderful documentation covering every
                            aspect of the framework. Whether you are a newcomer
                            or have prior experience with Laravel, we recommend
                            reading our documentation from beginning to end.
                        </p></div>

                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" class="self-center shrink-0 stroke-red-500 w-6 h-6 mx-6"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"></path></svg></a>

                <a href="https://laracasts.com" class="scale-100 p-6 bg-white dark:bg-gray-800/50 dark:bg-gradient-to-bl from-gray-700/50 via-transparent dark:ring-1 dark:ring-inset dark:ring-white/5 rounded-lg shadow-2xl shadow-gray-500/20 dark:shadow-none flex motion-safe:hover:scale-[1.01] transition-all duration-250 focus:outline focus:outline-2 focus:outline-red-500"><div><div class="h-16 w-16 bg-red-50 dark:bg-red-800/20 flex items-center justify-center rounded-full"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" class="w-7 h-7 stroke-red-500"><path stroke-linecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"></path></svg></div>

                        <h2 class="mt-6 text-xl font-semibold text-gray-900 dark:text-white">Laracasts
                        </h2>

                        <p class="mt-4 text-gray-500 dark:text-gray-400 text-sm leading-relaxed">Laracasts offers thousands of video tutorials on
                            Laravel, PHP, and JavaScript development. Check them
                            out, see for yourself, and massively level up your
                            development skills in the process.
                        </p></div>

                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" class="self-center shrink-0 stroke-red-500 w-6 h-6 mx-6"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"></path></svg></a>

                <a href="https://laravel-news.com" class="scale-100 p-6 bg-white dark:bg-gray-800/50 dark:bg-gradient-to-bl from-gray-700/50 via-transparent dark:ring-1 dark:ring-inset dark:ring-white/5 rounded-lg shadow-2xl shadow-gray-500/20 dark:shadow-none flex motion-safe:hover:scale-[1.01] transition-all duration-250 focus:outline focus:outline-2 focus:outline-red-500"><div><div class="h-16 w-16 bg-red-50 dark:bg-red-800/20 flex items-center justify-center rounded-full"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" class="w-7 h-7 stroke-red-500"><path stroke-linecap="round" stroke-linejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"></path></svg></div>

                        <h2 class="mt-6 text-xl font-semibold text-gray-900 dark:text-white">Laravel News
                        </h2>

                        <p class="mt-4 text-gray-500 dark:text-gray-400 text-sm leading-relaxed">Laravel News is a community driven portal and
                            newsletter aggregating all of the latest and most
                            important news in the Laravel ecosystem, including
                            new package releases and tutorials.
                        </p></div>

                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" class="self-center shrink-0 stroke-red-500 w-6 h-6 mx-6"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"></path></svg></a>

                <div class="scale-100 p-6 bg-white dark:bg-gray-800/50 dark:bg-gradient-to-bl from-gray-700/50 via-transparent dark:ring-1 dark:ring-inset dark:ring-white/5 rounded-lg shadow-2xl shadow-gray-500/20 dark:shadow-none flex motion-safe:hover:scale-[1.01] transition-all duration-250 focus:outline focus:outline-2 focus:outline-red-500"><div><div class="h-16 w-16 bg-red-50 dark:bg-red-800/20 flex items-center justify-center rounded-full"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" class="w-7 h-7 stroke-red-500"><path stroke-linecap="round" stroke-linejoin="round" d="M6.115 5.19l.319 1.913A6 6 0 008.11 10.36L9.75 12l-.387.775c-.217.433-.132.956.21 1.298l1.348 1.348c.21.21.329.497.329.795v1.089c0 .426.24.815.622 1.006l.153.076c.433.217.956.132 1.298-.21l.723-.723a8.7 8.7 0 002.288-4.042 1.087 1.087 0 00-.358-1.099l-1.33-1.108c-.251-.21-.582-.299-.905-.245l-1.17.195a1.125 1.125 0 01-.98-.314l-.295-.295a1.125 1.125 0 010-1.591l.13-.132a1.125 1.125 0 011.3-.21l.603.302a.809.809 0 001.086-1.086L14.25 7.5l1.256-.837a4.5 4.5 0 001.528-1.732l.146-.292M6.115 5.19A9 9 0 1017.18 4.64M6.115 5.19A8.965 8.965 0 0112 3c1.929 0 3.716.607 5.18 1.64"></path></svg></div>

                        <h2 class="mt-6 text-xl font-semibold text-gray-900 dark:text-white">Vibrant Ecosystem
                        </h2>

                        <p class="mt-4 text-gray-500 dark:text-gray-400 text-sm leading-relaxed">Laravel&#39;s robust library of first-party tools and
                            libraries, such as
                            <a href="https://forge.laravel.com" class="underline hover:text-gray-700 dark:hover:text-white focus:outline focus:outline-2 focus:rounded-sm focus:outline-red-500">Forge</a>,
                            <a href="https://vapor.laravel.com" class="underline hover:text-gray-700 dark:hover:text-white focus:outline focus:outline-2 focus:rounded-sm focus:outline-red-500">Vapor</a>,
                            <a href="https://nova.laravel.com" class="underline hover:text-gray-700 dark:hover:text-white focus:outline focus:outline-2 focus:rounded-sm focus:outline-red-500">Nova</a>, and
                            <a href="https://envoyer.io" class="underline hover:text-gray-700 dark:hover:text-white focus:outline focus:outline-2 focus:rounded-sm focus:outline-red-500">Envoyer</a>
                            help you take your projects to the next level. Pair them
                            with powerful open source libraries like
                            <a href="https://laravel.com/docs/billing" class="underline hover:text-gray-700 dark:hover:text-white focus:outline focus:outline-2 focus:rounded-sm focus:outline-red-500">Cashier</a>,
                            <a href="https://laravel.com/docs/dusk" class="underline hover:text-gray-700 dark:hover:text-white focus:outline focus:outline-2 focus:rounded-sm focus:outline-red-500">Dusk</a>,
                            <a href="https://laravel.com/docs/broadcasting" class="underline hover:text-gray-700 dark:hover:text-white focus:outline focus:outline-2 focus:rounded-sm focus:outline-red-500">Echo</a>,
                            <a href="https://laravel.com/docs/horizon" class="underline hover:text-gray-700 dark:hover:text-white focus:outline focus:outline-2 focus:rounded-sm focus:outline-red-500">Horizon</a>,
                            <a href="https://laravel.com/docs/sanctum" class="underline hover:text-gray-700 dark:hover:text-white focus:outline focus:outline-2 focus:rounded-sm focus:outline-red-500">Sanctum</a>,
                            <a href="https://laravel.com/docs/telescope" class="underline hover:text-gray-700 dark:hover:text-white focus:outline focus:outline-2 focus:rounded-sm focus:outline-red-500">Telescope</a>, and more.
                        </p></div></div></div></div>

        <div class="flex justify-center mt-16 px-6 sm:items-center sm:justify-between"><div class="text-center text-sm text-gray-500 dark:text-gray-400 sm:text-left"><div class="flex items-center gap-4"><a href="https://github.com/sponsors/taylorotwell" class="group inline-flex items-center hover:text-gray-700 dark:hover:text-white focus:outline focus:outline-2 focus:rounded-sm focus:outline-red-500"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" class="-mt-px mr-1 w-5 h-5 stroke-gray-400 dark:stroke-gray-600 group-hover:stroke-gray-600 dark:group-hover:stroke-gray-400"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"></path></svg>
                        Sponsor
                    </a></div></div>

            <div class="ml-4 text-center text-sm text-gray-500 dark:text-gray-400 sm:text-right sm:ml-0">Laravel v${escape$1(laravelVersion)} (PHP v${escape$1(phpVersion)})
            </div></div></div>
</div>`;
});
const __vite_glob_0_11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Welcome
}, Symbol.toStringTag, { value: "Module" }));
const Ziggy$1 = { "url": "http://localhost", "port": null, "defaults": {}, "routes": { "sanctum.csrf-cookie": { "uri": "sanctum/csrf-cookie", "methods": ["GET", "HEAD"] }, "ignition.healthCheck": { "uri": "_ignition/health-check", "methods": ["GET", "HEAD"] }, "ignition.executeSolution": { "uri": "_ignition/execute-solution", "methods": ["POST"] }, "ignition.updateConfig": { "uri": "_ignition/update-config", "methods": ["POST"] }, "dashboard": { "uri": "dashboard", "methods": ["GET", "HEAD"] }, "profile.edit": { "uri": "profile", "methods": ["GET", "HEAD"] }, "profile.update": { "uri": "profile", "methods": ["PATCH"] }, "profile.destroy": { "uri": "profile", "methods": ["DELETE"] }, "register": { "uri": "register", "methods": ["GET", "HEAD"] }, "login": { "uri": "login", "methods": ["GET", "HEAD"] }, "password.request": { "uri": "forgot-password", "methods": ["GET", "HEAD"] }, "password.email": { "uri": "forgot-password", "methods": ["POST"] }, "password.reset": { "uri": "reset-password/{token}", "methods": ["GET", "HEAD"] }, "password.store": { "uri": "reset-password", "methods": ["POST"] }, "verification.notice": { "uri": "verify-email", "methods": ["GET", "HEAD"] }, "verification.verify": { "uri": "verify-email/{id}/{hash}", "methods": ["GET", "HEAD"] }, "verification.send": { "uri": "email/verification-notification", "methods": ["POST"] }, "password.confirm": { "uri": "confirm-password", "methods": ["GET", "HEAD"] }, "password.update": { "uri": "password", "methods": ["PUT"] }, "logout": { "uri": "logout", "methods": ["POST"] } } };
if (typeof window !== "undefined" && typeof window.Ziggy !== "undefined") {
  Object.assign(Ziggy$1.routes, window.Ziggy.routes);
}
function t(t4, r2) {
  for (var e2 = 0; e2 < r2.length; e2++) {
    var n2 = r2[e2];
    n2.enumerable = n2.enumerable || false, n2.configurable = true, "value" in n2 && (n2.writable = true), Object.defineProperty(t4, "symbol" == typeof (i2 = function(t5, r3) {
      if ("object" != typeof t5 || null === t5)
        return t5;
      var e3 = t5[Symbol.toPrimitive];
      if (void 0 !== e3) {
        var n3 = e3.call(t5, "string");
        if ("object" != typeof n3)
          return n3;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return String(t5);
    }(n2.key)) ? i2 : String(i2), n2);
  }
  var i2;
}
function r(r2, e2, n2) {
  return e2 && t(r2.prototype, e2), n2 && t(r2, n2), Object.defineProperty(r2, "prototype", { writable: false }), r2;
}
function e() {
  return e = Object.assign ? Object.assign.bind() : function(t4) {
    for (var r2 = 1; r2 < arguments.length; r2++) {
      var e2 = arguments[r2];
      for (var n2 in e2)
        Object.prototype.hasOwnProperty.call(e2, n2) && (t4[n2] = e2[n2]);
    }
    return t4;
  }, e.apply(this, arguments);
}
function n(t4) {
  return n = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t5) {
    return t5.__proto__ || Object.getPrototypeOf(t5);
  }, n(t4);
}
function i(t4, r2) {
  return i = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t5, r3) {
    return t5.__proto__ = r3, t5;
  }, i(t4, r2);
}
function o(t4, r2, e2) {
  return o = function() {
    if ("undefined" == typeof Reflect || !Reflect.construct)
      return false;
    if (Reflect.construct.sham)
      return false;
    if ("function" == typeof Proxy)
      return true;
    try {
      return Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
      })), true;
    } catch (t5) {
      return false;
    }
  }() ? Reflect.construct.bind() : function(t5, r3, e3) {
    var n2 = [null];
    n2.push.apply(n2, r3);
    var o2 = new (Function.bind.apply(t5, n2))();
    return e3 && i(o2, e3.prototype), o2;
  }, o.apply(null, arguments);
}
function u(t4) {
  var r2 = "function" == typeof Map ? /* @__PURE__ */ new Map() : void 0;
  return u = function(t5) {
    if (null === t5 || -1 === Function.toString.call(t5).indexOf("[native code]"))
      return t5;
    if ("function" != typeof t5)
      throw new TypeError("Super expression must either be null or a function");
    if (void 0 !== r2) {
      if (r2.has(t5))
        return r2.get(t5);
      r2.set(t5, e2);
    }
    function e2() {
      return o(t5, arguments, n(this).constructor);
    }
    return e2.prototype = Object.create(t5.prototype, { constructor: { value: e2, enumerable: false, writable: true, configurable: true } }), i(e2, t5);
  }, u(t4);
}
var f = String.prototype.replace, a = /%20/g, c = "RFC3986", l = { default: c, formatters: { RFC1738: function(t4) {
  return f.call(t4, a, "+");
}, RFC3986: function(t4) {
  return String(t4);
} }, RFC1738: "RFC1738", RFC3986: c }, s = Object.prototype.hasOwnProperty, v = Array.isArray, p = function() {
  for (var t4 = [], r2 = 0; r2 < 256; ++r2)
    t4.push("%" + ((r2 < 16 ? "0" : "") + r2.toString(16)).toUpperCase());
  return t4;
}(), y = function(t4, r2) {
  for (var e2 = r2 && r2.plainObjects ? /* @__PURE__ */ Object.create(null) : {}, n2 = 0; n2 < t4.length; ++n2)
    void 0 !== t4[n2] && (e2[n2] = t4[n2]);
  return e2;
}, d = { arrayToObject: y, assign: function(t4, r2) {
  return Object.keys(r2).reduce(function(t5, e2) {
    return t5[e2] = r2[e2], t5;
  }, t4);
}, combine: function(t4, r2) {
  return [].concat(t4, r2);
}, compact: function(t4) {
  for (var r2 = [{ obj: { o: t4 }, prop: "o" }], e2 = [], n2 = 0; n2 < r2.length; ++n2)
    for (var i2 = r2[n2], o2 = i2.obj[i2.prop], u2 = Object.keys(o2), f2 = 0; f2 < u2.length; ++f2) {
      var a2 = u2[f2], c2 = o2[a2];
      "object" == typeof c2 && null !== c2 && -1 === e2.indexOf(c2) && (r2.push({ obj: o2, prop: a2 }), e2.push(c2));
    }
  return function(t5) {
    for (; t5.length > 1; ) {
      var r3 = t5.pop(), e3 = r3.obj[r3.prop];
      if (v(e3)) {
        for (var n3 = [], i3 = 0; i3 < e3.length; ++i3)
          void 0 !== e3[i3] && n3.push(e3[i3]);
        r3.obj[r3.prop] = n3;
      }
    }
  }(r2), t4;
}, decode: function(t4, r2, e2) {
  var n2 = t4.replace(/\+/g, " ");
  if ("iso-8859-1" === e2)
    return n2.replace(/%[0-9a-f]{2}/gi, unescape);
  try {
    return decodeURIComponent(n2);
  } catch (t5) {
    return n2;
  }
}, encode: function(t4, r2, e2, n2, i2) {
  if (0 === t4.length)
    return t4;
  var o2 = t4;
  if ("symbol" == typeof t4 ? o2 = Symbol.prototype.toString.call(t4) : "string" != typeof t4 && (o2 = String(t4)), "iso-8859-1" === e2)
    return escape(o2).replace(/%u[0-9a-f]{4}/gi, function(t5) {
      return "%26%23" + parseInt(t5.slice(2), 16) + "%3B";
    });
  for (var u2 = "", f2 = 0; f2 < o2.length; ++f2) {
    var a2 = o2.charCodeAt(f2);
    45 === a2 || 46 === a2 || 95 === a2 || 126 === a2 || a2 >= 48 && a2 <= 57 || a2 >= 65 && a2 <= 90 || a2 >= 97 && a2 <= 122 || i2 === l.RFC1738 && (40 === a2 || 41 === a2) ? u2 += o2.charAt(f2) : a2 < 128 ? u2 += p[a2] : a2 < 2048 ? u2 += p[192 | a2 >> 6] + p[128 | 63 & a2] : a2 < 55296 || a2 >= 57344 ? u2 += p[224 | a2 >> 12] + p[128 | a2 >> 6 & 63] + p[128 | 63 & a2] : (a2 = 65536 + ((1023 & a2) << 10 | 1023 & o2.charCodeAt(f2 += 1)), u2 += p[240 | a2 >> 18] + p[128 | a2 >> 12 & 63] + p[128 | a2 >> 6 & 63] + p[128 | 63 & a2]);
  }
  return u2;
}, isBuffer: function(t4) {
  return !(!t4 || "object" != typeof t4 || !(t4.constructor && t4.constructor.isBuffer && t4.constructor.isBuffer(t4)));
}, isRegExp: function(t4) {
  return "[object RegExp]" === Object.prototype.toString.call(t4);
}, maybeMap: function(t4, r2) {
  if (v(t4)) {
    for (var e2 = [], n2 = 0; n2 < t4.length; n2 += 1)
      e2.push(r2(t4[n2]));
    return e2;
  }
  return r2(t4);
}, merge: function t2(r2, e2, n2) {
  if (!e2)
    return r2;
  if ("object" != typeof e2) {
    if (v(r2))
      r2.push(e2);
    else {
      if (!r2 || "object" != typeof r2)
        return [r2, e2];
      (n2 && (n2.plainObjects || n2.allowPrototypes) || !s.call(Object.prototype, e2)) && (r2[e2] = true);
    }
    return r2;
  }
  if (!r2 || "object" != typeof r2)
    return [r2].concat(e2);
  var i2 = r2;
  return v(r2) && !v(e2) && (i2 = y(r2, n2)), v(r2) && v(e2) ? (e2.forEach(function(e3, i3) {
    if (s.call(r2, i3)) {
      var o2 = r2[i3];
      o2 && "object" == typeof o2 && e3 && "object" == typeof e3 ? r2[i3] = t2(o2, e3, n2) : r2.push(e3);
    } else
      r2[i3] = e3;
  }), r2) : Object.keys(e2).reduce(function(r3, i3) {
    var o2 = e2[i3];
    return r3[i3] = s.call(r3, i3) ? t2(r3[i3], o2, n2) : o2, r3;
  }, i2);
} }, b = Object.prototype.hasOwnProperty, h = { brackets: function(t4) {
  return t4 + "[]";
}, comma: "comma", indices: function(t4, r2) {
  return t4 + "[" + r2 + "]";
}, repeat: function(t4) {
  return t4;
} }, g = Array.isArray, m = String.prototype.split, j = Array.prototype.push, w = function(t4, r2) {
  j.apply(t4, g(r2) ? r2 : [r2]);
}, O = Date.prototype.toISOString, E = l.default, R = { addQueryPrefix: false, allowDots: false, charset: "utf-8", charsetSentinel: false, delimiter: "&", encode: true, encoder: d.encode, encodeValuesOnly: false, format: E, formatter: l.formatters[E], indices: false, serializeDate: function(t4) {
  return O.call(t4);
}, skipNulls: false, strictNullHandling: false }, S = function t3(r2, e2, n2, i2, o2, u2, f2, a2, c2, l2, s2, v2, p2, y2) {
  var b2, h2 = r2;
  if ("function" == typeof f2 ? h2 = f2(e2, h2) : h2 instanceof Date ? h2 = l2(h2) : "comma" === n2 && g(h2) && (h2 = d.maybeMap(h2, function(t4) {
    return t4 instanceof Date ? l2(t4) : t4;
  })), null === h2) {
    if (i2)
      return u2 && !p2 ? u2(e2, R.encoder, y2, "key", s2) : e2;
    h2 = "";
  }
  if ("string" == typeof (b2 = h2) || "number" == typeof b2 || "boolean" == typeof b2 || "symbol" == typeof b2 || "bigint" == typeof b2 || d.isBuffer(h2)) {
    if (u2) {
      var j2 = p2 ? e2 : u2(e2, R.encoder, y2, "key", s2);
      if ("comma" === n2 && p2) {
        for (var O2 = m.call(String(h2), ","), E2 = "", S2 = 0; S2 < O2.length; ++S2)
          E2 += (0 === S2 ? "" : ",") + v2(u2(O2[S2], R.encoder, y2, "value", s2));
        return [v2(j2) + "=" + E2];
      }
      return [v2(j2) + "=" + v2(u2(h2, R.encoder, y2, "value", s2))];
    }
    return [v2(e2) + "=" + v2(String(h2))];
  }
  var k2, x2 = [];
  if (void 0 === h2)
    return x2;
  if ("comma" === n2 && g(h2))
    k2 = [{ value: h2.length > 0 ? h2.join(",") || null : void 0 }];
  else if (g(f2))
    k2 = f2;
  else {
    var T2 = Object.keys(h2);
    k2 = a2 ? T2.sort(a2) : T2;
  }
  for (var N2 = 0; N2 < k2.length; ++N2) {
    var C2 = k2[N2], D2 = "object" == typeof C2 && void 0 !== C2.value ? C2.value : h2[C2];
    if (!o2 || null !== D2) {
      var $2 = g(h2) ? "function" == typeof n2 ? n2(e2, C2) : e2 : e2 + (c2 ? "." + C2 : "[" + C2 + "]");
      w(x2, t3(D2, $2, n2, i2, o2, u2, f2, a2, c2, l2, s2, v2, p2, y2));
    }
  }
  return x2;
}, k = Object.prototype.hasOwnProperty, x = Array.isArray, T = { allowDots: false, allowPrototypes: false, arrayLimit: 20, charset: "utf-8", charsetSentinel: false, comma: false, decoder: d.decode, delimiter: "&", depth: 5, ignoreQueryPrefix: false, interpretNumericEntities: false, parameterLimit: 1e3, parseArrays: true, plainObjects: false, strictNullHandling: false }, N = function(t4) {
  return t4.replace(/&#(\d+);/g, function(t5, r2) {
    return String.fromCharCode(parseInt(r2, 10));
  });
}, C = function(t4, r2) {
  return t4 && "string" == typeof t4 && r2.comma && t4.indexOf(",") > -1 ? t4.split(",") : t4;
}, D = function(t4, r2, e2, n2) {
  if (t4) {
    var i2 = e2.allowDots ? t4.replace(/\.([^.[]+)/g, "[$1]") : t4, o2 = /(\[[^[\]]*])/g, u2 = e2.depth > 0 && /(\[[^[\]]*])/.exec(i2), f2 = u2 ? i2.slice(0, u2.index) : i2, a2 = [];
    if (f2) {
      if (!e2.plainObjects && k.call(Object.prototype, f2) && !e2.allowPrototypes)
        return;
      a2.push(f2);
    }
    for (var c2 = 0; e2.depth > 0 && null !== (u2 = o2.exec(i2)) && c2 < e2.depth; ) {
      if (c2 += 1, !e2.plainObjects && k.call(Object.prototype, u2[1].slice(1, -1)) && !e2.allowPrototypes)
        return;
      a2.push(u2[1]);
    }
    return u2 && a2.push("[" + i2.slice(u2.index) + "]"), function(t5, r3, e3, n3) {
      for (var i3 = n3 ? r3 : C(r3, e3), o3 = t5.length - 1; o3 >= 0; --o3) {
        var u3, f3 = t5[o3];
        if ("[]" === f3 && e3.parseArrays)
          u3 = [].concat(i3);
        else {
          u3 = e3.plainObjects ? /* @__PURE__ */ Object.create(null) : {};
          var a3 = "[" === f3.charAt(0) && "]" === f3.charAt(f3.length - 1) ? f3.slice(1, -1) : f3, c3 = parseInt(a3, 10);
          e3.parseArrays || "" !== a3 ? !isNaN(c3) && f3 !== a3 && String(c3) === a3 && c3 >= 0 && e3.parseArrays && c3 <= e3.arrayLimit ? (u3 = [])[c3] = i3 : "__proto__" !== a3 && (u3[a3] = i3) : u3 = { 0: i3 };
        }
        i3 = u3;
      }
      return i3;
    }(a2, r2, e2, n2);
  }
}, $ = function(t4, r2) {
  var e2 = function(t5) {
    if (!t5)
      return T;
    if (null != t5.decoder && "function" != typeof t5.decoder)
      throw new TypeError("Decoder has to be a function.");
    if (void 0 !== t5.charset && "utf-8" !== t5.charset && "iso-8859-1" !== t5.charset)
      throw new TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
    return { allowDots: void 0 === t5.allowDots ? T.allowDots : !!t5.allowDots, allowPrototypes: "boolean" == typeof t5.allowPrototypes ? t5.allowPrototypes : T.allowPrototypes, arrayLimit: "number" == typeof t5.arrayLimit ? t5.arrayLimit : T.arrayLimit, charset: void 0 === t5.charset ? T.charset : t5.charset, charsetSentinel: "boolean" == typeof t5.charsetSentinel ? t5.charsetSentinel : T.charsetSentinel, comma: "boolean" == typeof t5.comma ? t5.comma : T.comma, decoder: "function" == typeof t5.decoder ? t5.decoder : T.decoder, delimiter: "string" == typeof t5.delimiter || d.isRegExp(t5.delimiter) ? t5.delimiter : T.delimiter, depth: "number" == typeof t5.depth || false === t5.depth ? +t5.depth : T.depth, ignoreQueryPrefix: true === t5.ignoreQueryPrefix, interpretNumericEntities: "boolean" == typeof t5.interpretNumericEntities ? t5.interpretNumericEntities : T.interpretNumericEntities, parameterLimit: "number" == typeof t5.parameterLimit ? t5.parameterLimit : T.parameterLimit, parseArrays: false !== t5.parseArrays, plainObjects: "boolean" == typeof t5.plainObjects ? t5.plainObjects : T.plainObjects, strictNullHandling: "boolean" == typeof t5.strictNullHandling ? t5.strictNullHandling : T.strictNullHandling };
  }(r2);
  if ("" === t4 || null == t4)
    return e2.plainObjects ? /* @__PURE__ */ Object.create(null) : {};
  for (var n2 = "string" == typeof t4 ? function(t5, r3) {
    var e3, n3 = {}, i3 = (r3.ignoreQueryPrefix ? t5.replace(/^\?/, "") : t5).split(r3.delimiter, Infinity === r3.parameterLimit ? void 0 : r3.parameterLimit), o3 = -1, u3 = r3.charset;
    if (r3.charsetSentinel)
      for (e3 = 0; e3 < i3.length; ++e3)
        0 === i3[e3].indexOf("utf8=") && ("utf8=%E2%9C%93" === i3[e3] ? u3 = "utf-8" : "utf8=%26%2310003%3B" === i3[e3] && (u3 = "iso-8859-1"), o3 = e3, e3 = i3.length);
    for (e3 = 0; e3 < i3.length; ++e3)
      if (e3 !== o3) {
        var f3, a3, c2 = i3[e3], l2 = c2.indexOf("]="), s2 = -1 === l2 ? c2.indexOf("=") : l2 + 1;
        -1 === s2 ? (f3 = r3.decoder(c2, T.decoder, u3, "key"), a3 = r3.strictNullHandling ? null : "") : (f3 = r3.decoder(c2.slice(0, s2), T.decoder, u3, "key"), a3 = d.maybeMap(C(c2.slice(s2 + 1), r3), function(t6) {
          return r3.decoder(t6, T.decoder, u3, "value");
        })), a3 && r3.interpretNumericEntities && "iso-8859-1" === u3 && (a3 = N(a3)), c2.indexOf("[]=") > -1 && (a3 = x(a3) ? [a3] : a3), n3[f3] = k.call(n3, f3) ? d.combine(n3[f3], a3) : a3;
      }
    return n3;
  }(t4, e2) : t4, i2 = e2.plainObjects ? /* @__PURE__ */ Object.create(null) : {}, o2 = Object.keys(n2), u2 = 0; u2 < o2.length; ++u2) {
    var f2 = o2[u2], a2 = D(f2, n2[f2], e2, "string" == typeof t4);
    i2 = d.merge(i2, a2, e2);
  }
  return d.compact(i2);
}, F = /* @__PURE__ */ function() {
  function t4(t5, r2, e3) {
    var n2, i2;
    this.name = t5, this.definition = r2, this.bindings = null != (n2 = r2.bindings) ? n2 : {}, this.wheres = null != (i2 = r2.wheres) ? i2 : {}, this.config = e3;
  }
  var e2 = t4.prototype;
  return e2.matchesUrl = function(t5) {
    var r2 = this;
    if (!this.definition.methods.includes("GET"))
      return false;
    var e3 = this.template.replace(/(\/?){([^}?]*)(\??)}/g, function(t6, e4, n3, i3) {
      var o3, u3 = "(?<" + n3 + ">" + ((null == (o3 = r2.wheres[n3]) ? void 0 : o3.replace(/(^\^)|(\$$)/g, "")) || "[^/?]+") + ")";
      return i3 ? "(" + e4 + u3 + ")?" : "" + e4 + u3;
    }).replace(/^\w+:\/\//, ""), n2 = t5.replace(/^\w+:\/\//, "").split("?"), i2 = n2[0], o2 = n2[1], u2 = new RegExp("^" + e3 + "/?$").exec(i2);
    if (u2) {
      for (var f2 in u2.groups)
        u2.groups[f2] = "string" == typeof u2.groups[f2] ? decodeURIComponent(u2.groups[f2]) : u2.groups[f2];
      return { params: u2.groups, query: $(o2) };
    }
    return false;
  }, e2.compile = function(t5) {
    var r2 = this;
    return this.parameterSegments.length ? this.template.replace(/{([^}?]+)(\??)}/g, function(e3, n2, i2) {
      var o2, u2;
      if (!i2 && [null, void 0].includes(t5[n2]))
        throw new Error("Ziggy error: '" + n2 + "' parameter is required for route '" + r2.name + "'.");
      if (r2.wheres[n2] && !new RegExp("^" + (i2 ? "(" + r2.wheres[n2] + ")?" : r2.wheres[n2]) + "$").test(null != (u2 = t5[n2]) ? u2 : ""))
        throw new Error("Ziggy error: '" + n2 + "' parameter does not match required format '" + r2.wheres[n2] + "' for route '" + r2.name + "'.");
      return encodeURI(null != (o2 = t5[n2]) ? o2 : "").replace(/%7C/g, "|").replace(/%25/g, "%").replace(/\$/g, "%24");
    }).replace(this.origin + "//", this.origin + "/").replace(/\/+$/, "") : this.template;
  }, r(t4, [{ key: "template", get: function() {
    var t5 = (this.origin + "/" + this.definition.uri).replace(/\/+$/, "");
    return "" === t5 ? "/" : t5;
  } }, { key: "origin", get: function() {
    return this.config.absolute ? this.definition.domain ? "" + this.config.url.match(/^\w+:\/\//)[0] + this.definition.domain + (this.config.port ? ":" + this.config.port : "") : this.config.url : "";
  } }, { key: "parameterSegments", get: function() {
    var t5, r2;
    return null != (t5 = null == (r2 = this.template.match(/{[^}?]+\??}/g)) ? void 0 : r2.map(function(t6) {
      return { name: t6.replace(/{|\??}/g, ""), required: !/\?}$/.test(t6) };
    })) ? t5 : [];
  } }]), t4;
}(), P = /* @__PURE__ */ function(t4) {
  var n2, o2;
  function u2(r2, n3, i2, o3) {
    var u3;
    if (void 0 === i2 && (i2 = true), (u3 = t4.call(this) || this).t = null != o3 ? o3 : "undefined" != typeof Ziggy ? Ziggy : null == globalThis ? void 0 : globalThis.Ziggy, u3.t = e({}, u3.t, { absolute: i2 }), r2) {
      if (!u3.t.routes[r2])
        throw new Error("Ziggy error: route '" + r2 + "' is not in the route list.");
      u3.i = new F(r2, u3.t.routes[r2], u3.t), u3.u = u3.l(n3);
    }
    return u3;
  }
  o2 = t4, (n2 = u2).prototype = Object.create(o2.prototype), n2.prototype.constructor = n2, i(n2, o2);
  var f2 = u2.prototype;
  return f2.toString = function() {
    var t5 = this, r2 = Object.keys(this.u).filter(function(r3) {
      return !t5.i.parameterSegments.some(function(t6) {
        return t6.name === r3;
      });
    }).filter(function(t6) {
      return "_query" !== t6;
    }).reduce(function(r3, n3) {
      var i2;
      return e({}, r3, ((i2 = {})[n3] = t5.u[n3], i2));
    }, {});
    return this.i.compile(this.u) + function(t6, r3) {
      var e2, n3 = t6, i2 = function(t7) {
        if (!t7)
          return R;
        if (null != t7.encoder && "function" != typeof t7.encoder)
          throw new TypeError("Encoder has to be a function.");
        var r4 = t7.charset || R.charset;
        if (void 0 !== t7.charset && "utf-8" !== t7.charset && "iso-8859-1" !== t7.charset)
          throw new TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
        var e3 = l.default;
        if (void 0 !== t7.format) {
          if (!b.call(l.formatters, t7.format))
            throw new TypeError("Unknown format option provided.");
          e3 = t7.format;
        }
        var n4 = l.formatters[e3], i3 = R.filter;
        return ("function" == typeof t7.filter || g(t7.filter)) && (i3 = t7.filter), { addQueryPrefix: "boolean" == typeof t7.addQueryPrefix ? t7.addQueryPrefix : R.addQueryPrefix, allowDots: void 0 === t7.allowDots ? R.allowDots : !!t7.allowDots, charset: r4, charsetSentinel: "boolean" == typeof t7.charsetSentinel ? t7.charsetSentinel : R.charsetSentinel, delimiter: void 0 === t7.delimiter ? R.delimiter : t7.delimiter, encode: "boolean" == typeof t7.encode ? t7.encode : R.encode, encoder: "function" == typeof t7.encoder ? t7.encoder : R.encoder, encodeValuesOnly: "boolean" == typeof t7.encodeValuesOnly ? t7.encodeValuesOnly : R.encodeValuesOnly, filter: i3, format: e3, formatter: n4, serializeDate: "function" == typeof t7.serializeDate ? t7.serializeDate : R.serializeDate, skipNulls: "boolean" == typeof t7.skipNulls ? t7.skipNulls : R.skipNulls, sort: "function" == typeof t7.sort ? t7.sort : null, strictNullHandling: "boolean" == typeof t7.strictNullHandling ? t7.strictNullHandling : R.strictNullHandling };
      }(r3);
      "function" == typeof i2.filter ? n3 = (0, i2.filter)("", n3) : g(i2.filter) && (e2 = i2.filter);
      var o3 = [];
      if ("object" != typeof n3 || null === n3)
        return "";
      var u3 = h[r3 && r3.arrayFormat in h ? r3.arrayFormat : r3 && "indices" in r3 ? r3.indices ? "indices" : "repeat" : "indices"];
      e2 || (e2 = Object.keys(n3)), i2.sort && e2.sort(i2.sort);
      for (var f3 = 0; f3 < e2.length; ++f3) {
        var a2 = e2[f3];
        i2.skipNulls && null === n3[a2] || w(o3, S(n3[a2], a2, u3, i2.strictNullHandling, i2.skipNulls, i2.encode ? i2.encoder : null, i2.filter, i2.sort, i2.allowDots, i2.serializeDate, i2.format, i2.formatter, i2.encodeValuesOnly, i2.charset));
      }
      var c2 = o3.join(i2.delimiter), s2 = true === i2.addQueryPrefix ? "?" : "";
      return i2.charsetSentinel && (s2 += "iso-8859-1" === i2.charset ? "utf8=%26%2310003%3B&" : "utf8=%E2%9C%93&"), c2.length > 0 ? s2 + c2 : "";
    }(e({}, r2, this.u._query), { addQueryPrefix: true, arrayFormat: "indices", encodeValuesOnly: true, skipNulls: true, encoder: function(t6, r3) {
      return "boolean" == typeof t6 ? Number(t6) : r3(t6);
    } });
  }, f2.v = function(t5) {
    var r2 = this;
    t5 ? this.t.absolute && t5.startsWith("/") && (t5 = this.p().host + t5) : t5 = this.h();
    var n3 = {}, i2 = Object.entries(this.t.routes).find(function(e2) {
      return n3 = new F(e2[0], e2[1], r2.t).matchesUrl(t5);
    }) || [void 0, void 0];
    return e({ name: i2[0] }, n3, { route: i2[1] });
  }, f2.h = function() {
    var t5 = this.p(), r2 = t5.pathname, e2 = t5.search;
    return (this.t.absolute ? t5.host + r2 : r2.replace(this.t.url.replace(/^\w*:\/\/[^/]+/, ""), "").replace(/^\/+/, "/")) + e2;
  }, f2.current = function(t5, r2) {
    var n3 = this.v(), i2 = n3.name, o3 = n3.params, u3 = n3.query, f3 = n3.route;
    if (!t5)
      return i2;
    var a2 = new RegExp("^" + t5.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$").test(i2);
    if ([null, void 0].includes(r2) || !a2)
      return a2;
    var c2 = new F(i2, f3, this.t);
    r2 = this.l(r2, c2);
    var l2 = e({}, o3, u3);
    return !(!Object.values(r2).every(function(t6) {
      return !t6;
    }) || Object.values(l2).some(function(t6) {
      return void 0 !== t6;
    })) || Object.entries(r2).every(function(t6) {
      return l2[t6[0]] == t6[1];
    });
  }, f2.p = function() {
    var t5, r2, e2, n3, i2, o3, u3 = "undefined" != typeof window ? window.location : {}, f3 = u3.host, a2 = u3.pathname, c2 = u3.search;
    return { host: null != (t5 = null == (r2 = this.t.location) ? void 0 : r2.host) ? t5 : void 0 === f3 ? "" : f3, pathname: null != (e2 = null == (n3 = this.t.location) ? void 0 : n3.pathname) ? e2 : void 0 === a2 ? "" : a2, search: null != (i2 = null == (o3 = this.t.location) ? void 0 : o3.search) ? i2 : void 0 === c2 ? "" : c2 };
  }, f2.has = function(t5) {
    return Object.keys(this.t.routes).includes(t5);
  }, f2.l = function(t5, r2) {
    var n3 = this;
    void 0 === t5 && (t5 = {}), void 0 === r2 && (r2 = this.i), null != t5 || (t5 = {}), t5 = ["string", "number"].includes(typeof t5) ? [t5] : t5;
    var i2 = r2.parameterSegments.filter(function(t6) {
      return !n3.t.defaults[t6.name];
    });
    if (Array.isArray(t5))
      t5 = t5.reduce(function(t6, r3, n4) {
        var o4, u3;
        return e({}, t6, i2[n4] ? ((o4 = {})[i2[n4].name] = r3, o4) : "object" == typeof r3 ? r3 : ((u3 = {})[r3] = "", u3));
      }, {});
    else if (1 === i2.length && !t5[i2[0].name] && (t5.hasOwnProperty(Object.values(r2.bindings)[0]) || t5.hasOwnProperty("id"))) {
      var o3;
      (o3 = {})[i2[0].name] = t5, t5 = o3;
    }
    return e({}, this.g(r2), this.m(t5, r2));
  }, f2.g = function(t5) {
    var r2 = this;
    return t5.parameterSegments.filter(function(t6) {
      return r2.t.defaults[t6.name];
    }).reduce(function(t6, n3, i2) {
      var o3, u3 = n3.name;
      return e({}, t6, ((o3 = {})[u3] = r2.t.defaults[u3], o3));
    }, {});
  }, f2.m = function(t5, r2) {
    var n3 = r2.bindings, i2 = r2.parameterSegments;
    return Object.entries(t5).reduce(function(t6, r3) {
      var o3, u3, f3 = r3[0], a2 = r3[1];
      if (!a2 || "object" != typeof a2 || Array.isArray(a2) || !i2.some(function(t7) {
        return t7.name === f3;
      }))
        return e({}, t6, ((u3 = {})[f3] = a2, u3));
      if (!a2.hasOwnProperty(n3[f3])) {
        if (!a2.hasOwnProperty("id"))
          throw new Error("Ziggy error: object passed as '" + f3 + "' parameter is missing route model binding key '" + n3[f3] + "'.");
        n3[f3] = "id";
      }
      return e({}, t6, ((o3 = {})[f3] = a2[n3[f3]], o3));
    }, {});
  }, f2.valueOf = function() {
    return this.toString();
  }, f2.check = function(t5) {
    return this.has(t5);
  }, r(u2, [{ key: "params", get: function() {
    var t5 = this.v();
    return e({}, t5.params, t5.query);
  } }]), u2;
}(/* @__PURE__ */ u(String));
function A(t4, r2, e2, n2) {
  var i2 = new P(t4, r2, e2, n2);
  return t4 ? i2.toString() : i2;
}
global.route = (name, params, absolute, config) => A(name, params, absolute, Ziggy$1);
const appName = "Laravel";
createServer(
  (page2) => createInertiaApp({
    page: page2,
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => {
      const pages = /* @__PURE__ */ Object.assign({
        "./Pages/Auth/ConfirmPassword.svelte": __vite_glob_0_0,
        "./Pages/Auth/ForgotPassword.svelte": __vite_glob_0_1,
        "./Pages/Auth/Login.svelte": __vite_glob_0_2,
        "./Pages/Auth/Register.svelte": __vite_glob_0_3,
        "./Pages/Auth/ResetPassword.svelte": __vite_glob_0_4,
        "./Pages/Auth/VerifyEmail.svelte": __vite_glob_0_5,
        "./Pages/Dashboard.svelte": __vite_glob_0_6,
        "./Pages/Profile/Edit.svelte": __vite_glob_0_7,
        "./Pages/Profile/Partials/DeleteUserForm.svelte": __vite_glob_0_8,
        "./Pages/Profile/Partials/UpdatePasswordForm.svelte": __vite_glob_0_9,
        "./Pages/Profile/Partials/UpdateProfileInformationForm.svelte": __vite_glob_0_10,
        "./Pages/Welcome.svelte": __vite_glob_0_11
      });
      return pages[`./Pages/${name}.svelte`];
    }
  })
);
