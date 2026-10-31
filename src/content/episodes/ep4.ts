// Episódio 4: Pescaria nos Ventos, no Parque dos Ventos, nas eólicas do Alto Sertão da Bahia.
// Fonte: docs/historia/episodio-4.md e docs/historia/cartas.md. Números de peso, preço e força são
// iniciais; T61 calibra. Episódio lúdico: o vento é tão forte que os peixes aprenderam a voar.

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

const sprite = (id: string) => `src/assets/fish/ep4/${id}.png`;

// O alcance das varas já chega a 10 no Episódio 3: aqui a rara é limitada pela isca nova (só a
// Isca Cata-vento atrai o Dourado-dos-Ventos) e pela força da vara (a Vara Torre vem antes dele).
const species = [
  {
    id: 'peixe-voador',
    name: 'Peixe-voador',
    sprite: sprite('peixe-voador'),
    kg: { min: 0.5, max: 3 },
    pricePerKg: 24,
    power: 4,
    stamina: 5,
    baits: ['minhoca', 'milho'],
    rarity: 10,
    description: 'Abre as asas e sai planando. Tem que pegar no ar!',
    rare: false,
  },
  {
    id: 'lambari-rajada',
    name: 'Lambari-rajada',
    sprite: sprite('lambari-rajada'),
    kg: { min: 0.1, max: 0.5 },
    pricePerKg: 40,
    power: 2,
    stamina: 3,
    baits: ['minhoca', 'camarao'],
    rarity: 8,
    description: 'Pequeno e rápido como uma rajada. Adora se esconder nas torres.',
    rare: false,
  },
  {
    id: 'tilapia-helice',
    name: 'Tilápia-hélice',
    sprite: sprite('tilapia-helice'),
    kg: { min: 0.6, max: 3 },
    pricePerKg: 22,
    power: 4,
    stamina: 6,
    baits: ['milho', 'camarao'],
    rarity: 8,
    description: 'Gira o rabo igual turbina. Dá até tontura.',
    rare: false,
  },
  {
    id: 'traira-pipa',
    name: 'Traíra-pipa',
    sprite: sprite('traira-pipa'),
    kg: { min: 1, max: 7 },
    pricePerKg: 28,
    power: 7,
    stamina: 6,
    baits: ['carne', 'lula'],
    rarity: 5,
    description: 'Brava e voadora: o pior dos dois mundos.',
    rare: false,
  },
  {
    id: 'pacu-planador',
    name: 'Pacu-planador',
    sprite: sprite('pacu-planador'),
    kg: { min: 4, max: 14 },
    pricePerKg: 26,
    power: 7,
    stamina: 8,
    baits: ['cata-vento'],
    rarity: 5,
    description: 'Vive de pegar carona no vento. Preguiçoso, mas pesado.',
    rare: false,
  },
  {
    id: 'dourado-dos-ventos',
    name: 'Dourado-dos-Ventos',
    sprite: sprite('dourado-dos-ventos'),
    kg: { min: 20, max: 45 },
    pricePerKg: 32,
    power: 10,
    stamina: 10,
    baits: ['cata-vento'],
    rarity: 1,
    description: 'Quando bate a cauda, acende as luzes de uma cidade inteira. Nem o GPS acha.',
    rare: true,
  },
] satisfies Species[];

// Cena de 180 × 400 px lógicos, com a margem embaixo e a ponta da vara em (90, 370).
// Da margem para o pé das torres: a beira, o meio do açude e as torres, onde moram os lambaris
// (cena 5) e o Dourado-dos-Ventos.
const band = (top: number, bottom: number) => [
  { x: 0, y: top },
  { x: 180, y: top },
  { x: 180, y: bottom },
  { x: 0, y: bottom },
];

const parqueDosVentos = {
  id: 'parque-dos-ventos',
  name: 'Parque dos Ventos',
  background: 'src/assets/scene/parque-dos-ventos.png',
  zones: [
    { id: 'beira', polygon: band(250, 360), species: ['peixe-voador', 'tilapia-helice'], depthM: 1.5 },
    {
      id: 'acude',
      polygon: band(130, 250),
      species: ['peixe-voador', 'tilapia-helice', 'traira-pipa', 'pacu-planador'],
      depthM: 5,
    },
    {
      id: 'torres',
      polygon: band(0, 130),
      species: ['lambari-rajada', 'traira-pipa', 'pacu-planador', 'dourado-dos-ventos'],
      depthM: 10,
    },
  ],
} satisfies Location;

const rods = [
  { id: 'helice', name: 'Vara Hélice', price: 8000, force: 9, reach: 10, episode: 4 },
  { id: 'torre', name: 'Vara Torre', price: 14000, force: 10, reach: 10, episode: 4 },
] satisfies Rod[];

// O roteiro não dá nome à isca nova do episódio; a cata-vento gira no vento como as pás das torres.
const baits = [{ id: 'cata-vento', name: 'Isca Cata-vento', price: 400, episode: 4 }] satisfies Bait[];

const say = (speaker: CharacterId, expression: Expression, text: string): DialogLine => ({ speaker, expression, text });

const scenes = [
  {
    id: 'ep4-abertura', // cena 1
    lines: [
      say('adilson', 'normal', 'Serviço do Grupo IK hoje: revisar as torres. Mas antes… uma pescariazinha.'),
      say('marcio', 'chocado', 'Chefe, cuidado com o açude. Com esse vento, os peixes aprenderam a voar.'),
      say('adilson', 'chocado', 'Tanto tempo mexendo com eólica e nunca vi peixe voando.'),
      say('marcio', 'rindo', 'Relaxa, chefe. Funcionário 01 resolve tudo. Até peixe voador.'),
    ],
  },
  {
    id: 'ep4-filial', // cena 2
    lines: [
      say('edvaldo', 'rindo', 'Abri uma filial no parque, seu Adilson. Preço de eólica: depende do vento.'),
      say('adilson', 'bravo', 'E hoje tá ventando muito, né?'),
      say('edvaldo', 'rindo', 'Muito.'),
    ],
  },
  {
    id: 'ep4-gps', // cena 3
    lines: [
      say('higashi', 'normal', 'Adilson, vou botar um GPS em você. Pra saber se tá trabalhando ou pescando.'),
      say('adilson', 'chocado', 'Eu tô… revisando a torre. Daqui de baixo.'),
      say('higashi', 'rindo', 'GPS diz: "você chegou ao seu destino: o açude".'),
    ],
  },
  {
    id: 'ep4-piranha-pipa', // cenas 4 e 5 juntas: a cena 4 não tem objetivo depois dela
    lines: [
      say('lavinia', 'rindo', 'Adilsinho! Olha eu voando! Virei piranha-pipa.'),
      say('adilson', 'chocado', 'Até aqui em cima, menina?!'),
      say('lavinia', 'rindo', 'Pirraça também é energia renovável, Adilsinho.'),
      say('marcio', 'chocado', 'Chefe, entrou peixe na torre 7! Os lambaris tão travando a pá!'),
      say('adilson', 'rindo', 'Deixa comigo. Isso é serviço pra especialista.'),
    ],
  },
  {
    id: 'ep4-vara-torre', // cena 6
    lines: [say('edvaldo', 'rindo', 'Pra pegar peixe lá no alto, só a Vara Torre. Preço de família: o de eólica.')],
  },
  // A cena 7 se divide em duas: o roteiro não tem cena para depois de pegar o Dourado-dos-Ventos.
  {
    id: 'ep4-lenda', // cena 7, Márcio e Sr. Higashi: a lenda do parque
    lines: [
      say(
        'marcio',
        'normal',
        'Dizem que tem um dourado aqui que, quando bate a cauda, gera energia pra uma cidade inteira.',
      ),
      say('higashi', 'chocado', 'Botei GPS nele. O GPS só diz "recalculando rota".'),
    ],
  },
  {
    id: 'ep4-dourado', // cena 7, a fala do Adilson: depois de pegar o Dourado-dos-Ventos
    lines: [say('adilson', 'rindo', 'Esse eu quero ligar na rede.')],
  },
  {
    id: 'ep4-album', // cena 8
    lines: [
      say('marcio', 'rindo', 'Todos os peixes voadores no álbum! O senhor devia ganhar adicional de periculosidade, chefe.'),
    ],
  },
  {
    id: 'ep4-vitoria', // cena 10; depois dela vêm a carta do Márcio e o aviso do Episódio 5
    lines: [
      say('marcio', 'rindo', 'Esse é o meu chefe!'),
      say('higashi', 'rindo', 'O GPS confirmou: você chegou ao seu destino. Campeão.'),
    ],
  },
  {
    id: 'ep4-derrota', // "Se perder a Copa"
    lines: [say('higashi', 'normal', 'Recalculando rota… Bora de novo?')],
  },
] satisfies Scene[];

const caught = (id: SpeciesId) => (e: GameEvent) => e.type === 'Caught' && e.species === id;
const caughtHere = (e: GameEvent) => e.type === 'Caught' && species.some((sp) => sp.id === e.species);
// A compra conta pela vara possuída: comprada antes da hora, cumpre no evento seguinte em vez de travar.
const owns = (id: RodId) => (_e: GameEvent, p: Profile) => p.rods.owned.includes(id);
const albumComplete = (_e: GameEvent, p: Profile) => species.every((sp) => p.album[sp.id] !== undefined);

// Sem "se inscrever na Copa": o campeonato libera sozinho depois do último objetivo (CAMP-01).
const objectives = [
  // "Peixes voadores" são todos os do parque: com esse vento, todos aprenderam a voar (cenas 1 e 8).
  { id: 'pegar-5-voadores', text: 'Pegar 5 peixes voadores', done: caughtHere, count: 5, sceneOnDone: 'ep4-filial' },
  { id: 'comprar-helice', text: 'Comprar a Vara Hélice', done: owns('helice'), sceneOnDone: 'ep4-gps' },
  {
    id: 'pegar-pacu',
    text: 'Pegar um Pacu-planador',
    done: caught('pacu-planador'),
    sceneOnDone: 'ep4-piranha-pipa',
  },
  {
    id: 'tirar-3-lambaris',
    text: 'Tirar 3 Lambaris-rajada da torre',
    done: caught('lambari-rajada'),
    count: 3,
    sceneOnDone: 'ep4-vara-torre',
  },
  { id: 'comprar-torre', text: 'Comprar a Vara Torre', done: owns('torre'), sceneOnDone: 'ep4-lenda' },
  {
    id: 'pegar-dourado',
    text: 'Pegar o Dourado-dos-Ventos',
    done: caught('dourado-dos-ventos'),
    sceneOnDone: 'ep4-dourado',
  },
  {
    id: 'album-completo',
    text: 'Registrar no álbum todas as espécies do Parque dos Ventos',
    done: albumComplete,
    sceneOnDone: 'ep4-album',
  },
] satisfies Objective[];

// Cena 9: as provocações aparecem antes do primeiro arremesso (HUMOR-04).
// Placar dos rivais em kg (soma dos 3 mais pesados): valores provisórios, T61 calibra.
const copaDosVentos = {
  id: 'copa-dos-ventos',
  name: 'Copa dos Ventos',
  casts: 8,
  countBest: 3,
  rivals: [
    { character: 'marcio', kg: 52, taunt: say('marcio', 'rindo', 'Chefe, eu sou o funcionário 01. Primeiro lugar é comigo.') },
    {
      character: 'higashi',
      kg: 56.5,
      taunt: say('higashi', 'normal', 'Botei GPS na minha isca. O peixe não tem pra onde fugir.'),
    },
    {
      character: 'edvaldo',
      kg: 61.2,
      taunt: say('edvaldo', 'rindo', 'Se eu ganhar, a vara volta pro estoque pelo preço de eólica.'),
    },
  ],
  trophy: 'trofeu-copa-dos-ventos',
  message: 'carta-copa-dos-ventos',
} satisfies TournamentDef;

// docs/historia/cartas.md, "Episódio 4: Copa dos Ventos (do Márcio)".
const letter = {
  id: 'carta-copa-dos-ventos',
  from: 'Márcio',
  text: [
    'Chefe,',
    'Campeão da Copa dos Ventos! Eu sempre soube que o senhor ia longe, mas não sabia que ia pescar peixe voando.',
    'Aqui é o Márcio, o funcionário 01. Desde o primeiro dia eu aprendi como é trabalhar com o senhor: tem torre pra subir, tem problema pra resolver e, no fim do dia, sempre tem uma história de pescaria (sempre maior que o peixe).',
    'As torres tão girando e eu tô segurando as pontas por aqui. Pode ficar tranquilo: o funcionário 01 não deixa nada parar.',
    'Mas, chefe, o senhor faz falta. Faz falta a sua risada e o seu "deixa comigo". O vento aqui sopra mais forte quando o senhor tá por perto.',
    'Então se cuida, obedece os médicos e volta logo. A gente tem muito serviço pela frente. E muita pescaria também.',
    'Do seu funcionário 01 e amigo,\nMárcio',
    'P.S. do Sr. Higashi: botei um GPS nesta carta. Destino: o Adilson melhorando. Status: a caminho.',
  ].join('\n\n'),
} satisfies Message;

export const ep4 = {
  id: 4,
  locations: [parqueDosVentos],
  species,
  rods,
  baits,
  chapter: { title: 'Pescaria nos Ventos', openingScene: 'ep4-abertura', objectives, closingScene: 'ep4-vitoria' },
  scenes,
  defeatScene: 'ep4-derrota',
  tournament: copaDosVentos,
  letter,
} satisfies EpisodeContent;
