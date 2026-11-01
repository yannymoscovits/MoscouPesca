// Tela inicial (INST-01 a INST-04) e a instrução do menu ⋮ do Chrome (InstallHelp, INST-03).

import { useState } from 'preact/hooks';
import { useGame } from '../app/store';
import { useNav, useServices } from './context';
import { hasProgress, savedProgress } from './format';
import { GearIcon, MonitorIcon, PlayIcon, TitleScene } from './TitleArt';
import logo from '../assets/ui/moscou-fishing-logo-v2.png';
import { isAppleMobile } from '../platform/install';

export function TitleScreen() {
  const { install, episodes, controller } = useServices();
  const go = useNav();
  const [help, setHelp] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const chosen = useGame((s) => s.profile.settings.difficulty !== null);
  const profile = useGame((s) => s.profile);
  const saved = hasProgress(profile) ? savedProgress(profile, episodes) : null;
  const play = () => go(chosen ? 'fishing' : 'difficulty');

  function startOver() {
    setConfirmNew(false);
    controller.newGame();
    play();
  }

  function installTap() {
    setHelp(true);
  }

  // Mockup da tela inicial: o peixinho em cima do logo grosso de contorno escuro, o slogan numa fita,
  // a dedicatória numa plaquinha de borda dourada e os três botões com ícone em pixel: dois azuis e o
  // "Jogar" grande e amarelo.
  return (
    <section class="screen title-screen" aria-labelledby="titulo">
      <TitleScene />
      <div class="screen__top">
        <h1 id="titulo" class="title-logo">
          <img src={logo} width={1536} height={1024} alt="MoscouFishing" />
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
            <span>Como instalar</span>
          </button>
        )}
        <div class="title-row">
          <button type="button" class="btn btn--secondary title-btn" onClick={() => go('settings')}>
            <GearIcon />
            <span>Ajustes</span>
          </button>
          {/* SAVE-12: só com jogo salvo, e pergunta antes de apagar */}
          {saved && (
            <button type="button" class="btn btn--secondary title-btn" onClick={() => setConfirmNew(true)}>
              <span>Novo jogo</span>
            </button>
          )}
        </div>
        {/* SAVE-11: com jogo salvo, "Continuar" de onde parou */}
        {saved && (
          <p id="onde-parou" class="title-saved">
            <span>{saved.chapter}</span>
            <span>{saved.objective}</span>
          </p>
        )}
        {/* ACES-01: na primeira abertura, pergunta a dificuldade antes de pescar */}
        <button type="button" class="btn btn--big title-btn" onClick={play} aria-describedby={saved ? 'onde-parou' : undefined}>
          <PlayIcon />
          <span>{saved ? 'Continuar' : 'Jogar'}</span>
        </button>
      </div>
      {help && <InstallHelp onClose={() => setHelp(false)} />}
      {confirmNew && saved && (
        <div class="overlay overlay--new-game" role="dialog" aria-modal="true" aria-labelledby="novo-jogo">
          <div class="panel new-game">
            <h2 id="novo-jogo" class="title-2">
              Começar um jogo novo?
            </h2>
            <p>O jogo salvo vai ser apagado: história, dinheiro, varas, álbum, medalhas e troféus.</p>
            <p class="new-game__saved">
              {saved.chapter}
              <br />
              {saved.objective}
            </p>
          </div>
          <div class="overlay__actions">
            {/* Apagar fica em cima e azul; o botão perto do dedão é o que não apaga nada */}
            <button type="button" class="btn btn--secondary" onClick={startOver}>
              Apagar e começar
            </button>
            <button type="button" class="btn" onClick={() => setConfirmNew(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** INST-03: o navegador não oferece instalação (ou o link abriu dentro do WhatsApp). */
export function InstallHelp({ onClose }: { onClose: () => void }) {
  const { install } = useServices();
  const [platform, setPlatform] = useState<'ios' | 'android'>(isAppleMobile() ? 'ios' : 'android');
  return (
    <div class="overlay overlay--install" role="dialog" aria-modal="true" aria-labelledby="ajuda-instalar">
      <div class="panel install-help">
        <h2 id="ajuda-instalar" class="title-2">
          Como instalar o jogo
        </h2>
        <div class="segmented install-help__platforms" role="group" aria-label="Escolha seu celular">
          <button type="button" class="btn btn--toggle" aria-pressed={platform === 'ios'} onClick={() => setPlatform('ios')}>iPhone / iPad</button>
          <button type="button" class="btn btn--toggle" aria-pressed={platform === 'android'} onClick={() => setPlatform('android')}>Android</button>
        </div>
        {platform === 'ios' ? <>
          <div class="mock-ios" aria-hidden="true">
            <span>Safari</span>
            <span class="mock-ios__share"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 9H4v12h16V9h-4M12 16V2m-5 5 5-5 5 5" /></svg> Compartilhar</span>
            <strong>＋ Adicionar à Tela de Início</strong>
          </div>
          <ol>
            <li>Abra o jogo no <strong>Safari</strong>.</li>
            <li>Toque em <strong>Compartilhar</strong>: o quadrado com uma seta para cima. Ele pode estar no menu da página.</li>
            <li>Role as opções e escolha <strong>Adicionar à Tela de Início</strong>.</li>
            <li>Toque em <strong>Adicionar</strong>. Depois, abra o jogo pelo ícone na tela do iPhone.</li>
          </ol>
          <p class="install-help__note">Se aparecer “Abrir como App”, mantenha ativado. Não encontrou a opção? Procure em “Editar Ações”.</p>
          <p class="install-help__note">Está no Chrome ou WhatsApp? Copie o endereço do jogo e abra no Safari para seguir esses passos.</p>
        </> : <>
        {install.canPrompt() && <button type="button" class="btn btn--big install-help__native" onClick={() => void install.prompt()}>Instalar agora no Android</button>}
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
        </>}
      </div>
      <div class="overlay__actions">
        <button type="button" class="btn" onClick={onClose}>
          Entendi
        </button>
      </div>
    </div>
  );
}
