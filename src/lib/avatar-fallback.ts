const FALLBACK_AVATAR_URLS = [
  "https://i.pravatar.cc/150?img=11",
  "https://i.pravatar.cc/150?img=12",
  "https://i.pravatar.cc/150?img=13",
  "https://i.pravatar.cc/150?img=14",
  "https://i.pravatar.cc/150?img=15",
  "https://i.pravatar.cc/150?img=16",
  "https://i.pravatar.cc/150?img=17",
  "https://i.pravatar.cc/150?img=18",
  "https://i.pravatar.cc/150?img=19",
  "https://i.pravatar.cc/150?img=20",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getFallbackAvatarUrl(seed?: string | number): string {
  if (seed === undefined || seed === null || String(seed).trim() === "") {
    return FALLBACK_AVATAR_URLS[Math.floor(Math.random() * FALLBACK_AVATAR_URLS.length)];
  }
  const index = hashString(String(seed)) % FALLBACK_AVATAR_URLS.length;
  return FALLBACK_AVATAR_URLS[index];
}
