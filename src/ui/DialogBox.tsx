// Falas da história (DialogBox: HIST-02, HIST-03, HUMOR-02) e o cartão de apresentação na primeira
// aparição de cada personagem (CharacterIntroCard: HUMOR-01). Narração (sem personagem) aparece sem
// retrato e em itálico; fala conjunta mostra os retratos lado a lado.

import { useGame } from '../app/store';
import { characters, speakersOf } from '../content/characters';
import type { Character, CharacterId, DialogLine, Expression } from '../content/types';
import { resolveAsset } from '../render/sprites';
import { useServices } from './context';

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
  const url = resolveAsset(character.portraits[expression]);
  const size = big ? ' portrait--big' : '';
  if (url) return <div {...common} class={`portrait portrait--art${size}`} style={`background-image: url(${url})`} />;
  return (
    <div {...common} class={`portrait${size}`} style={`--portrait: ${colorOf(character.id)}`}>
      <span class="portrait__initials">{initials(character.name)}</span>
      <span class="portrait__face">{FACES[expression]}</span>
    </div>
  );
}

/** Uma fala. O toque em qualquer ponto da caixa (ou da tela em volta) chama `onNext`; nada avança sozinho. */
export function DialogBox({ line, onNext }: { line: DialogLine; onNext: () => void }) {
  const cast = speakersOf(line).map(characterById);
  const expression = line.expression ?? 'normal';
  const narration = cast.length === 0;
  return (
    <div class="dialog-layer" role="dialog" aria-label="Conversa" onClick={onNext}>
      <div class={`panel dialog-box${narration ? ' dialog-box--narration' : ''}`}>
        {!narration && (
          <div class="dialog-box__portraits">
            {cast.map((c) => (
              <Portrait key={c.id} character={c} expression={expression} />
            ))}
          </div>
        )}
        {!narration && <p class="dialog-box__name">{joinNames(cast.map((c) => c.name))}</p>}
        <p class="dialog-box__text">{line.text}</p>
        <p class="dialog-box__hint" aria-hidden="true">
          Toque para continuar ▸
        </p>
      </div>
    </div>
  );
}

/** HUMOR-01: retrato grande, nome e apelido cômico; fica até o toque. */
export function CharacterIntroCard({ character, onClose }: { character: Character; onClose: () => void }) {
  return (
    <div
      class="dialog-layer intro-card"
      role="dialog"
      aria-label={`Apresentação: ${character.name}`}
      onClick={onClose}
    >
      <div class="intro-card__burst">
        <Portrait character={character} expression="normal" big />
        <p class="intro-card__name">{character.name.toUpperCase()}</p>
        <p class="intro-card__epithet">{character.epithet}</p>
      </div>
      <p class="intro-card__hint">Toque para continuar</p>
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
  const sceneId = useGame((s) => s.profile.story.pendingScene);
  const index = useGame((s) => s.dialogLine);
  const introduced = useGame((s) => s.profile.charactersIntroduced);
  const showingResult = useGame((s) => s.fishing.phase.startsWith('Result_') || s.tournamentResult !== null);
  if (sceneId === null || showingResult) return null;

  const line = episodes.flatMap((ep) => ep.scenes).find((sc) => sc.id === sceneId)?.lines[index];
  if (!line) return null;

  const newcomer = speakersOf(line).find((id) => !introduced.includes(id));
  if (newcomer) return <CharacterIntroCard character={characterById(newcomer)} onClose={() => controller.introduce(newcomer)} />;
  return <DialogBox line={line} onNext={() => controller.advanceDialog()} />;
}
