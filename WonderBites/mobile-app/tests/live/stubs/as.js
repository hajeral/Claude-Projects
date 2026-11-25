const m = new Map(); module.exports = { default: { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => { m.set(k, v); }, removeItem: async (k) => { m.delete(k); } } };
module.exports.__esModule = true;
