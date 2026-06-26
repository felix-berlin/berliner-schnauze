/** Creates a Vue component stub safe for use with vi.mock() — wraps in Proxy to satisfy Vitest's strict module access */
export function createComponentStub(template = "<div><slot /></div>") {
  const mod: Record<string | symbol, unknown> = {
    default: { template },
  };
  return new Proxy(mod, {
    has: () => true,
    get(t, k) {
      return k in t ? t[k] : undefined;
    },
  });
}

/** Stub for use in config.global.stubs (NOT for vi.mock) */
export function createSlotStub(name: string, template?: string) {
  return {
    name,
    template: template ?? `<div class="stub-${name}"><slot /></div>`,
  };
}
