// Carta da família (LetterView: CAMP-06), a caixa de mensagens para reler (Messages: CAMP-10) e o
// aviso depois do encerramento do episódio (EpisodeBanner: HIST-08, HIST-10).
// A carta é dividida em páginas que cabem na tela, com o botão "Continuar": nada de rolar o texto
// com o dedo (ACES-09).

import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useGame } from '../app/store';
import type { EpisodeContent, Message } from '../content/types';
import { useNav, useServices } from './context';
import { Credits } from './Credits';

/** Pedaço mínimo de um parágrafo para começar no pé de uma página; menos que isso vai inteiro para a próxima. */
export const MIN_WORDS_AT_PAGE_END = 4;

/**
 * Junta os parágrafos em páginas, como numa carta de verdade: cada página leva quantos parágrafos
 * couberem (`fits`) e, quando o próximo não cabe inteiro, o começo dele completa a página e o resto
 * continua na seguinte. Assim a saudação ("Adilson,") nunca fica sozinha numa página. O corte deixa pelo
 * menos MIN_WORDS_AT_PAGE_END palavras de cada lado (nada de uma palavra solta no pé ou no alto da
 * página); parágrafo que não cabe nem numa página vazia é cortado entre palavras.
 */
export function paginate(paragraphs: string[], fits: (page: string[]) => boolean): string[][] {
  const pages: string[][] = [];
  let page: string[] = [];
  const close = () => {
    if (page.length) pages.push(page);
    page = [];
  };
  for (const paragraph of paragraphs) {
    let words = paragraph.split(' ');
    while (words.length) {
      // o maior começo do parágrafo que ainda cabe nesta página (0: nenhuma palavra)
      let lo = 0;
      let hi = words.length;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (fits([...page, words.slice(0, mid).join(' ')])) lo = mid;
        else hi = mid - 1;
      }
      if (lo === words.length) {
        page.push(words.join(' '));
        break;
      }
      if (page.length === 0) {
        page.push(words.slice(0, Math.max(lo, 1)).join(' ')); // nem a página vazia comporta tudo
        words = words.slice(Math.max(lo, 1));
      } else {
        // o que continua na próxima página também precisa de umas palavras, senão vai tudo para lá
        const cut = Math.min(lo, words.length - MIN_WORDS_AT_PAGE_END);
        if (cut >= MIN_WORDS_AT_PAGE_END) {
          page.push(words.slice(0, cut).join(' '));
          words = words.slice(cut);
        }
      }
      close();
    }
  }
  close();
  return pages;
}

/** Nome do campeonato que dá a carta: "Carta da GuanambiCup". */
function titleOf(message: Message, episodes: EpisodeContent[]): string {
  const ep = episodes.find((e) => e.letter.id === message.id);
  return ep ? `Carta da ${ep.tournament.name}` : 'Carta';
}

/**
 * CAMP-06: a carta com o remetente e o texto, página por página. O "Continuar" da última página
 * chama `onDone`. `inFishing`: aberta por cima da pesca, deixa a fileira Pausar/Menu à mão.
 */
export function LetterView({ message, onDone, inFishing = false }: { message: Message; onDone: () => void; inFishing?: boolean }) {
  const { episodes } = useServices();
  const body = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[][] | null>(null);
  const [at, setAt] = useState(0);
  // CAMP-11: o grande prêmio chega num envelope; o toque abre a aba e a carta sai de dentro dele.
  const [stage, setStage] = useState<'fechada' | 'abrindo' | 'aberta'>('fechada');
  useEffect(() => {
    if (stage !== 'abrindo') return;
    const t = setTimeout(() => setStage('aberta'), 700);
    return () => clearTimeout(t);
  }, [stage]);

  useLayoutEffect(() => {
    const paragraphs = message.text.split('\n\n');
    const measure = () => {
      const box = body.current;
      const test = probe.current;
      if (!box || !test) return;
      test.style.width = `${box.clientWidth}px`;
      const room = box.clientHeight;
      const fits = (page: string[]) => {
        test.replaceChildren(
          ...page.map((text) => {
            const p = document.createElement('p');
            p.textContent = text;
            return p;
          }),
        );
        return test.scrollHeight <= room;
      };
      const next = paginate(paragraphs, fits);
      test.replaceChildren();
      setPages(next);
      setAt((i) => Math.min(i, next.length - 1));
    };
    measure();
    window.addEventListener('resize', measure);
    void document.fonts?.ready.then(measure); // a fonte do título muda a altura que sobra
    return () => window.removeEventListener('resize', measure);
  }, [message, stage === 'aberta']);

  const total = pages?.length ?? 1;
  const last = at >= total - 1;

  if (stage !== 'aberta') {
    return (
      <div
        class={`overlay letter letter--sealed${inFishing ? ' overlay--fishing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={titleOf(message, episodes)}
      >
        <button
          type="button"
          class={`envelope${stage === 'abrindo' ? ' envelope--opening' : ''}`}
          aria-label="Abrir a carta"
          onClick={() => setStage('abrindo')}
        >
          <span class="envelope__body" aria-hidden="true" />
          <span class="envelope__paper" aria-hidden="true" />
          <span class="envelope__front" aria-hidden="true" />
          <span class="envelope__flap" aria-hidden="true" />
          <span class="envelope__seal" aria-hidden="true">
            ♥
          </span>
          <span class="envelope__sparkle envelope__sparkle--a" aria-hidden="true" />
          <span class="envelope__sparkle envelope__sparkle--b" aria-hidden="true" />
          <span class="envelope__sparkle envelope__sparkle--c" aria-hidden="true" />
        </button>
        <p class="envelope__hint">
          Chegou uma carta de {message.from}!
          <br />
          Toque no envelope para abrir.
        </p>
      </div>
    );
  }

  return (
    <div
      class={`overlay letter${inFishing ? ' overlay--fishing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={titleOf(message, episodes)}
    >
      <article class="letter__paper">
        <h2 class="title-2">{titleOf(message, episodes)}</h2>
        <p class="letter__from">De: {message.from}</p>
        <div class="letter__text" ref={body} data-testid="letter-text">
          {pages?.[at]?.map((text, i) => (
            <p key={i}>{text}</p>
          ))}
        </div>
        <div class="letter__text letter__probe" ref={probe} aria-hidden="true" />
        <p class="letter__page">
          Página {at + 1} de {total}
        </p>
      </article>
      <div class="overlay__actions">
        <button type="button" class="btn btn--big" onClick={() => (last ? onDone() : setAt(at + 1))}>
          Continuar
        </button>
      </div>
    </div>
  );
}

/** CAMP-10: toda carta desbloqueada fica aqui para reler, uma por campeonato vencido. */
export function Messages() {
  const { episodes } = useServices();
  const go = useNav();
  const unlocked = useGame((s) => s.profile.messagesUnlocked);
  const [open, setOpen] = useState<Message | null>(null);
  const letters = episodes.filter((ep) => unlocked.includes(ep.letter.id));

  return (
    <section class="screen messages" aria-label="Cartas">
      <div class="screen__top">
        <h1 class="title">Cartas</h1>
        <p class="subtitle">
          {letters.length ? 'Cartas da família, uma por campeonato vencido.' : 'Nenhuma carta ainda. Vença um campeonato para receber a primeira.'}
        </p>
      </div>
      <div class="screen__actions">
        <div class="messages__grid">
          {letters.map((ep) => (
            <button key={ep.letter.id} type="button" class="btn btn--secondary" onClick={() => setOpen(ep.letter)}>
              {ep.tournament.name}
            </button>
          ))}
        </div>
        <button type="button" class="btn" onClick={() => go('menu')}>
          Voltar
        </button>
      </div>
      {open && <LetterView message={open} onDone={() => setOpen(null)} />}
    </section>
  );
}

/**
 * HIST-08, HIST-10: "Episódio N liberado!" ou o aviso final, depois da cena de encerramento.
 * Espera a ficha, a classificação, a carta e a cena saírem da tela.
 */
export function EpisodeBanner() {
  const { controller, episodes } = useServices();
  const notice = useGame((s) => s.notice);
  const busy = useGame(
    (s) => s.fishing.phase.startsWith('Result_') || s.tournamentResult !== null || s.profile.story.pendingScene !== null,
  );
  const [rolled, setRolled] = useState(false); // HIST-17: os créditos já subiram
  if (notice === null || busy) return null;
  // HIST-14: com o episódio novo liberado, o "Continuar" já leva para o primeiro lugar dele.
  const unlockedId = Number(/^Episódio (\d+) liberado!$/.exec(notice)?.[1] ?? 0);
  const nextPlace = episodes.find((ep) => ep.id === unlockedId)?.locations[0];
  // HIST-17: no fim do jogo (a carta e a cena final já passaram), os créditos sobem antes do aviso final.
  if (!nextPlace && !unlockedId && !rolled) return <Credits onDone={() => setRolled(true)} />;
  function next() {
    if (nextPlace) controller.travel(nextPlace.id);
    controller.dismissNotice();
  }
  return (
    <div class="overlay overlay--fishing banner" role="dialog" aria-modal="true" aria-label="Aviso">
      <div class="banner__burst">
        <p class="banner__text">{notice}</p>
        {nextPlace && <p class="banner__hint">Próxima parada: {nextPlace.name}!</p>}
      </div>
      <div class="overlay__actions">
        <button type="button" class="btn btn--big" onClick={next}>
          {nextPlace ? 'Bora pra lá ▸' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}
