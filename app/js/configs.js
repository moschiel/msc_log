
const DEFAULT_CONFIGS = {
    pkgAnalyze: {
        ignoreAck: true,
        ignoreKeepAlive: true        
    },
    terms: [
        { text: "", color: "#f6ff00", active: true },
        { text: "", color: "#f6ff00", active: true },
        { text: "", color: "#f6ff00", active: true },
        { text: "", color: "#f6ff00", active: true },
        { text: "", color: "#f6ff00", active: true }
    ]
};

export let configs = DEFAULT_CONFIGS;

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function deepMerge(defaults, saved) {
  // arrays: se saved for array, usa saved; se não, defaults
  if (Array.isArray(defaults)) return Array.isArray(saved) ? saved : defaults;

  // objetos: merge recursivo
  if (isPlainObject(defaults)) {
    const out = { ...defaults };
    if (isPlainObject(saved)) {
      for (const [k, v] of Object.entries(saved)) {
        out[k] = k in defaults ? deepMerge(defaults[k], v) : v; // preserva chaves novas
      }
    }
    return out;
  }

  // primitivos: se saved vier definido, usa; senão defaults
  return saved ?? defaults;
}

export function loadUserConfigs() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem("configs") || "null");
  } catch {
    saved = null; // JSON quebrado -> ignora
  }

  // merge defaults + saved
  configs = deepMerge(DEFAULT_CONFIGS, saved);
}

export function saveUserConfigs() {
  localStorage.setItem("configs", JSON.stringify(configs));
}