// Avisos por cima das telas: pausa (SAVE-02), celular deitado (ACES-10), falha ao salvar
// (edge case "armazenamento cheio") e novidade depois de uma atualização (INST-07).
// A pausa em si vem do GameController (SAVE-01).

import { useContext, useEffect, useState } from 'preact/hooks';
import { GameStoreContext, useGame, type GameStore } from '../app/store';
import { APP_VERSION, versionNotice } from '../pwa/update';
import { useServices } from './context';

/** SAVE-02: o jogo só volta depois de um toque, em qualquer ponto da tela. */
export function PauseOverlay() {
  const { controller } = useServices();
  const paused = useGame((s) => s.paused);
  if (!paused) return null;
  return (
    <div class="overlay overlay--pause" role="dialog" aria-modal="true" aria-label="Pausado" onClick={() => controller.resume()}>
      <p class="panel pause__text">Pausado - toque para continuar</p>
      <div class="overlay__actions">
        {/* o toque chega ao aviso inteiro; o botão é o alvo óbvio, na metade de baixo */}
        <button type="button" class="btn btn--big">
          Continuar
        </button>
      </div>
    </div>
  );
}

/** ACES-10: em paisagem fora do modo instalado, pausa e pede para virar o celular. */
export function RotateOverlay() {
  const { controller, browser, install } = useServices();
  const check = () => browser.isLandscape() && !install.isStandalone();
  const [landscape, setLandscape] = useState(check);

  useEffect(() => {
    const onChange = () => setLandscape(check());
    window.addEventListener('resize', onChange);
    window.addEventListener('orientationchange', onChange);
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('orientationchange', onChange);
    };
  }, []);

  useEffect(() => {
    if (landscape) controller.pause();
  }, [landscape, controller]);

  if (!landscape) return null;
  return (
    <div class="overlay overlay--rotate" role="alertdialog" aria-modal="true" aria-label="Celular deitado">
      <div class="rotate__phone" aria-hidden="true" />
      <p class="panel rotate__text">Vire o celular em pé para jogar</p>
    </div>
  );
}

/** "Não consegui salvar": o GameController liga uma vez por sessão; o jogo segue jogável. */
export function SaveWarning() {
  const { controller } = useServices();
  const warning = useGame((s) => s.saveWarning);
  if (!warning) return null;
  return (
    <div class="toast" role="alert">
      <p>
        <strong>Não consegui salvar.</strong> O celular está sem espaço, mas dá para continuar jogando.
      </p>
      <button type="button" class="btn" onClick={() => controller.dismissSaveWarning()}>
        OK
      </button>
    </div>
  );
}

/**
 * INST-07: na abertura, compara a versão vista no perfil com a deste build. Versão antiga mostra
 * "Novidade no MoscouFishing!" e já grava a nova, então reabrir não mostra de novo; perfil novo só
 * grava a versão.
 */
export function UpdateNotice() {
  const { controller } = useServices();
  const store = useContext(GameStoreContext) as GameStore;
  const [check] = useState(() => versionNotice(store.getState().profile.seenVersion, APP_VERSION));
  const [open, setOpen] = useState(check.show);

  useEffect(() => {
    if (check.store) controller.markVersionSeen(APP_VERSION);
  }, [check, controller]);

  if (!open) return null;
  return (
    <div class="overlay overlay--news" role="dialog" aria-modal="true" aria-label="Novidade">
      <div class="banner__burst">
        <p class="banner__text">Novidade no MoscouFishing!</p>
        <p class="banner__hint">O jogo foi atualizado. Seu progresso continua salvo.</p>
      </div>
      <div class="overlay__actions">
        <button type="button" class="btn btn--big" onClick={() => setOpen(false)}>
          OK
        </button>
      </div>
    </div>
  );
}
