// Casca do app: entrega o estado e os serviços às telas e troca de tela (design.md, "UI (Preact)").

import { useEffect, useState } from 'preact/hooks';
import { GameStoreContext, type GameStore } from '../app/store';
import { NavContext, ServicesContext, useServices, type ScreenId, type Services } from './context';
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
          {screen === 'fishing' && <FishingPlaceholder />}
          {screen === 'settings' && <Settings />}
        </NavContext.Provider>
      </ServicesContext.Provider>
    </GameStoreContext.Provider>
  );
}

/** Lugar da tela de pesca até ela existir (T36): abre a pesca no local atual. */
function FishingPlaceholder() {
  const { controller } = useServices();
  useEffect(() => controller.openFishing(), [controller]);
  return <section class="screen" aria-label="Pescaria" />;
}
