// Casca do app: entrega o estado e os serviços às telas e troca de tela (design.md, "UI (Preact)").

import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { GameStoreContext, type GameStore } from '../app/store';
import { episodeAt } from '../domain/world';
import { Album } from './Album';
import { BackContext, NavContext, ServicesContext, type ScreenId, type Services } from './context';
import { FishingScreen } from './FishingScreen';
import { Messages } from './Letter';
import { MapScreen } from './MapScreen';
import { MenuScreen } from './MenuScreen';
import { RotateOverlay, SaveWarning, UpdateNotice } from './Overlays';
import { Shop } from './Shop';
import { DifficultyPrompt, Settings } from './Settings';
import { TitleScene } from './TitleArt';
import { TitleScreen } from './TitleScreen';
import { TournamentLobby } from './Tournament';
import { TrophyRoom } from './TrophyRoom';

export function App({ store, services }: { store: GameStore; services: Services }) {
  const [screen, setScreen] = useState<ScreenId>('title');
  const from = useRef<ScreenId>('title'); // tela anterior, para o "Voltar"
  const go = useCallback((to: ScreenId) => {
    setScreen((current) => {
      from.current = current;
      return to;
    });
  }, []);
  const back = useCallback(() => go(from.current), [go]);

  // INST-07: a versão nova espera uma tela segura (abertura ou tela inicial).
  useEffect(() => services.update?.setScreen(screen), [screen, services]);

  // MUS-01, MUS-03: a música do menu fora da pesca; na pesca, a do episódio do local. A pausa congela.
  const [where, setWhere] = useState(() => store.getState().profile.currentLocation);
  const [paused, setPaused] = useState(() => store.getState().paused);
  useEffect(
    () =>
      store.subscribe(() => {
        const s = store.getState();
        setWhere(s.profile.currentLocation);
        setPaused(s.paused);
      }),
    [store],
  );
  useEffect(() => {
    const ep = episodeAt(where, services.episodes)?.id ?? 1;
    services.music?.play(screen === 'fishing' ? `ep${ep}` : 'menu');
  }, [screen, where, services]);
  useEffect(() => services.music?.setPaused(paused), [paused, services]);

  return (
    <GameStoreContext.Provider value={store}>
      <ServicesContext.Provider value={services}>
        <NavContext.Provider value={go}>
          <BackContext.Provider value={back}>
            {screen !== 'title' && screen !== 'fishing' && <div class="app-scenery" aria-hidden="true"><TitleScene /></div>}
            {screen === 'title' && <TitleScreen />}
            {screen === 'difficulty' && <DifficultyPrompt />}
            {screen === 'fishing' && <FishingScreen />}
            {screen === 'menu' && <MenuScreen />}
            {screen === 'shop' && <Shop />}
            {screen === 'album' && <Album />}
            {screen === 'tournament' && <TournamentLobby />}
            {screen === 'messages' && <Messages />}
            {screen === 'map' && <MapScreen />}
            {screen === 'trophies' && <TrophyRoom />}
            {screen === 'settings' && <Settings />}
            <UpdateNotice />
            <SaveWarning />
            <RotateOverlay />
          </BackContext.Provider>
        </NavContext.Provider>
      </ServicesContext.Provider>
    </GameStoreContext.Provider>
  );
}
