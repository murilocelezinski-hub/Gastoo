/**
 * secureStorage — wrapper sobre expo-secure-store com suporte a payloads grandes.
 *
 * expo-secure-store tem limite de ~2 KB por entrada. Para contornar isso, payloads
 * maiores são divididos em chunks de 1800 bytes e cada chunk é salvo com sufixo
 * "_chunk_N". Um índice na chave raiz indica quantos chunks existem.
 *
 * Migração automática: se a chave não existir no SecureStore, tenta ler do
 * AsyncStorage legado, migra o dado para o SecureStore e remove a entrada antiga.
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHUNK_SIZE = 1800; // bytes — margem abaixo do limite de 2 KB do SecureStore

function chunkString(str) {
  const chunks = [];
  for (let i = 0; i < str.length; i += CHUNK_SIZE) {
    chunks.push(str.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
}

function chunkKey(key, index) {
  // SecureStore exige chaves sem caracteres especiais; troca @ e / por _
  const safe = key.replace(/[@/]/g, '_');
  return `${safe}_chunk_${index}`;
}

function indexKey(key) {
  return key.replace(/[@/]/g, '_') + '_chunks';
}

export async function secureSet(key, value) {
  const chunks = chunkString(value);

  // Salva cada chunk
  await Promise.all(
    chunks.map((chunk, i) => SecureStore.setItemAsync(chunkKey(key, i), chunk))
  );

  // Salva o número de chunks como índice
  await SecureStore.setItemAsync(indexKey(key), String(chunks.length));
}

export async function secureGet(key) {
  let countStr = await SecureStore.getItemAsync(indexKey(key));

  // Migração: dado ainda está no AsyncStorage legado
  if (countStr === null) {
    const legacy = await AsyncStorage.getItem(key);
    if (legacy === null) return null;

    // Migra para SecureStore e apaga entrada legada
    await secureSet(key, legacy);
    await AsyncStorage.removeItem(key);
    return legacy;
  }

  const count = parseInt(countStr, 10);
  if (isNaN(count) || count === 0) return null;

  const parts = await Promise.all(
    Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(chunkKey(key, i)))
  );

  // Se algum chunk estiver faltando, dado está corrompido
  if (parts.some((p) => p === null)) return null;

  return parts.join('');
}

export async function secureRemove(key) {
  const countStr = await SecureStore.getItemAsync(indexKey(key));

  if (countStr !== null) {
    const count = parseInt(countStr, 10);
    if (!isNaN(count)) {
      await Promise.all(
        Array.from({ length: count }, (_, i) =>
          SecureStore.deleteItemAsync(chunkKey(key, i))
        )
      );
    }
    await SecureStore.deleteItemAsync(indexKey(key));
  }

  // Remove também do AsyncStorage legado, caso a migração não tenha ocorrido
  await AsyncStorage.removeItem(key);
}
