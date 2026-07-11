const STORAGE_KEY = "ffd-watchlist";

export const WATCHLIST_CHANGE_EVENT = "ffd-watchlist-change";

function readCodes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c): c is string => typeof c === "string" && /^\d{6}$/.test(c));
  } catch {
    return [];
  }
}

function writeCodes(codes: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  window.dispatchEvent(new CustomEvent(WATCHLIST_CHANGE_EVENT));
}

/** 브라우저에 저장된 즐겨찾기 종목 코드 (추가 순) */
export function getWatchlistCodes(): string[] {
  return readCodes();
}

export function isWatchlisted(code: string): boolean {
  return readCodes().includes(code);
}

export function addWatchlistCode(code: string): void {
  const normalized = code.trim();
  if (!/^\d{6}$/.test(normalized)) return;
  const codes = readCodes();
  if (codes.includes(normalized)) return;
  writeCodes([...codes, normalized]);
}

export function removeWatchlistCode(code: string): void {
  writeCodes(readCodes().filter((c) => c !== code));
}

export function toggleWatchlistCode(code: string): boolean {
  if (isWatchlisted(code)) {
    removeWatchlistCode(code);
    return false;
  }
  addWatchlistCode(code);
  return true;
}
