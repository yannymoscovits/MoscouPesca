// Falas da história (DialogBox: HIST-02, HIST-03, HUMOR-02) e o cartão de apresentação na primeira
// aparição de cada personagem (CharacterIntroCard: HUMOR-01). Narração (sem personagem) aparece sem
// retrato e em itálico; fala conjunta mostra os retratos lado a lado.

import { useGame } from '../app/store';
import { characters, speakersOf } from '../content/characters';
import type { Character, CharacterId, DialogLine, Expression } from '../content/types';
import { resolveAsset } from '../render/sprites';
import { SceneArt } from './SceneArt';
import { episodes as allEpisodes } from '../content';
import { useNav, useServices } from './context';
import { isTournamentUnlocked } from '../domain/story';

/** Cores dos retratos provisórios; todas com contraste >= 6:1 com o texto branco. */
const PORTRAIT_COLORS = [
  '#1d4e89',
  '#8e2c48',
  '#2e6b30',
  '#6a1b9a',
  '#8a4b00',
  '#00695c',
  '#ad1457',
  '#37474f',
  '#b23c17',
  '#4a3aa8',
];

/** Carinha de cada expressão no retrato provisório, para a expressão aparecer antes da arte. */
const FACES: Record<Expression, string> = {
  normal: '•‿•',
  rindo: '^▽^',
  bravo: 'ò_ó',
  chocado: 'O_O',
};

export function characterById(id: CharacterId): Character {
  const found = characters.find((c) => c.id === id);
  return found ?? { id, name: id, epithet: '', portraits: { normal: '', rindo: '', bravo: '', chocado: '' } };
}

function colorOf(id: CharacterId): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PORTRAIT_COLORS[h % PORTRAIT_COLORS.length];
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2);
  return letters.toUpperCase();
}

/** Botões da pescaria que as falas citam: também em negrito. */
const BUTTONS = ['ARREMESSAR', 'RECOLHER', 'PUXAR', 'FISGAR', 'SEGURAR', 'Pescar aqui'];
/** Nomes que também são palavra comum e ficariam em negrito fora de hora. */
const NOT_TERMS = new Set(['Vermelho']);

/**
 * HIST-12: nomes do jogo que ficam em negrito nas falas (peixes, varas, iscas, pontos, locais e botões):
 * o que a pessoa precisa fazer salta aos olhos. O nome mais comprido vem primeiro ("Isca de Carne"
 * antes de "Carne"); só palavra inteira, sem diferenciar maiúsculas.
 */
const TERMS = (() => {
  const names = allEpisodes.flatMap((ep) => [
    ...ep.species.map((s) => s.name),
    ...ep.rods.map((r) => r.name),
    ...ep.baits.map((b) => b.name),
    ...ep.locations.flatMap((l) => [l.name, ...l.zones.map((z) => z.name)]),
  ]);
  const list = [...new Set([...names, ...BUTTONS])].filter((n) => !NOT_TERMS.has(n)).sort((a, b) => b.length - a.length);
  const escaped = list.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(?<![\\p{L}\\p{N}])(${escaped.join('|')})(?![\\p{L}\\p{N}])`, 'giu');
})();

/** Texto de uma fala com os nomes do jogo em negrito (HIST-12). */
export function Highlight({ text }: { text: string }) {
  const parts = text.split(TERMS);
  return <>{parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))}</>;
}

/** "Didi e Denise"; "A, B e C". */
export function joinNames(names: string[]): string {
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

/**
 * Retrato com a expressão da fala (HUMOR-02). Sem a arte, um quadrado na cor do personagem com as
 * iniciais e a carinha da expressão; `data-expression` diz qual expressão está na tela.
 */
export function Portrait({ character, expression, big = false }: { character: Character; expression: Expression; big?: boolean }) {
  const label = `${character.name} (${expression})`;
  const common = {
    role: 'img' as const,
    'aria-label': label,
    'data-character': character.id,
    'data-expression': expression,
  };
  const url = resolveAsset(character.portraits[expression]) ?? resolveAsset(character.portraits.normal);
  const size = big ? ' portrait--big' : '';
  if (url) return <div {...common} class={`portrait portrait--art${size}`} style={`background-image: url(${url})`} />;
  return (
    <div {...common} class={`portrait${size}`} style={`--portrait: ${colorOf(character.id)}`}>
      <span class="portrait__initials">{initials(character.name)}</span>
      <span class="portrait__face">{FACES[expression]}</span>
    </div>
  );
}

/** Triângulo amarelo que pisca na borda de baixo: "toque para continuar". */
function NextArrow() {
  return (
    <svg class="dialog-next" data-continue viewBox="0 0 11 7" shape-rendering="crispEdges" aria-hidden="true">
      <path fill="var(--outline)" d="M0 0h11v1H0zM0 1h1v1H0zM10 1h1v1h-1zM1 2h1v1H1zM9 2h1v1H9zM2 3h1v1H2zM8 3h1v1H8zM3 4h1v1H3zM7 4h1v1H7zM4 5h1v1H4zM6 5h1v1H6zM5 6h1v1H5z" />
      <path fill="#ffe27a" d="M1 1h9v1H1z" />
      <path fill="var(--accent)" d="M2 2h7v1H2zM3 3h5v1H3zM4 4h1v1H4zM6 4h1v1H6z" />
      <path fill="#d9921f" d="M5 4h1v2H5z" />
    </svg>
  );
}

/**
 * Uma fala, no quadro do mockup do usuário (docs/arte/mockups/tela-de-pesca-v2.png): caixa creme com
 * borda amarela em pixel, retrato de moldura amarela dentro da caixa, à esquerda, o nome e o texto ao
 * lado dele e o triângulo piscando. O toque em qualquer ponto da caixa (ou da tela em volta) chama `onNext`; nada
 * avança sozinho.
 */
export function DialogBox({ line, onNext, laviniaCameo = false }: { line: DialogLine; onNext: () => void; laviniaCameo?: boolean }) {
  const cast = speakersOf(line).map(characterById);
  const expression = line.expression ?? 'normal';
  const narration = cast.length === 0;
  return (
    <div class="dialog-layer" role="dialog" aria-label="Conversa" onClick={onNext}>
      {line.art && <SceneArt key={line.art} art={line.art} />}
      <div class={`dialog-box${narration ? ' dialog-box--narration' : ''}`}>
        {!narration && (
          <div class={`dialog-box__portraits${cast.length > 1 ? ' dialog-box__portraits--group' : ''}`}>
            {cast.map((c) => (
              laviniaCameo && c.id === 'lavinia'
                ? <img key={c.id} class="dialog-fish-cameo" src={resolveAsset('src/assets/fish-portraits/piranha-lavinia.png') ?? ''} alt="Piranha Lavínia" />
                : <Portrait key={c.id} character={c} expression={expression} />
            ))}
          </div>
        )}
        {!narration && <p class="dialog-box__name">{joinNames(cast.map((c) => laviniaCameo && c.id === 'lavinia' ? 'Piranha Lavínia' : c.name))}</p>}
        <p class="dialog-box__text">
          <Highlight text={line.text} />
        </p>
        <p class="dialog-box__hint" aria-hidden="true">
          Toque para continuar ▸
        </p>
        <NextArrow />
      </div>
    </div>
  );
}

/** HUMOR-01: retrato grande, nome e apelido cômico, no mesmo quadro das falas; fica até o toque. */
export function CharacterIntroCard({ character, onClose }: { character: Character; onClose: () => void }) {
  return (
    <div
      class="dialog-layer intro-card"
      role="dialog"
      aria-label={`Apresentação: ${character.name}`}
      onClick={onClose}
    >
      <div class="dialog-box intro-card__burst">
        <Portrait character={character} expression="normal" big />
        <p class="intro-card__name">{character.name.toUpperCase()}</p>
        <p class="intro-card__epithet">{character.epithet}</p>
        <p class="dialog-box__hint">Toque para continuar ▸</p>
        <NextArrow />
      </div>
    </div>
  );
}

/**
 * A cena pendente da história, fala por fala (HIST-01, HIST-05). Quem aparece pela primeira vez
 * ganha o cartão antes da fala. Com a ficha ou o aviso do arremesso na tela, a cena espera por ele;
 * com a classificação do torneio na tela, também (a cena da vitória vem depois dela).
 */
export function DialogLayer() {
  const { controller, episodes } = useServices();
  const go = useNav();
  const profile = useGame(s => s.profile);
  const sceneId = useGame((s) => s.profile.story.pendingScene);
  const index = useGame((s) => s.dialogLine);
  const introduced = useGame((s) => s.profile.charactersIntroduced);
  const showingResult = useGame((s) => s.fishing.phase.startsWith('Result_') || s.tournamentResult !== null);
  const tutorialClosing = useGame((s) => s.tutorial?.step === 'done' && s.tutorial.reading); // a Jane fecha o tutorial antes
  if (sceneId === null || showingResult || tutorialClosing) return null;

  const scene = episodes.flatMap((ep) => ep.scenes).find((sc) => sc.id === sceneId);
  const line = scene?.lines[index];
  if (!line) return null;

  const newcomer = speakersOf(line).find((id) => !introduced.includes(id));
  if (newcomer) return <CharacterIntroCard character={characterById(newcomer)} onClose={() => controller.introduce(newcomer)} />;
  const episode = episodes.find(ep => ep.scenes.some(sc => sc.id === sceneId));
  const finalObjective = episode?.chapter.objectives[episode.chapter.objectives.length - 1];
  const invite = episode && finalObjective?.sceneOnDone === sceneId && isTournamentUnlocked(profile.story, episode) && !profile.tournament;
  return <DialogBox line={line} laviniaCameo={scene?.laviniaCameo} onNext={() => {
    controller.advanceDialog();
    if (invite && index === scene!.lines.length - 1) go('tournament');
  }} />;
}
