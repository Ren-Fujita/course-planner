/* Persistence has no DOM dependency; callers supply storage and the rule engine. */
(function (root) {
  'use strict';

  function createStore(data, { storage, getStorage = () => storage, key, engineFactory, now = () => new Date().toISOString() }) {
    let engine = engineFactory(data);
    let state = engine.initial();
    let initializationFailed = false;

    try {
      const raw = getStorage().getItem(key);
      if (raw) state = engine.validateState(JSON.parse(raw));
    } catch {
      initializationFailed = true;
    }
    engine = engineFactory(data, state);

    function refresh(next = state) {
      state = next;
      engine = engineFactory(data, state);
      return engine;
    }

    function save(next = state) {
      refresh(next);
      state.updatedAt = now();
      try {
        getStorage().setItem(key, JSON.stringify(state));
        return { ok: true, state, engine };
      } catch (error) {
        // Keep the current in-memory plan so it can still be exported.
        return { ok: false, state, engine, error };
      }
    }

    return {
      get state() { return state; },
      get engine() { return engine; },
      initializationFailed,
      refresh,
      save,
    };
  }

  root.PlannerPersistence = { createStore };
  if (typeof module !== 'undefined') module.exports = root.PlannerPersistence;
})(typeof globalThis !== 'undefined' ? globalThis : this);
