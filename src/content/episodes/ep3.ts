// Episódio 3: Pescaria em Paz (Só Que Não), em Vera Cruz, na Ilha de Itaparica (BA).
// Fonte: docs/historia/episodio-3.md. Números de peso, preço e força são iniciais; T61 calibra.
// Lu e Geane sempre chamam o Adilson de "Xô" (HUMOR-09).

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
  Species,
  SpeciesId,
  TournamentDef,
} from '../types';

const sprite = (id: string) => `src/assets/fish/ep3/${id}.png`;

const species = [
  {
    id: 'xareu',
    name: 'Xaréu',
    sprite: sprite('xareu'),
    kg: { min: 3, max: 16 },
    pricePerKg: 20,
    power: 8,
    stamina: 8,
    baits: ['carne', 'lula'],
    rarity: 5,
    description: 'Forte que só. Briga como se fosse final de campeonato.',
    rare: false,
  },
  {
    id: 'guaricema',
    name: 'Guaricema',
    sprite: sprite('guaricema'),
    kg: { min: 0.2, max: 1.2 },
    pricePerKg: 18,
    power: 2,
    stamina: 3,
    baits: ['minhoca', 'camarao'],
    rarity: 10,
    description: 'Pequena, rápida e fofoqueira: conta tudo pros outros peixes.',
    rare: false,
  },
  {
    id: 'agulhinha',
    name: 'Agulhinha',
    sprite: sprite('agulhinha'),
    kg: { min: 0.2, max: 0.9 },
    pricePerKg: 15,
    power: 2,
    stamina: 2,
    baits: ['milho', 'camarao'],
    rarity: 9,
    description: 'Fininha, nervosa e sempre com pressa.',
    rare: false,
  },
  {
    id: 'cioba',
    name: 'Cioba',
    sprite: sprite('cioba'),
    kg: { min: 1, max: 9 },
    pricePerKg: 32,
    power: 6,
    stamina: 6,
    baits: ['camarao', 'lula'],
    rarity: 5,
    description: 'Vermelhinha e chique. Peixe de restaurante.',
    rare: false,
  },
  {
    id: 'budiao',
    name: 'Budião',
    sprite: sprite('budiao'),
    kg: { min: 0.5, max: 4 },
    pricePerKg: 20,
    power: 4,
    stamina: 5,
    baits: ['minhoca', 'camarao'],
    rarity: 6,
    description: 'Colorido demais. A Geane jura que é peixe de outro planeta.',
    rare: false,
  },
  {
    id: 'garoupa',
    name: 'Garoupa',
    sprite: sprite('garoupa'),
    kg: { min: 15, max: 50 },
    pricePerKg: 30,
    power: 10,
    stamina: 9,
    baits: ['lula'],
    rarity: 1,
    description: 'A rainha da pedra. Só aparece pra quem tem paciência.',
    rare: true,
  },
] satisfies Species[];

// Cena de 180 × 400 px lógicos, com a margem embaixo e a ponta da vara em (90, 370).
// Com a Maré Alta ou a Vara Baía (alcance 276 px) o jogador chega à baía, mas não à pedra, que
// começa a 280 px: só a Vara Pedra Fina (300 px) alcança a Garoupa.
const band = (top: number, bottom: number) => [
  { x: 0, y: top },
  { x: 180, y: top },
  { x: 180, y: bottom },
  { x: 0, y: bottom },
];

const veraCruz = {
  id: 'vera-cruz',
  name: 'Vera Cruz, Ilha de Itaparica',
  background: 'src/assets/scene/vera-cruz.png',
  zones: [
    { id: 'praia', polygon: band(250, 360), species: ['guaricema', 'agulhinha', 'budiao'] },
    { id: 'baia', polygon: band(90, 250), species: ['xareu', 'cioba', 'budiao', 'guaricema'] },
    { id: 'pedra', polygon: band(0, 90), species: ['garoupa', 'cioba', 'xareu'] },
  ],
} satisfies Location;

const rods = [
  { id: 'baia', name: 'Vara Baía', price: 2600, force: 9, reach: 9, episode: 3 },
  { id: 'pedra-fina', name: 'Vara Pedra Fina', price: 5000, force: 9, reach: 10, episode: 3 },
] satisfies Rod[];

// O roteiro não dá nome à isca nova do episódio; lula é isca clássica de garoupa e cioba.
const baits = [{ id: 'lula', name: 'Isca de Lula', price: 250, episode: 3 }] satisfies Bait[];

const say = (speaker: CharacterId, expression: Expression, text: string): DialogLine => ({ speaker, expression, text });

const scenes = [
  {
    id: 'ep3-abertura', // cenas 1 e 2 juntas: o capítulo tem uma abertura só
    lines: [
      say('adilson', 'normal', 'Dessa vez vai ser só eu, o mar e o silêncio.'),
      say('lavinia', 'rindo', 'Adilsinho, eu fui nadando. Cheguei faz duas horas.'),
      say('adilson', 'bravo', 'Nem na fila do ferry eu tenho paz!'),
      say('adilson', 'rindo', 'Agora sim. Paz.'),
    ],
  },
  {
    id: 'ep3-irmas', // cenas 3 e 4 juntas: as duas vêm depois dos 5 peixes
    lines: [
      say('lu', 'rindo', 'XÔ! Vim descansar. Só deixa eu responder umas mensagens do trabalho antes.'),
      say('geane', 'chocado', 'Xô, você viu aquela luz no céu ontem? Era E.T., eu tenho certeza!'),
      say('adilson', 'bravo', 'Era pra ser uma pescaria em paz…'),
      say('geane', 'bravo', 'Lu, apaga esse cigarro que tá espantando os peixes do Xô!'),
      say('lu', 'rindo', 'Os peixes que lutem, Geane.'),
      say('edvaldo', 'rindo', 'Abri uma filial na ilha, seu Adilson. Preço de ilha: o triplo. O ferry encarece tudo.'),
    ],
  },
  {
    id: 'ep3-espiao', // cena 5
    lines: [
      say('geane', 'chocado', 'Xô, essa guaricema tá me olhando estranho. Isso é espião de outro planeta!'),
      say('adilson', 'rindo', 'Geane, é só um peixe.'),
    ],
  },
  {
    id: 'ep3-xodo', // cena 6
    lines: [
      say('louise', 'rindo', 'Tio, o Lucca quer ver o senhor pescar!'),
      say('lucca', 'rindo', 'Pega um peixe grandão!'),
      say('adilson', 'rindo', 'Pra você eu pego o maior da ilha.'),
    ],
  },
  {
    id: 'ep3-xareu', // as falas depois do Xaréu e a cena 7
    lines: [
      say('lucca', 'chocado', 'Uau! Que peixe grandão!'),
      say('adilson', 'rindo', 'Esse aqui é do meu xodó.'),
      say('edvaldo', 'rindo', 'Pra pedra de Vera Cruz só a Vara Pedra Fina. Preço de família: o de ilha.'),
    ],
  },
  // A cena 8 se divide em duas: o roteiro não tem cena para depois de pegar a Garoupa.
  {
    id: 'ep3-disco-voador', // cena 8, primeira fala: a Geane vê o vulto na pedra
    lines: [say('geane', 'chocado', 'Xô, isso aí é disco voador de escama! Tira foto e manda pra NASA!')],
  },
  {
    id: 'ep3-garoupa', // cena 8, segunda fala: depois de pegar a Garoupa
    lines: [say('adilson', 'rindo', 'É uma garoupa, Geane.')],
  },
  {
    id: 'ep3-album', // cena 9
    lines: [say('lu', 'rindo', 'Xô, completou o álbum? Vou mandar no grupo da família. Depois da reunião.')],
  },
  {
    // Cena 11. Marcus e Julia aplaudem na torcida, sem falas: a narração conta. Depois vêm a carta e o
    // aviso do Episódio 4.
    id: 'ep3-vitoria',
    lines: [
      say('lucca', 'rindo', 'Ganhou! Ganhou!'),
      say('louise', 'rindo', 'Esse é o meu tio!'),
      say('lu', 'rindo', 'Xô campeão! Vou postar no grupo da família… depois da reunião.'),
      say('geane', 'chocado', 'Eu sabia! Os E.T. me contaram ontem.'),
      { speaker: null, text: 'Marcus e Julia aplaudem na torcida.' }, // narração do roteiro
    ],
  },
  {
    id: 'ep3-derrota', // "Se perder a Copa"
    lines: [say('geane', 'chocado', 'Xô, perdeu?! Vou chorar por nós dois.')],
  },
] satisfies Scene[];

const caught = (id: SpeciesId) => (e: GameEvent) => e.type === 'Caught' && e.species === id;
const caughtHere = (e: GameEvent) => e.type === 'Caught' && species.some((sp) => sp.id === e.species);
// A compra conta pela vara possuída: comprada antes da hora, cumpre no evento seguinte em vez de travar.
const owns = (id: RodId) => (_e: GameEvent, p: Profile) => p.rods.owned.includes(id);
const albumComplete = (_e: GameEvent, p: Profile) => species.every((sp) => p.album[sp.id] !== undefined);

// Sem "se inscrever na Copa": o campeonato libera sozinho depois do último objetivo (CAMP-01).
const objectives = [
  { id: 'pegar-5-em-paz', text: 'Pegar 5 peixes em paz', done: caughtHere, count: 5, sceneOnDone: 'ep3-irmas' },
  { id: 'comprar-baia', text: 'Comprar a Vara Baía', done: owns('baia'), sceneOnDone: 'ep3-espiao' },
  {
    id: 'pegar-guaricema',
    text: 'Pegar uma Guaricema para provar pra Geane que é só peixe',
    done: caught('guaricema'),
    sceneOnDone: 'ep3-xodo',
  },
  { id: 'pegar-xareu', text: 'Pegar um Xaréu para o Lucca ver', done: caught('xareu'), sceneOnDone: 'ep3-xareu' },
  {
    id: 'comprar-pedra-fina',
    text: 'Comprar a Vara Pedra Fina',
    done: owns('pedra-fina'),
    sceneOnDone: 'ep3-disco-voador',
  },
  { id: 'pegar-garoupa', text: 'Pegar a Garoupa', done: caught('garoupa'), sceneOnDone: 'ep3-garoupa' },
  {
    id: 'album-completo',
    text: 'Registrar no álbum todas as espécies de Vera Cruz',
    done: albumComplete,
    sceneOnDone: 'ep3-album',
  },
] satisfies Objective[];

// Cena 10: as provocações aparecem antes do primeiro arremesso (HUMOR-04). O Lucca torce na vitória.
// Placar dos rivais em kg (soma dos 3 mais pesados): valores provisórios, T61 calibra.
const copaItaparica = {
  id: 'copa-itaparica',
  name: 'Copa Itaparica',
  casts: 8,
  countBest: 3,
  rivals: [
    { character: 'lu', kg: 40.2, taunt: say('lu', 'rindo', 'Xô, entre uma reunião e outra eu ganho isso aqui.') },
    {
      character: 'geane',
      kg: 44.6,
      taunt: say('geane', 'bravo', 'Se eu perder vou chorar até o ano que vem. Sou canceriana, Xô.'),
    },
    {
      character: 'louise',
      kg: 49,
      taunt: say('louise', 'rindo', 'Tio, vou ganhar e o Lucca vai torcer pra mim. E se eu perder, eu recorro!'),
    },
  ],
  trophy: 'trofeu-copa-itaparica',
  message: 'carta-copa-itaparica',
} satisfies TournamentDef;

// docs/historia/cartas.md, "Episódio 3: Copa Itaparica (da Lu e da Geane)".
const letter = {
  id: 'carta-copa-itaparica',
  from: 'Lu e Geane',
  text: [
    'Xô,',
    'Campeão da Copa Itaparica! A gente sabe que você foi pra Vera Cruz pra pescar em paz. Desculpa. Não deu pra deixar.',
    'Aqui é a Lu, escrevendo entre uma reunião e outra (e um cigarrinho, mas não conta pra ninguém). Quando o Xô some, todo mundo já sabe: foi pescar. E quando volta, o peixe é sempre maior na história do que no balde.',
    'Aqui é a Geane. Eu chorei quando você ganhou, chorei quando a Lu acendeu o cigarro e chorei porque sim. Sou canceriana, Xô. E os E.T. mandaram avisar que, lá de cima, dá pra ver direitinho: o maior pescador da Bahia é você.',
    'A Louise mandou dizer que, juridicamente, o troféu é seu, sem direito a recurso. O Lucca quer saber quando vai pescar outro peixe grandão com você. E o Marcus e a Julia gritaram tanto na torcida que espantaram metade dos peixes da ilha.',
    'Xô, a gente cresceu brigando, rindo e dividindo tudo. Agora a gente divide a torcida: tá todo mundo aqui, esperando você voltar pra ilha com a gente. Dessa vez a gente promete: pescaria em paz. (Mentira.)',
    'Com amor das suas irmãs,\nLu e Geane\n(e Louise, Lucca, Marcus e Julia)',
    'P.S. da Geane: se aparecer uma luz estranha no céu hoje à noite, sou eu mandando energia. Ou um E.T. Os dois servem.',
  ].join('\n\n'),
} satisfies Message;

export const ep3 = {
  id: 3,
  locations: [veraCruz],
  species,
  rods,
  baits,
  chapter: {
    title: 'Pescaria em Paz (Só Que Não)',
    openingScene: 'ep3-abertura',
    objectives,
    closingScene: 'ep3-vitoria',
  },
  scenes,
  defeatScene: 'ep3-derrota',
  tournament: copaItaparica,
  letter,
} satisfies EpisodeContent;
