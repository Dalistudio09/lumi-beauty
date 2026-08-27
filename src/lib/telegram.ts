export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};

type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: { user?: TelegramUser };
  ready: () => void;
  expand: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (fn: () => void) => void;
    offClick: (fn: () => void) => void;
  };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const PREVIEW_KEY = "lumi.previewId";

export function getTelegram() {
  if (typeof window === "undefined") return undefined;
  return window.Telegram?.WebApp;
}

export function getInitData() {
  return getTelegram()?.initData ?? "";
}

export function getTelegramUser() {
  return getTelegram()?.initDataUnsafe?.user;
}

export function getPreviewId() {
  if (typeof window === "undefined") return "preview-ssr";
  let id = window.localStorage.getItem(PREVIEW_KEY);
  if (!id) {
    id = `web-${crypto.randomUUID()}`;
    window.localStorage.setItem(PREVIEW_KEY, id);
  }
  return id;
}

export function identityPayload() {
  return {
    initData: getInitData(),
    previewId: getPreviewId(),
  };
}

export function initTelegramUi() {
  const tg = getTelegram();
  if (!tg) return;
  tg.ready();
  tg.expand();
  try {
    tg.setHeaderColor?.("#f4ede4");
    tg.setBackgroundColor?.("#f4ede4");
  } catch {
    // Older Telegram clients ignore theme helpers.
  }
}

export function useTelegramBack(enabled: boolean, onBack: () => void) {
  const tg = getTelegram();
  if (!tg) return;
  if (!enabled) {
    tg.BackButton.hide();
    return;
  }
  tg.BackButton.show();
  tg.BackButton.onClick(onBack);
}
