export type MenuItemId = 'events' | 'videos' | 'gravar' | 'templates';

export const DEFAULT_MENU_ORDER: MenuItemId[] = ['events', 'videos', 'gravar', 'templates'];

const MENU_ORDER_STORAGE_KEY = 'six3:menu-order:v1';
const MENU_ORDER_EVENT = 'six3:menu-order-changed';

function normalizeMenuOrder(order?: string[] | null): MenuItemId[] {
  const allowed = new Set<MenuItemId>(DEFAULT_MENU_ORDER);
  const seen = new Set<MenuItemId>();
  const unique = (order || []).filter((item): item is MenuItemId => {
    if (!allowed.has(item as MenuItemId) || seen.has(item as MenuItemId)) return false;
    seen.add(item as MenuItemId);
    return true;
  });
  return [...unique, ...DEFAULT_MENU_ORDER.filter((item) => !unique.includes(item))];
}

export function getStoredMenuOrder() {
  if (typeof window === 'undefined') return DEFAULT_MENU_ORDER;

  try {
    const stored = window.localStorage.getItem(MENU_ORDER_STORAGE_KEY);
    return normalizeMenuOrder(stored ? JSON.parse(stored) : null);
  } catch {
    return DEFAULT_MENU_ORDER;
  }
}

export function saveMenuOrder(order: MenuItemId[]) {
  const normalized = normalizeMenuOrder(order);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(MENU_ORDER_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(MENU_ORDER_EVENT, { detail: normalized }));
  }
  return normalized;
}

export function resetMenuOrder() {
  return saveMenuOrder(DEFAULT_MENU_ORDER);
}

export function sortMenuItems<T extends { id: MenuItemId }>(items: T[], order = getStoredMenuOrder()) {
  const position = new Map(order.map((id, index) => [id, index]));
  return [...items].sort((first, second) => (position.get(first.id) ?? 99) - (position.get(second.id) ?? 99));
}

export function subscribeMenuOrder(listener: (order: MenuItemId[]) => void) {
  if (typeof window === 'undefined') return () => undefined;

  const notify = () => listener(getStoredMenuOrder());
  const notifyFromStorage = (event: StorageEvent) => {
    if (event.key === MENU_ORDER_STORAGE_KEY) notify();
  };

  window.addEventListener(MENU_ORDER_EVENT, notify);
  window.addEventListener('storage', notifyFromStorage);

  return () => {
    window.removeEventListener(MENU_ORDER_EVENT, notify);
    window.removeEventListener('storage', notifyFromStorage);
  };
}
