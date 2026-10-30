import { describe, expect, it, vi } from 'vitest';
import type { Profile } from '../content/types';
import { newProfile } from '../domain/profile';
import { CORRUPT_PREFIX, CURRENT_KEY, PREVIOUS_KEY, createSaveService, requestPersistence } from './save';

/** localStorage de mentira; `quota` faz todo `setItem` lançar como o navegador com a cota cheia. */
class FakeStorage implements Storage {
  data = new Map<string, string>();
  quota = false;
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    if (this.quota) throw new DOMException('cota cheia', 'QuotaExceededError');
    this.data.set(key, value);
  }
}

const withMoney = (money: number): Profile => ({ ...newProfile(), money });

describe('save: dois slots', () => {
  it('SAVE-04: salvar duas vezes deixa o novo em current e o antigo em previous', () => {
    const storage = new FakeStorage();
    const svc = createSaveService(storage);

    expect(svc.save(withMoney(10))).toEqual({ ok: true });
    expect(svc.save(withMoney(20))).toEqual({ ok: true });

    expect(JSON.parse(storage.getItem(CURRENT_KEY)!)).toEqual(withMoney(20));
    expect(JSON.parse(storage.getItem(PREVIOUS_KEY)!)).toEqual(withMoney(10));
  });

  it('SAVE-04: falha de cota devolve { ok: false } sem lançar', () => {
    const storage = new FakeStorage();
    const svc = createSaveService(storage);
    storage.quota = true;

    let outcome: unknown;
    expect(() => (outcome = svc.save(withMoney(10)))).not.toThrow();
    expect(outcome).toEqual({ ok: false });
  });
});

describe('load: recuperação em cascata', () => {
  it('SAVE-05: reabrir o jogo devolve o último perfil salvo, do slot current', () => {
    const storage = new FakeStorage();
    createSaveService(storage).save(withMoney(10));
    createSaveService(storage).save(withMoney(20));

    expect(createSaveService(storage).load()).toEqual({ profile: withMoney(20), source: 'current' });
  });

  it('SAVE-07: current ilegível → restaura o salvamento anterior', () => {
    const storage = new FakeStorage();
    const svc = createSaveService(storage);
    svc.save(withMoney(10));
    svc.save(withMoney(20));
    storage.data.set(CURRENT_KEY, '{"version":1,"money":');

    expect(svc.load()).toEqual({ profile: withMoney(10), source: 'previous' });
  });

  it('SAVE-07: salvar depois de um current ilegível não apaga o anterior bom', () => {
    const storage = new FakeStorage();
    const svc = createSaveService(storage);
    svc.save(withMoney(10));
    svc.save(withMoney(20));
    storage.data.set(CURRENT_KEY, 'lixo');

    svc.save(withMoney(30));
    storage.data.set(CURRENT_KEY, 'lixo de novo');

    expect(svc.load()).toEqual({ profile: withMoney(10), source: 'previous' });
  });

  it('SAVE-08: os dois slots ilegíveis → jogo novo e cópia do texto original em mf.save.corrupt.<timestamp>', () => {
    const storage = new FakeStorage();
    storage.data.set(CURRENT_KEY, '{"version":1,"money":"muito"}');
    storage.data.set(PREVIOUS_KEY, 'não é json');
    const svc = createSaveService(storage, () => 1730000000000);

    expect(svc.load()).toEqual({ profile: newProfile(), source: 'new' });
    expect(storage.getItem(`${CORRUPT_PREFIX}1730000000000`)).toBe('{"version":1,"money":"muito"}');
    expect(CORRUPT_PREFIX).toBe('mf.save.corrupt.');
  });

  it('SAVE-08: sem nenhum salvamento → jogo novo, sem cópia de dado ilegível', () => {
    const storage = new FakeStorage();

    expect(createSaveService(storage, () => 1).load()).toEqual({ profile: newProfile(), source: 'new' });
    expect([...storage.data.keys()]).toEqual([]);
  });

  it('SAVE-08: armazenamento que lança ao ler → jogo novo sem exceção', () => {
    const storage = new FakeStorage();
    storage.getItem = () => {
      throw new DOMException('bloqueado', 'SecurityError');
    };

    expect(createSaveService(storage).load()).toEqual({ profile: newProfile(), source: 'new' });
  });
});

describe('requestPersistence', () => {
  it('SAVE-10: sem a API navigator.storage → false, sem erro', async () => {
    vi.stubGlobal('navigator', {});
    try {
      await expect(requestPersistence()).resolves.toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
    await expect(requestPersistence({})).resolves.toBe(false);
  });

  it('SAVE-10: sem argumento, usa navigator.storage.persist do navegador', async () => {
    const persist = vi.fn(async () => true);
    vi.stubGlobal('navigator', { storage: { persist } });
    try {
      await expect(requestPersistence()).resolves.toBe(true);
      expect(persist).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('SAVE-10: navegador recusando com erro → false, sem erro', async () => {
    await expect(requestPersistence({ persist: () => Promise.reject(new Error('negado')) })).resolves.toBe(false);
  });
});
