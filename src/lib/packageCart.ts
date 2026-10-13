import { useSyncExternalStore } from "react";

/**
 * The visitor's package on the Packages page: the services they switched on
 * and the starter package they began from. It lives in this browser only (a
 * service page's "Add to my package" adds to it), and nothing is charged or
 * sent until the visitor sends it from the Packages page.
 */
export type PackageCart = { services: string[]; starter: string | null };

const KEY = "stm.package.v1";
const EVENT = "stm:package-change";
const EMPTY: PackageCart = { services: [], starter: null };
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

let cache: PackageCart | null = null;

function read(): PackageCart {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<PackageCart> | null;
    const services = Array.isArray(parsed?.services) ? parsed.services.filter((s): s is string => typeof s === "string" && SLUG.test(s)) : [];
    const starter = typeof parsed?.starter === "string" && SLUG.test(parsed.starter) ? parsed.starter : null;
    cache = { services: Array.from(new Set(services)).slice(0, 60), starter };
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: PackageCart) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable (private mode): the package still works for this visit */
  }
  window.dispatchEvent(new Event(EVENT));
}

export const packageCart = {
  get: read,
  toggle(slug: string) {
    const cart = read();
    write({ ...cart, services: cart.services.includes(slug) ? cart.services.filter((s) => s !== slug) : [...cart.services, slug] });
  },
  add(slugs: string[]) {
    const cart = read();
    const fresh = slugs.filter((s) => SLUG.test(s) && !cart.services.includes(s));
    if (fresh.length) write({ ...cart, services: [...cart.services, ...fresh] });
  },
  remove(slug: string) {
    const cart = read();
    write({ ...cart, services: cart.services.filter((s) => s !== slug) });
  },
  setStarter(slug: string | null) {
    write({ ...read(), starter: slug && SLUG.test(slug) ? slug : null });
  },
  clear() {
    write(EMPTY);
  },
};

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** The current package. Prerendered HTML always starts empty; the visitor's own picks fill in after load. */
export function usePackageCart(): PackageCart {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
