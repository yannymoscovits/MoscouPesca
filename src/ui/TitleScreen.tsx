// Tela inicial (INST-01 a INST-04) e a instrução do menu ⋮ do Chrome (InstallHelp, INST-03).

import { useState } from 'preact/hooks';
import { useGame } from '../app/store';
import { useNav, useServices } from './context';
import { GearIcon, LogoFish, MonitorIcon, PlayIcon, TitleScene } from './TitleArt';

export function TitleScreen() {
  const { install } = useServices();
  const go = useNav();
  const [help, setHelp] = useState(false);
  const chosen = useGame((s) => s.profile.settings.difficulty !== null);

  async function installTap() {
    if (install.canPrompt()) await install.prompt(); // INST-02: diálogo de instalação do Android
    else setHelp(true); // INST-03
  }

  // Mockup da tela inicial: o peixinho em cima do logo grosso de contorno escuro, o slogan numa fita,
  // a dedicatória numa plaquinha de borda dourada e os três botões com ícone em pixel: dois azuis e o
  // "Jogar" grande e amarelo.
  return (
    <section class="screen title-screen" aria-labelledby="titulo">
      <TitleScene />
      <div class="screen__top">
        <LogoFish />
        <h1 id="titulo" class="logo-title">
          <span class="logo-title__moscou">Moscou</span>Fishing
        </h1>
        <p class="ribbon">
          <span>Um peixinho de cada vez</span>
        </p>
        <p class="dedication">
          <span>Para Adilson Moscovits</span>
        </p>
      </div>
      <div class="screen__actions">
        {/* INST-04: instalado, o jogo já está na tela */}
        {!install.isStandalone() && (
          <button type="button" class="btn btn--secondary title-btn" onClick={installTap}>
            <MonitorIcon />
            <span>Colocar na tela</span>
          </button>
        )}
        <button type="button" class="btn btn--secondary title-btn" onClick={() => go('settings')}>
          <GearIcon />
          <span>Ajustes</span>
        </button>
        {/* ACES-01: na primeira abertura, pergunta a dificuldade antes de pescar */}
        <button type="button" class="btn btn--big title-btn" onClick={() => go(chosen ? 'fishing' : 'difficulty')}>
          <PlayIcon />
          <span>Jogar</span>
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
