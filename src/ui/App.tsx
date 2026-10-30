// Casca do app: entrega o estado e os serviços às telas e troca de tela (design.md, "UI (Preact)").

import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { GameStoreContext, type GameStore } from '../app/store';
import { Album } from './Album';
import { BackContext, NavContext, ServicesContext, type ScreenId, type Services } from './context';
import { FishingScreen } from './FishingScreen';
import { Messages } from './Letter';
import { MenuScreen } from './MenuScreen';
import { RotateOverlay, SaveWarning, UpdateNotice } from './Overlays';
import { Shop } from './Shop';
import { DifficultyPrompt, Settings } from './Settings';
import { TitleScreen } from './TitleScreen';
import { TournamentLobby } from './Tournament';

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

  return (
    <GameStoreContext.Provider value={store}>
      <ServicesContext.Provider value={services}>
        <NavContext.Provider value={go}>
          <BackContext.Provider value={back}>
            {screen === 'title' && <TitleScreen />}
            {screen === 'difficulty' && <DifficultyPrompt />}
            {screen === 'fishing' && <FishingScreen />}
            {screen === 'menu' && <MenuScreen />}
            {screen === 'shop' && <Shop />}
            {screen === 'album' && <Album />}
            {screen === 'tournament' && <TournamentLobby />}
            {screen === 'messages' && <Messages />}
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
