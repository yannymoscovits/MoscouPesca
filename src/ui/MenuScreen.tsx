// Menu do jogo (T74), aberto pelo botão "Menu" da pesca: dá acesso ao Mapa, à Loja, ao Álbum,
// aos Troféus, às Mensagens, ao Campeonato e aos Ajustes. Todos os botões na metade de baixo (ACES-08).

import { useGame } from '../app/store';
import { useNav, useServices, type ScreenId } from './context';
import { currentPlace, formatMoney } from './format';

/** Botões do menu, na ordem da tela; `to` ausente = tela que ainda não existe (botão desabilitado). */
const ITEMS: { label: string; to?: ScreenId }[] = [
  { label: 'Mapa' },
  { label: 'Loja', to: 'shop' },
  { label: 'Álbum', to: 'album' },
  { label: 'Troféus' },
  { label: 'Mensagens', to: 'messages' },
  { label: 'Campeonato', to: 'tournament' },
  { label: 'Ajustes', to: 'settings' },
];

export function MenuScreen() {
  const { episodes } = useServices();
  const go = useNav();
  const profile = useGame((s) => s.profile);
  const { episode, location } = currentPlace(profile, episodes);

  return (
    <section class="screen menu" aria-label="Menu">
      <div class="screen__top">
        <h1 class="title">Menu</h1>
        <p class="menu__money">{formatMoney(profile.money)}</p>
        <p class="subtitle">
          Episódio {episode.id}: {episode.chapter.title}
        </p>
        <p class="menu__place">{location.name}</p>
      </div>
      <div class="screen__actions">
        <div class="menu__grid">
          {ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              class="btn btn--secondary"
              disabled={!item.to}
              onClick={() => item.to && go(item.to)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button type="button" class="btn btn--big" onClick={() => go('fishing')}>
          Voltar a pescar
        </button>
      </div>
    </section>
  );
}
