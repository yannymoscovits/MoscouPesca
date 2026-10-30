// Salvamento no celular em dois slots (design.md, "SaveService"; parte de I/O).
// A validação e a migração ficam em src/domain/saveSchema.ts.

import type { Profile } from '../content/types';
import { newProfile } from '../domain/profile';
import { parseProfile } from '../domain/saveSchema';

export const CURRENT_KEY = 'mf.save.current';
export const PREVIOUS_KEY = 'mf.save.previous';
/** Cópia do dado ilegível: mf.save.corrupt.<timestamp> (SAVE-08). */
export const CORRUPT_PREFIX = 'mf.save.corrupt.';

export type SaveOutcome = { ok: true } | { ok: false };
export type LoadSource = 'current' | 'previous' | 'new';

export interface SaveService {
  /** SAVE-04: grava o perfil e guarda o salvamento anterior. Cota cheia → { ok: false }. */
  save(p: Profile): SaveOutcome;
  /** SAVE-05, SAVE-07, SAVE-08: current → previous → jogo novo. */
  load(): { profile: Profile; source: LoadSource };
}

type KeyValue = Pick<Storage, 'getItem' | 'setItem'>;

export function createSaveService(storage: KeyValue, now: () => number = Date.now): SaveService {
  function read(key: string): string | null {
    try {
      return storage.getItem(key);
    } catch {
      return null; // armazenamento bloqueado: trata como vazio
    }
  }

  const parse = (text: string | null) => (text === null ? null : parseProfile(text));

  return {
    save(p) {
      try {
        const old = read(CURRENT_KEY);
        // Só um current legível vira o anterior: um current estragado não apaga o anterior bom (SAVE-07).
        if (parse(old)) storage.setItem(PREVIOUS_KEY, old!);
        storage.setItem(CURRENT_KEY, JSON.stringify(p));
        return { ok: true };
      } catch {
        return { ok: false };
      }
    },

    load() {
      const current = read(CURRENT_KEY);
      const fromCurrent = parse(current);
      if (fromCurrent) return { profile: fromCurrent, source: 'current' };

      const previous = read(PREVIOUS_KEY);
      const fromPrevious = parse(previous);
      if (fromPrevious) return { profile: fromPrevious, source: 'previous' };

      const unreadable = current ?? previous;
      if (unreadable !== null) {
        try {
          storage.setItem(`${CORRUPT_PREFIX}${now()}`, unreadable);
        } catch {
          // sem espaço para a cópia: o jogo novo começa mesmo assim
        }
      }
      return { profile: newProfile(), source: 'new' };
    },
  };
}

/** SAVE-10: pede armazenamento persistente; API ausente ou recusa → false. */
export async function requestPersistence(
  storageManager: { persist?: () => Promise<boolean> } | undefined = globalThis.navigator?.storage,
): Promise<boolean> {
  try {
    return (await storageManager?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
