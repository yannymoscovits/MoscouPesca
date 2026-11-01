// Barra de força e "Trocar de ponto" na tela de arremesso (pesca-bass ARREM-02, PONTO-05): vazia
// enquanto a seta balança e enchendo e esvaziando depois que ela trava. Some quando a isca sai da
// mão. Não sabe do jogo: recebe o estado da pesca e chama `leaveSpot`.

import type { PescaState } from '../domain/pesca';
import { powerAt } from '../domain/castAim';

export interface CastHudProps {
  pesca: PescaState;
  sweepS: number; // ciclo da barra de força (PescaRules.sweepS)
  leaveSpot: () => void; // volta ao pesqueiro (PONTO-05)
}

export function CastHud({ pesca, sweepS, leaveSpot }: CastHudProps) {
  if (pesca.phase !== 'Aim' && pesca.phase !== 'Power') return null;
  const power = pesca.phase === 'Power' ? powerAt(pesca.sinceS, sweepS) : 0;
  const percent = power * 100;

  return (
    <div class="cast-hud">
      {pesca.phase === 'Power' && <div class="cast-hud__power">
        <span class="cast-hud__label">Força</span>
        <div
          class="cast-hud__bar"
          role="meter"
          aria-label="Força do arremesso"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
        >
          <div class="cast-hud__fill" style={{ width: `${percent}%` }} />
        </div>
      </div>}
      <button type="button" class="btn btn--secondary cast-hud__leave" onClick={leaveSpot}>
        Trocar de ponto
      </button>
    </div>
  );
}
