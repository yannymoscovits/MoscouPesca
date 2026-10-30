// Tela inicial (INST-01 a INST-04) e a instrução do menu ⋮ do Chrome (InstallHelp, INST-03).

import { useState } from 'preact/hooks';
import { useGame } from '../app/store';
import { useNav, useServices } from './context';

export function TitleScreen() {
  const { install } = useServices();
  const go = useNav();
  const [help, setHelp] = useState(false);
  const chosen = useGame((s) => s.profile.settings.difficulty !== null);

  async function installTap() {
    if (install.canPrompt()) await install.prompt(); // INST-02: diálogo de instalação do Android
    else setHelp(true); // INST-03
  }

  return (
    <section class="screen" aria-labelledby="titulo">
      <div class="screen__top">
        <div class="logo-fish" aria-hidden="true" />
        <h1 id="titulo" class="title">
          MoscouFishing
        </h1>
        <p class="subtitle">A Jornada de Adilson Moscovits</p>
      </div>
      <div class="screen__actions">
        {/* INST-04: instalado, o jogo já está na tela */}
        {!install.isStandalone() && (
          <button type="button" class="btn btn--secondary" onClick={installTap}>
            Colocar na tela
          </button>
        )}
        <button type="button" class="btn btn--secondary" onClick={() => go('settings')}>
          Ajustes
        </button>
        {/* ACES-01: na primeira abertura, pergunta a dificuldade antes de pescar */}
        <button type="button" class="btn btn--big" onClick={() => go(chosen ? 'fishing' : 'difficulty')}>
          Jogar
        </button>
      </div>
      {help && <InstallHelp onClose={() => setHelp(false)} />}
    </section>
  );
}

/** INST-03: o navegador não oferece instalação (ou o link abriu dentro do WhatsApp). */
export function InstallHelp({ onClose }: { onClose: () => void }) {
  return (
    <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="ajuda-instalar">
      <div class="panel install-help">
        <h2 id="ajuda-instalar" class="title-2">
          Colocar o jogo na tela
        </h2>
        <div class="mock-chrome" aria-hidden="true">
          <div class="mock-chrome__bar">
            <span class="mock-chrome__url">moscoufishing</span>
            <span class="mock-chrome__kebab">⋮</span>
          </div>
          <div class="mock-chrome__menu">
            <div class="mock-chrome__item--hit">Adicionar à tela inicial</div>
          </div>
        </div>
        <ol>
          <li>
            Toque no menu <strong>⋮</strong> do Chrome, lá no alto, à direita.
          </li>
          <li>
            Escolha <strong>Adicionar à tela inicial</strong>.
          </li>
          <li>Pronto: o jogo vira um ícone no celular.</li>
        </ol>
        <p class="install-help__note">Abriu pelo WhatsApp? Antes, toque em ⋮ e em "Abrir no Chrome".</p>
      </div>
      <div class="overlay__actions">
        <button type="button" class="btn" onClick={onClose}>
          Entendi
        </button>
      </div>
    </div>
  );
}
