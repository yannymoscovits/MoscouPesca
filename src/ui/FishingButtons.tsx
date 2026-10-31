// Botões da pescaria, "como os do Game Boy" (pesca-bass BOTAO-01 a BOTAO-05, ISCA-08): ARREMESSAR no
// arremesso, RECOLHER (segurar) à esquerda e PUXAR (tocar) à direita com a isca na água, e SEGURAR na
// briga. Reagem no momento em que o dedo encosta; só um dedo vale (ACES-09). Botão sem efeito na fase
// fica apagado e não faz nada. Não sabem do jogo: recebem a fase e chamam os comandos.

import { useEffect, useRef } from 'preact/hooks';
import type { PescaButton, PescaState } from '../domain/pesca';

export interface FishingButtonsProps {
  phase: PescaState['phase'];
  onButton: (b: PescaButton) => void; // toque em ARREMESSAR ou PUXAR
  onHoldStart: () => void; // encostou em RECOLHER ou SEGURAR
  onHoldEnd: () => void; // soltou ou o toque foi cancelado
}

type ControlId = 'arremessar' | 'recolher' | 'puxar' | 'segurar';

interface Control {
  id: ControlId;
  label: string;
  enabled: boolean;
  hold: boolean; // segurar (RECOLHER, SEGURAR) ou tocar (ARREMESSAR, PUXAR)
  wide: boolean; // ocupa a largura dos dois (BOTAO-02, BOTAO-05)
  alert?: boolean; // pisca (ISCA-08)
}

const ARREMESSAR = { id: 'arremessar', label: 'ARREMESSAR', hold: false, wide: true } as const;
const RECOLHER = { id: 'recolher', label: 'RECOLHER', hold: true, wide: false } as const;
const PUXAR = { id: 'puxar', label: 'PUXAR', hold: false, wide: false } as const;

/** Os botões de cada fase; nas fichas e avisos do fim do arremesso, nenhum. */
export function controlsFor(phase: PescaState['phase']): Control[] {
  switch (phase) {
    case 'Aim':
    case 'Power':
      return [{ ...ARREMESSAR, enabled: true }];
    case 'Flying':
      return [{ ...ARREMESSAR, enabled: false }]; // ARREM-04
    case 'Lure':
      return [
        { ...RECOLHER, enabled: true },
        { ...PUXAR, enabled: true },
      ];
    case 'Strike': // a água para até a fisgada: só PUXAR faz efeito
      return [
        { ...RECOLHER, enabled: false },
        { ...PUXAR, label: 'FISGAR!', enabled: true, alert: true },
      ];
    case 'Fight':
      return [{ id: 'segurar', label: 'SEGURAR', hold: true, wide: true, enabled: true }];
    default:
      return [];
  }
}

export function FishingButtons(props: FishingButtonsProps) {
  const latest = useRef(props);
  latest.current = props;
  // O dedo que vale e se ele segura um botão; o soltar é ouvido na janela, porque o botão pode
  // sumir com o dedo em cima (PUXAR vira SEGURAR na fisgada).
  const active = useRef<{ pointer: number; hold: boolean } | null>(null);

  useEffect(() => {
    const up = (e: PointerEvent) => {
      const a = active.current;
      if (!a || e.pointerId !== a.pointer) return;
      active.current = null;
      if (a.hold) latest.current.onHoldEnd();
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (active.current?.hold) latest.current.onHoldEnd(); // saiu da tela segurando
      active.current = null;
    };
  }, []);

  const controls = controlsFor(props.phase);
  if (controls.length === 0) return null;

  const down = (c: Control) => (e: PointerEvent) => {
    e.preventDefault();
    if (!c.enabled || active.current) return; // BOTAO-03; segundo dedo
    active.current = { pointer: e.pointerId, hold: c.hold };
    if (c.hold) latest.current.onHoldStart();
    else latest.current.onButton(c.id as PescaButton);
  };

  return (
    <div class="pesca-buttons" role="group" aria-label="Botões da pescaria">
      {controls.map((c) => (
        <button
          key={c.id}
          type="button"
          class={`btn pesca-btn${c.wide ? ' pesca-btn--wide' : ''}${c.alert ? ' pesca-btn--alert' : ''}`}
          data-button={c.id}
          disabled={!c.enabled}
          onPointerDown={down(c)}
          onContextMenu={(e) => e.preventDefault()}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
