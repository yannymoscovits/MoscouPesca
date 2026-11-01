// Episódio 2: A Maré do Tempo, em Jacuípe (BA), com dois locais: Rio Jacuípe e Ponte da Cetrel (EPI-08).
// Fonte: docs/historia/episodio-2.md e docs/historia/cartas.md. Números de peso, preço e força são
// iniciais; T61 calibra. Tininho, Denise e Didi já faleceram: aparecem só nas cenas do passado.

import type {
  Bait,
  CharacterId,
  DialogLine,
  EpisodeContent,
  Expression,
  GameEvent,
  Location,
  Message,
  Objective,
  Profile,
  Rod,
  RodId,
  Scene,
  SceneArtId,
  Species,
  SpeciesId,
  TournamentDef,
} from '../types';
import { withMedals } from '../goals';

const sprite = (id: string) => `src/assets/fish-portraits/${id}.png`;

// Tilápia e Traíra têm IDs próprios: o álbum e os objetivos do Jacuípe contam separado do Poço do Magro.
const rioSpecies = withMedals([
  {
    id: 'tilapia-jacuipe',
    name: 'Tilápia',
    sprite: sprite('tilapia-jacuipe'),
    kg: { min: 0.4, max: 2.2 },
    power: 2,
    stamina: 3,
    baits: ['minhoca', 'milho'],
    rarity: 10,
    description: 'Até aqui ela veio. Não perde uma foto.',
    rare: false,
  },
  {
    id: 'traira-jacuipe',
    name: 'Traíra',
    sprite: sprite('traira-jacuipe'),
    kg: { min: 0.6, max: 4 },
    power: 5,
    stamina: 4,
    baits: ['minhoca', 'carne'],
    rarity: 6,
    description: 'A mesma braveza de Guanambi, agora com vista pro mar.',
    rare: false,
    fightStyle: 'saltador',
  },
  {
    id: 'tainha',
    name: 'Tainha',
    sprite: sprite('tainha'),
    kg: { min: 0.5, max: 3 },
    power: 4,
    stamina: 6,
    baits: ['milho', 'camarao'],
    rarity: 8,
    description: "Anda em turma e pula fora d'água de alegria.",
    rare: false,
  },
  {
    id: 'robalo-peva',
    name: 'Robalo-peva',
    sprite: sprite('robalo-peva'),
    kg: { min: 0.8, max: 4 },
    power: 6,
    stamina: 5,
    baits: ['carne', 'camarao'],
    rarity: 5,
    description: 'O robalo pequeno que se acha grande. Mora na beirada do mangue.',
    rare: false,
  },
  {
    id: 'carapeba',
    name: 'Carapeba',
    sprite: sprite('carapeba'),
    kg: { min: 0.3, max: 1.5 },
    power: 3,
    stamina: 4,
    baits: ['minhoca', 'camarao'],
    rarity: 7,
    description: 'Prateada, educada e difícil de convencer.',
    rare: false,
  },
] satisfies Omit<Species, 'medals'>[], 2);

const ponteSpecies = withMedals([
  {
    id: 'robalo-flecha',
    name: 'Robalo-flecha',
    sprite: sprite('robalo-flecha'),
    kg: { min: 2, max: 14 },
    power: 8,
    stamina: 7,
    baits: ['carne', 'camarao'],
    rarity: 5,
    description: 'O dono da Ponte da Cetrel. Ataca rápido e foge pras pedras.',
    rare: false,
    fightStyle: 'saltador',
  },
  {
    id: 'pescada-amarela',
    name: 'Pescada-amarela',
    sprite: sprite('pescada-amarela'),
    kg: { min: 2, max: 12 },
    power: 6,
    stamina: 6,
    baits: ['camarao'],
    rarity: 6,
    description: 'Dourada por fora, desconfiada por dentro.',
    rare: false,
  },
  {
    id: 'vermelho',
    name: 'Vermelho',
    sprite: sprite('vermelho'),
    kg: { min: 1, max: 6 },
    power: 5,
    stamina: 5,
    baits: ['carne', 'camarao'],
    rarity: 5,
    description: 'Bonito e sabe disso.',
    rare: false,
  },
  {
    id: 'baiacu',
    name: 'Baiacu',
    sprite: sprite('baiacu'),
    kg: { min: 0.3, max: 2 },
    power: 3,
    stamina: 2,
    baits: ['minhoca', 'camarao'],
    rarity: 8,
    description: 'Incha de raiva quando é pego. Igual a Lavínia perdendo.',
    rare: false,
  },
  {
    id: 'camurupim',
    name: 'Camurupim',
    sprite: sprite('camurupim'),
    kg: { min: 25, max: 60 },
    power: 10,
    stamina: 10,
    baits: ['camarao'],
    requiresRod: 'mare-alta', // PONTO-09: o lendário só morde com a segunda vara do capítulo
    rarity: 1,
    description: 'O prata da Barra: salta alto e briga por muito tempo.',
    rare: true,
  },
] satisfies Omit<Species, 'medals'>[], 2);

const species = [...rioSpecies, ...ponteSpecies] satisfies Species[];

// Cena de 180 × 400 px lógicos, com a margem embaixo e a ponta da vara em (90, 370).
// Com a Vara de Carbono do Episódio 1 (alcance 252 px) o jogador chega a tudo, menos ao canal da
// Ponte, que começa a 255 px: só a Maré Alta (276 px) alcança o Camurupim.
const rect = (x0: number, y0: number, x1: number, y1: number) => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
];

const rioJacuipe = {
  id: 'rio-jacuipe',
  name: 'Rio Jacuípe',
  background: 'src/assets/scene/rio-jacuipe.png',
  zones: [
    // Alcance mínimo pela profundidade: o mangue é o raso, a beira o meio; a Ponte da Cetrel é o terceiro
    // ponto, de água salgada, e só abre com a Isca de Camarão (PONTO-08).
    {
      id: 'mangue',
      polygon: rect(0, 130, 45, 360),
      species: ['robalo-peva', 'traira-jacuipe', 'carapeba'],
      depthM: 1,
      name: 'Rio Jacuípe',
      minReach: 0,
    },
    {
      id: 'beira',
      polygon: rect(45, 250, 180, 360),
      species: ['tilapia-jacuipe', 'carapeba', 'tainha'],
      depthM: 1.5,
      name: 'Rio Sonrisal',
      minReach: 3,
    },
    {
      id: 'ponte',
      polygon: rect(45, 130, 180, 250),
      species: ['baiacu', 'vermelho', 'robalo-flecha', 'pescada-amarela', 'camurupim'],
      depthM: 6,
      name: 'Ponte da Cetrel',
      minReach: 5,
      requiresBait: 'camarao',
      requiresRod: 'grafite', // PONTO-10: a última área pede a vara e a isca do capítulo
    },
  ],
} satisfies Location;


const rods = [
  { id: 'grafite', name: 'Vara de Grafite', price: 500, force: 7, reach: 8, episode: 2 },
  { id: 'mare-alta', name: 'Vara Maré Alta', price: 900, force: 8, reach: 9, episode: 2 },
] satisfies Rod[];

const baits = [{ id: 'camarao', name: 'Isca de Camarão', price: 170, episode: 2 }] satisfies Bait[];

const say = (speaker: CharacterId | CharacterId[], expression: Expression, text: string): DialogLine => ({
  speaker,
  expression,
  text,
});
/** Narração do roteiro (as linhas em itálico): sem retrato. */
const narrate = (text: string): DialogLine => ({ speaker: null, text });
/** HIST-16: a fala com um quadro animado em cima. */
const withArt = (line: DialogLine, art: SceneArtId): DialogLine => ({ ...line, art });

const scenes = [
  {
    // Cenas 1 e 2 juntas: o capítulo tem uma abertura só. Entre elas, a narração leva ao passado
    // (no roteiro: "A tela ondula. 'Jacuípe, muitos anos atrás.'").
    id: 'ep2-abertura',
    lines: [
      say('jane', 'normal', 'Jacuípe… quanto tempo, hein?'),
      withArt(say('adilson', 'normal', 'Olha essa foto que tava na caixa de pesca… eu e a Ninha na Ponte da Cetrel.'), 'foto'),
      withArt(say('jane', 'rindo', 'E você já se achando pegador naquela época.'), 'foto'),
      withArt(say('capenga', 'normal', 'A maré de Jacuípe devolve tudo, seu Adilson. Até o tempo.'), 'beira'),
      withArt(narrate('Jacuípe, muitos anos atrás.'), 'mare-do-tempo'),
      say('tininho', 'rindo', 'Casa arrumada, rede armada, isca no isopor. Pode chegar, Adilson!'),
      say('didi', 'rindo', 'Junior! Chegou na hora. Antes de pescar, eu fiz uma feijoada maravilhosa.'),
      say('adilson', 'chocado', 'Pai?!'),
      say('denise', 'rindo', 'JUNIORRRR! Trouxe a cerveja? Digo… a isca?'),
      say('ninha', 'rindo', 'Pai, me ensina a pescar?'),
    ],
  },
  {
    id: 'ep2-edvaldo', // cena 3
    lines: [
      say('edvaldo-jovem', 'rindo', 'Preço de praia, Moscou. Já era o dobro naquela época.'),
      say('adilson', 'chocado', 'Edvaldo… com cabelo preto?!'),
      say('edvaldo-jovem', 'normal', 'Com essa vara aí você não ensina nem peixe a nadar. Leva a Vara de Grafite.'),
    ],
  },
  {
    id: 'ep2-rio', // cena 4
    lines: [say('capenga', 'normal', 'Robalo-peva fica no Rio Jacuípe, rente ao mangue. Joga rente, sem medo.')],
  },
  {
    id: 'ep2-ponte', // cena 5: a Lavínia viajou no tempo e aparece com o rosto, não como a piranha
    lines: [
      say('capenga', 'normal', 'Leva Isca de Carne que ele gosta. E paciência com a maré.'),
      say('lavinia', 'rindo', 'Adilsinho! Viajei no tempo só pra te pirraçar. Pirraça não tem prazo de validade.'),
      say('adilson', 'bravo', 'Até no passado, menina?!'),
      say('capenga', 'normal', 'Na ponte a água é salgada: lá só Camarão na isca. O Edvaldo acabou de receber.'),
    ],
  },
  {
    id: 'ep2-vara-mare', // cena 6, ainda no passado
    lines: [
      say('edvaldo-jovem', 'rindo', 'Pra água salgada só a Vara Maré Alta. Preço de família: o de praia.'),
      say('edvaldo-jovem', 'normal', 'E o Camurupim nem olha pra isca de quem não tem a Maré Alta.'),
    ],
  },
  // A cena 7 se divide em duas: o roteiro não tem cena para depois de pegar o Camurupim.
  {
    id: 'ep2-salto', // cena 7, primeira fala: apresenta o Camurupim
    lines: [say('capenga', 'chocado', 'Viu aquele salto? É o camurupim. O prata da Barra.')],
  },
  {
    id: 'ep2-prata-da-barra', // cena 7, segunda fala: depois de pegar o Camurupim
    lines: [say('didi', 'rindo', 'Esse pula mais que a torcida do Bahia em final!')],
  },
  {
    id: 'ep2-album', // cena 8
    lines: [say('ninha', 'rindo', 'Pai, a gente pegou todos!')],
  },
  {
    // Cena 10, com a fala do Didi sobre os médicos e o remédio (aprovada pela família) e a fala conjunta
    // do Didi e da Denise. Antes da Jane, a narração volta ao presente ("A tela ondula. Presente.").
    // Depois dela vêm a carta da Ninha e o aviso do Episódio 3.
    id: 'ep2-vitoria',
    lines: [
      say('didi', 'rindo', 'Esse é o meu filho!'),
      say('denise', 'rindo', 'JUNIORRRR, CAMPEÃO!'),
      say('didi', 'normal', 'Vai, Junior. Obedece os médicos e toma o remédio direitinho, que eu tô de olho.'),
      say(['didi', 'denise'], 'normal', 'Amamos você meu filho, segura firme!'),
      say('ninha', 'normal', 'Pai, a gente volta aqui de novo?'),
      say('adilson', 'rindo', 'Sempre que a maré deixar.'),
      withArt(narrate('Presente.'), 'dormindo'),
      withArt(say('jane', 'rindo', 'Cochilou aqui na beira do rio, foi? Tava sorrindo dormindo.'), 'acordando'),
    ],
  },
  {
    id: 'ep2-derrota', // "Se perder a Copa"
    lines: [say('denise', 'rindo', 'JUNIORRRR, perdeu pra mãe! Bora de novo?')],
  },
] satisfies Scene[];

const caught = (id: SpeciesId) => (e: GameEvent) => e.type === 'Caught' && e.species === id;
// HIST-15: peixe pego antes da vez do objetivo (juntando dinheiro para a vara, por exemplo) já vale:
// quando o objetivo chega, ele se cumpre sozinho e a cena dele aparece.
const had = (id: SpeciesId) => (p: Profile) => p.album[id] !== undefined;
/** Captura de qualquer espécie do grupo: separa os peixes do Rio dos da Ponte. */
const caughtAny = (group: Species[]) => (e: GameEvent) => e.type === 'Caught' && group.some((sp) => sp.id === e.species);
// A compra conta pela vara possuída: comprada antes da hora, cumpre no evento seguinte em vez de travar.
const owns = (id: RodId) => (_e: GameEvent, p: Profile) => p.rods.owned.includes(id);
const albumComplete = (_e: GameEvent, p: Profile) => species.every((sp) => p.album[sp.id] !== undefined);

// Sem "se inscrever na Copa": o campeonato libera sozinho depois do último objetivo (CAMP-01).
const objectives = [
  {
    id: 'ensinar-ninha',
    text: 'Ensinar a Ninha a pescar: pegar 3 peixes no Rio Jacuípe',
    done: caughtAny(rioSpecies),
    count: 3,
    unlocks: ['grafite'],
    sceneOnDone: 'ep2-edvaldo',
  },
  { id: 'comprar-grafite', text: 'Comprar a Vara de Grafite', done: owns('grafite'), sceneOnDone: 'ep2-rio' },
  { id: 'pegar-robalo-peva', text: 'Pegar um Robalo-peva', done: caught('robalo-peva'), satisfied: had('robalo-peva'), unlocks: ['camarao'], sceneOnDone: 'ep2-ponte' }, // a ponte pede Camarão
  {
    id: 'pegar-3-ponte',
    text: 'Pegar 3 peixes na Ponte da Cetrel', // com a Isca de Camarão (cena 5)
    done: caughtAny(ponteSpecies),
    count: 3,
    unlocks: ['mare-alta'],
    sceneOnDone: 'ep2-vara-mare',
  },
  { id: 'comprar-mare-alta', text: 'Comprar a Vara Maré Alta', done: owns('mare-alta'), sceneOnDone: 'ep2-salto' },
  { id: 'pegar-camurupim', text: 'Pegar o Camurupim — na Ponte da Cetrel', done: caught('camurupim'), sceneOnDone: 'ep2-prata-da-barra' },
  {
    id: 'album-completo',
    text: 'Registrar no álbum todas as espécies de Jacuípe',
    done: albumComplete,
    satisfied: p => albumComplete({ type: 'GameStarted' }, p),
    sceneOnDone: 'ep2-album',
  },
] satisfies Objective[];

// Cena 9: as provocações aparecem antes do primeiro arremesso (HUMOR-04).
// Placar dos rivais em kg (soma dos 3 mais pesados): valores provisórios, T61 calibra.
const copaJacuipe = {
  id: 'copa-jacuipe',
  name: 'Copa Jacuípe',
  casts: 5, // copa curta: 5 arremessos, valem os 3 mais pesados
  countBest: 3,
  rivals: [
    {
      character: 'tininho',
      kg: 6.1,
      taunt: say('tininho', 'rindo', 'Arrumei tudo pra vocês: casa, café e rede. Mas a Copa eu não arrumo pra ninguém.'),
    },
    {
      character: 'denise',
      kg: 7.5,
      taunt: say(
        'denise',
        'bravo',
        'JUNIORRRR! Isso aqui é uma intimação: perder pra sua mãe é obrigatório! YOLANDAAAAAAA.',
      ),
    },
    {
      character: 'didi',
      kg: 9.4,
      taunt: say(
        'didi',
        'rindo',
        'Quem perder toma injeção. Bahia aqui, Corinthians em São Paulo: médico tem que ser versátil.',
      ),
    },
  ],
  trophy: 'trofeu-copa-jacuipe',
  message: 'carta-copa-jacuipe',
} satisfies TournamentDef;

// docs/historia/cartas.md, "Episódio 2: Copa Jacuípe (da Ninha)".
const letter = {
  id: 'carta-copa-jacuipe',
  from: 'Ninha',
  text: [
    'Pai,',
    'Lembra de Jacuípe? Eu pequena, descalça, com cabelo de moleca, segurando uma vara maior que eu e jurando que ia tirar o maior robalo da Ponte da Cetrel. E você do lado, com toda a paciência do mundo, me ensinando a esperar a hora certa.',
    'Foi ali que eu aprendi a pescar. E foi ali que eu aprendi que, do seu lado, até voltar sem peixe nenhum era um dia bom.',
    'O Tininho deixava tudo pronto pra gente, a vó Denise gritava "JUNIORRRR" lá de longe e o vô Didi andava com a chinela na mão e camisa do Bahia. Quando eu penso em Jacuípe, penso em todo mundo, rindo.',
    'Agora, sobre esse troféu: campeão da Copa Jacuípe, hein? Já tô vendo você contando pra todo mundo que é o maior pegador do Nordeste. De peixe, pai. Só de peixe.',
    'A Lavínia disse que deixou você ganhar de novo. Eu disse que não acredito. Ela disse que eu tô de complô com você. Tô mesmo.',
    'Você me ensinou que o melhor da pescaria não é o peixe, é quem tá do lado. E do seu lado tem uma família inteira, esperando a próxima pescaria com você.',
    'Da sua parceira oficial de pescaria,\nNinha',
    'P.S.: a gente ainda volta pra Jacuípe. Sempre que a maré deixar.',
  ].join('\n\n'),
} satisfies Message;

export const ep2 = {
  id: 2,
  locations: [rioJacuipe],
  species,
  rods,
  baits,
  chapter: { title: 'A Maré do Tempo', openingScene: 'ep2-abertura', objectives, closingScene: 'ep2-vitoria' },
  scenes,
  defeatScene: 'ep2-derrota',
  tournament: copaJacuipe,
  letter,
} satisfies EpisodeContent;
