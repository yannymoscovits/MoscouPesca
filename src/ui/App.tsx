// Casca do app: entrega o estado e os serviços às telas e troca de tela (design.md, "UI (Preact)").

import { useState } from 'preact/hooks';
import { GameStoreContext, type GameStore } from '../app/store';
import { NavContext, ServicesContext, type ScreenId, type Services } from './context';
import { FishingScreen } from './FishingScreen';
import { RotateOverlay, SaveWarning } from './Overlays';
import { DifficultyPrompt, Settings } from './Settings';
import { TitleScreen } from './TitleScreen';

export function App({ store, services }: { store: GameStore; services: Services }) {
  const [screen, go] = useState<ScreenId>('title');

  return (
    <GameStoreContext.Provider value={store}>
      <ServicesContext.Provider value={services}>
        <NavContext.Provider value={go}>
          {screen === 'title' && <TitleScreen />}
          {screen === 'difficulty' && <DifficultyPrompt />}
          {screen === 'fishing' && <FishingScreen />}
          {screen === 'settings' && <Settings />}
          <SaveWarning />
          <RotateOverlay />
        </NavContext.Provider>
      </ServicesContext.Provider>
    </GameStoreContext.Provider>
  );
}

