// AsyncStorage
import AsyncStorage from "@react-native-async-storage/async-storage";

// prefixo que identifica todas as chaves de cache da aplicação
const CACHE_PREFIX = "@cache:";

// clearAllCaches | apaga todos os dados de cache da aplicação
export async function clearAllCaches(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
  if (cacheKeys.length > 0) {
    await AsyncStorage.multiRemove(cacheKeys);
  }
}

// clearCachesByTag | apaga apenas caches de um tipo específico (ex: "user", "group")
// chaves seguem o padrão @cache:{tag}:{id}
export async function clearCachesByTag(tag: string): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const tagKeys = keys.filter((k) => k.startsWith(`${CACHE_PREFIX}${tag}:`));
  if (tagKeys.length > 0) {
    await AsyncStorage.multiRemove(tagKeys);
  }
}

// getCached | lê e desserializa um valor do cache pelo key
export async function getCached<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// setCached | serializa e grava um valor no cache pelo key
export async function setCached<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// removeCached | apaga uma chave específica do cache
export async function removeCached(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

// areCacheEqual | Compara cache com dados frescos
export function areCacheEqual<T>(cached: T | null, fresh: T): boolean {
  return JSON.stringify(cached) === JSON.stringify(fresh);
}

// syncCache | Grava cache somente quando os dados forem diferentes
export async function syncCache<T>(cacheKey: string, fresh: T): Promise<T> {
  const cached = await getCached<T>(cacheKey);

  if (!areCacheEqual(cached, fresh)) {
    await setCached(cacheKey, fresh);
  }

  return fresh;
}
