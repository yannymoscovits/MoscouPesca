// Episódio 1: Tirando a Ferrugem, na Barragem do Poço do Magro (Guanambi, BA).
// Fonte: docs/historia/episodio-1.md. Números de peso, preço e força são iniciais; T61 calibra.

import type { TutorialStep } from '../../domain/tutorial';
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

const sprite = (id: string) => `src/assets/fish/ep1/${id}.png`;

const species = [
  {
    id: 'tilapia',
    name: 'Tilápia',
    sprite: sprite('tilapia'),
    kg: { min: 0.3, max: 1.8 },
    pricePerKg: 8,
    power: 2,
    stamina: 3,
    baits: ['minhoca', 'milho'],
    rarity: 10,
    description: 'A influencer da represa: aparece em toda foto de pescaria.',
    rare: false,
  },
  {
    id: 'traira',
    name: 'Traíra',
    sprite: sprite('traira'),
    kg: { min: 0.5, max: 3.5 },
    pricePerKg: 10,
    power: 5,
    stamina: 4,
    baits: ['minhoca', 'carne'],
    rarity: 6,
    description: 'Cara de brava, dente de brava, é brava mesmo. Cuidado com o dedo.',
    rare: false,
  },
  {
    id: 'curimata',
    name: 'Curimatã',
    sprite: sprite('curimata'),
    kg: { min: 0.5, max: 4 },
    pricePerKg: 9,
    power: 3,
    stamina: 5,
    baits: ['milho'],
    rarity: 6,
    description: 'Vive no fundo comendo lama e ainda assim se acha chique.',
    rare: false,
  },
  {
    id: 'piau',
    name: 'Piau',
    sprite: sprite('piau'),
    kg: { min: 0.2, max: 1.2 },
    pricePerKg: 10,
    power: 1,
    stamina: 2,
    baits: ['minhoca', 'milho'],
    rarity: 8,
    description: 'Rouba isca com uma educação que dá até raiva.',
    rare: false,
  },
  {
    id: 'tambaqui',
    name: 'Tambaqui',
    sprite: sprite('tambaqui'),
    kg: { min: 2, max: 12 },
    pricePerKg: 12,
    power: 6,
    stamina: 7,
    baits: ['milho'],
    rarity: 4,
    description: 'Gordinho, simpático e mais forte do que parece.',
    rare: false,
  },
  {
    id: 'tucunare',
    name: 'Tucunaré',
    sprite: sprite('tucunare'),
    kg: { min: 1, max: 6 },
    pricePerKg: 15,
    power: 7,
    stamina: 6,
    baits: ['minhoca', 'carne'],
    rarity: 3,
    description: 'O craque da represa: forte, bonito e convencido.',
    rare: false,
  },
  {
    id: 'pirarucu-lendario',
    name: 'Pirarucu Lendário',
    sprite: sprite('pirarucu-lendario'),
    kg: { min: 20, max: 45 },
    pricePerKg: 15,
    power: 10,
    stamina: 10,
    baits: ['carne'],
    rarity: 1,
    description: 'Primo do gigante de 90 quilos que saiu em Ceraíma. Ninguém acredita até ver.',
    rare: true,
  },
  {
    id: 'piranha-lavinia',
    name: 'Piranha Lavínia',
    sprite: sprite('piranha-lavinia'),
    kg: { min: 0.8, max: 0.8 }, // a ficha da cena 5: "0,80 kg"
    pricePerKg: 50,
    power: 4,
    stamina: 3,
    baits: ['carne'], // só morde a Isca de Carne (cena 4)
    rarity: 5,
    description: 'Rouba isca, fala demais e jura que deixou o Adilsinho ganhar.',
    rare: false,
  },
] satisfies Species[];

// Cena composta em 180 × 400 px lógicos, com a margem embaixo e a ponta da vara em (90, 370).
// Faixas da margem para o meio: a Vara de Bambu alcança o raso, a de Fibra o meio e a de Carbono o fundo.
const band = (top: number, bottom: number) => [
  { x: 0, y: top },
  { x: 180, y: top },
  { x: 180, y: bottom },
  { x: 0, y: bottom },
];

const pocoDoMagro = {
  id: 'poco-do-magro',
  name: 'Barragem do Poço do Magro',
  background: 'src/assets/scene/poco-do-magro.png',
  zones: [
    { id: 'raso', polygon: band(250, 360), species: ['tilapia', 'piau', 'traira', 'curimata', 'piranha-lavinia'] },
    { id: 'meio', polygon: band(150, 250), species: ['tilapia', 'traira', 'tambaqui', 'tucunare', 'piranha-lavinia'] },
    { id: 'fundo', polygon: band(0, 150), species: ['curimata', 'traira', 'tambaqui', 'tucunare', 'pirarucu-lendario'] },
  ],
} satisfies Location;

// Bambu e Minhoca já vêm no perfil novo (profile.ts: START_ROD, START_BAIT).
const rods = [
  { id: 'bambu', name: 'Vara de Bambu', price: 0, force: 1, reach: 2, episode: 1 },
  { id: 'fibra', name: 'Vara de Fibra', price: 150, force: 3, reach: 5, episode: 1 },
  { id: 'carbono', name: 'Vara de Carbono', price: 400, force: 6, reach: 8, episode: 1 },
] satisfies Rod[];

const baits = [
  { id: 'minhoca', name: 'Minhoca', price: 0, episode: 1 },
  { id: 'milho', name: 'Milho', price: 30, episode: 1 },
  { id: 'carne', name: 'Isca de Carne', price: 60, episode: 1 },
] satisfies Bait[];

const say = (speaker: CharacterId, expression: Expression, text: string): DialogLine => ({ speaker, expression, text });

const scenes = [
  {
    id: 'ep1-abertura', // cena 1
    lines: [
      say('jane', 'normal', 'Adilson, a família inteira se juntou e organizou um torneio. A GuanambiCup!'),
      say('adilson', 'rindo', 'Um torneio? Então já pode ir gravando o meu nome no troféu.'),
      say('jane', 'bravo', 'Calma. Antes você tira a ferrugem. Toma, achei a sua vara de bambu no fundo do armário.'),
      say('jane', 'rindo', 'Tá mais torta que os causos que você conta.'),
      say('adilson', 'rindo', 'Torta nada. Na mão de um pegador, qualquer vara vira profissional.'),
      say('jane', 'bravo', 'Pegador? Você pegou foi gripe no ano passado.'),
    ],
  },
  {
    id: 'ep1-piranha', // cena 3
    lines: [
      say('lavinia', 'rindo', 'Ih, Adilsinho, roubei sua minhoca. Desse jeito o troféu é meu!'),
      say('adilson', 'chocado', 'Lavínia?! Que que você tá fazendo dentro da represa?'),
      say('lavinia', 'rindo', 'Treinando. A GuanambiCup é minha!'),
    ],
  },
  {
    id: 'ep1-loja', // cena 4
    lines: [
      say('edvaldo', 'rindo', 'Essa vara de bambu é do tempo de Cabral, seu Adilson.'),
      say('edvaldo', 'normal', 'Pra você eu faço preço de família: o mesmo de todo mundo.'),
      say('edvaldo', 'normal', 'Ah, e se quiser pegar aquela piranha atrevida, tenho Isca de Carne aqui.'),
    ],
  },
  {
    // cena 5; a linha "Ficha: Lavínia, a Piranha · 0,80 kg" é a ficha do peixe, que a pesca já mostra
    id: 'ep1-piranha-fisgada',
    lines: [
      say('lavinia', 'chocado', 'Tá bom, tá bom, Adilsinho! Me solta que eu te conto onde ficam os peixes grandes!'),
      say('adilson', 'rindo', 'Agora sim, tô pronto.'),
    ],
  },
  {
    id: 'ep1-lenda', // cena 6
    lines: [
      say('edvaldo', 'normal', 'Carbono! Agora sim, seu Adilson. Com essa dá pra tentar o bicho.'),
      say('adilson', 'chocado', 'Que bicho?'),
      say(
        'edvaldo',
        'rindo',
        'O Pirarucu Lendário. Dizem que saiu um de 90 quilos pelo sangradouro de Ceraíma, e que o primo dele mora aqui no Poço do Magro.',
      ),
      say('lavinia', 'rindo', 'Esse aí nem eu encaro, Adilsinho. Boa sorte!'),
    ],
  },
  {
    id: 'ep1-pegou-lenda', // cena 7
    lines: [
      say('adilson', 'rindo', 'Agora quero ver alguém dizer que é causo!'),
      say('jane', 'chocado', 'Tira foto, tira foto! Senão ninguém acredita.'),
      say('adilson', 'rindo', 'Falei que eu era pegador.'),
      say('jane', 'rindo', 'Pegador de peixe, Adilson. Só de peixe.'),
      say('lavinia', 'bravo', 'Sorte de principiante, Adilsinho.'),
    ],
  },
  {
    id: 'ep1-album', // cena 8
    lines: [say('jane', 'rindo', 'Todos os peixes da represa no álbum. Agora pode se inscrever, campeão.')],
  },
  {
    id: 'ep1-vitoria', // cena 10; depois dela vêm a carta e o aviso do Episódio 2
    lines: [
      say('jane', 'rindo', 'Tá bom, você ganhou. Mas o peixe de 5 quilos daquele causo continua sendo mentira.'),
      say('jane', 'bravo', 'E pode tirar esse sorriso de pegador da cara.'),
    ],
  },
  {
    id: 'ep1-derrota', // "Se perder o torneio"
    lines: [say('ricardo', 'rindo', 'Faltou ritmo, Adilson! Bora de novo?')],
  },
] satisfies Scene[];

const caught = (id: SpeciesId) => (e: GameEvent) => e.type === 'Caught' && e.species === id;
// A compra conta pela vara possuída: comprada antes da hora, cumpre no evento seguinte em vez de travar.
const owns = (id: RodId) => (_e: GameEvent, p: Profile) => p.rods.owned.includes(id);
const albumComplete = (_e: GameEvent, p: Profile) => species.every((sp) => p.album[sp.id] !== undefined);

// SPEC_DEVIATION: o roteiro tem 7 objetivos; o 7º, "se inscrever na GuanambiCup", não entra na lista.
// Reason: o campeonato só libera depois do último objetivo (CAMP-01) e nenhum evento marca a inscrição;
// com ele na lista, o torneio nunca liberaria. A cena 8 já convida a se inscrever.
const objectives = [
  {
    id: 'pegar-3-peixes',
    text: 'Pegar 3 peixes', // o peixe do tutorial já conta (TUTO-08)
    done: (e) => e.type === 'Caught',
    count: 3,
    sceneOnDone: 'ep1-piranha',
  },
  { id: 'comprar-fibra', text: 'Comprar a Vara de Fibra', done: owns('fibra'), sceneOnDone: 'ep1-loja' },
  {
    id: 'pegar-piranha',
    text: 'Pegar a Piranha Lavínia',
    done: caught('piranha-lavinia'),
    sceneOnDone: 'ep1-piranha-fisgada',
  },
  { id: 'comprar-carbono', text: 'Comprar a Vara de Carbono', done: owns('carbono'), sceneOnDone: 'ep1-lenda' },
  {
    id: 'pegar-pirarucu',
    text: 'Pegar o Pirarucu Lendário',
    done: caught('pirarucu-lendario'),
    sceneOnDone: 'ep1-pegou-lenda',
  },
  {
    id: 'album-completo',
    text: 'Registrar no álbum todas as espécies do Poço do Magro',
    done: albumComplete,
    sceneOnDone: 'ep1-album',
  },
] satisfies Objective[];

/** Cena 2: a Jane conduz o tutorial, uma fala por passo (TUTO-02, TUTO-03). */
export const tutorial = {
  cast: { speaker: 'jane', text: 'Toca na água onde você quer jogar a isca. Só um dedinho, Adilson, não precisa de força.' },
  wait: { speaker: 'jane', text: 'Agora espera. Paciência, que nem quando você conta aquele causo do peixe de 5 quilos.' },
  hook: { speaker: 'jane', text: 'Mordeu! Toca na tela, rápido! Quer dizer… no seu tempo, ele não vai fugir.' },
  reel: { speaker: 'jane', text: 'Segura o dedo na tela pra recolher a linha.' },
  release: { speaker: 'jane', text: 'Ficou vermelho? Solta! Deixa o peixe cansar.' },
  done: {
    speaker: 'jane',
    text: 'Pegou! Viu, seu pegador? Peixe você até pega. Faltam dois. E nada de aumentar o peso na hora de contar.',
  },
} satisfies Record<TutorialStep, DialogLine>;

// Cena 9: as provocações aparecem antes do primeiro arremesso (HUMOR-04).
// Placar dos rivais em kg (soma dos 3 mais pesados): valores provisórios, T61 calibra.
const guanambiCup = {
  id: 'guanambicup',
  name: 'GuanambiCup',
  casts: 8,
  countBest: 3,
  rivals: [
    { character: 'ricardo', kg: 15.2, taunt: say('ricardo', 'rindo', 'Eu pesco no ritmo, Adilson. Tum-tum-ta! Os peixes vêm dançando.') },
    { character: 'bem', kg: 12.6, taunt: say('bem', 'rindo', 'Trouxe o isopor. Peixe dentro? Não, cerveja.') },
    {
      character: 'kris',
      kg: 18.4,
      taunt: say('kris', 'bravo', 'Adilson, nada de líquido hoje, hein! As regras do torneio tão todas nesse prendrive.'),
    },
  ],
  trophy: 'trofeu-guanambicup',
  message: 'carta-guanambicup',
} satisfies TournamentDef;

// docs/historia/cartas.md, "Episódio 1: GuanambiCup".
const letter = {
  id: 'carta-guanambicup',
  from: 'Sua família',
  text: [
    'Adilson,',
    'O primeiro troféu da GuanambiCup! A Jane já arrumou um lugar na estante, mas avisou: se chegarem mais, os enfeites dela não saem de lá. Então vai ter que ganhar outra estante também.',
    'O Edvaldo mandou dizer que, agora que você é campeão, o desconto na loja continua o mesmo: nenhum.',
    'O Ricardo compôs um samba pra comemorar. Só tem três batidas no bongô, mas ele jura que é sobre você.',
    'A Bem fez um brinde à sua vitória. Depois outro. Depois mais um. A gente perdeu a conta.',
    'E a Lavínia continua roubando isca e jurando pra todo mundo que deixou o Adilsinho ganhar.',
    'Agora falando sério (só um pouquinho): você sempre ensinou que pescaria é paciência. Jogar a linha, esperar a hora certa e não soltar quando o peixe puxa forte. A gente aprendeu direitinho. Então segura firme, que tem uma família inteira do outro lado da linha, segurando junto com você.',
    'Com amor (e o deboche de sempre),\nSua família',
    'P.S. da Kris: pode comemorar, mas nada de exagerar no líquido! Gravei todas as recomendações num prendrive pra você.',
  ].join('\n\n'),
} satisfies Message;

export const ep1 = {
  id: 1,
  locations: [pocoDoMagro],
  species,
  rods,
  baits,
  chapter: { title: 'Tirando a Ferrugem', openingScene: 'ep1-abertura', objectives, closingScene: 'ep1-vitoria' },
  scenes,
  defeatScene: 'ep1-derrota',
  tournament: guanambiCup,
  letter,
} satisfies EpisodeContent;
