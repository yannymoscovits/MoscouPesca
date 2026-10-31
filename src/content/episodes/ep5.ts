// Episódio 5: A Grande Final, no Alto-mar da Bahia, com a família inteira no barco e o Márcio de
// capitão. Fonte: docs/historia/episodio-5.md e docs/historia/cartas.md. Números de peso, preço e
// força são iniciais; T61 calibra. Didi, Denise e Tininho não falam aqui: aparecem só como
// lembrança, nas falas de quem está no barco.

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
import { withMedals } from '../goals';

const sprite = (id: string) => `src/assets/fish/ep5/${id}.png`;

// O alcance das varas já chega a 10 no Episódio 3: aqui o chefão é limitado pela isca nova (só a
// Isca de Corrico atrai o Marlim-azul) e pela força da vara (a Vara Lendária vem antes dele).
const species = withMedals([
  {
    id: 'dourado-do-mar',
    name: 'Dourado-do-mar',
    sprite: sprite('dourado-do-mar'),
    kg: { min: 3, max: 15 },
    pricePerKg: 30,
    power: 7,
    stamina: 7,
    baits: ['lula', 'cata-vento'],
    rarity: 7,
    description: 'Verde e dourado, brilha mais que troféu.',
    rare: false,
  },
  {
    id: 'cavala',
    name: 'Cavala',
    sprite: sprite('cavala'),
    kg: { min: 2, max: 9 },
    pricePerKg: 26,
    power: 6,
    stamina: 6,
    baits: ['camarao', 'lula'],
    rarity: 9,
    description: 'Rápida, prateada e já tem destino: o almoço de bordo.',
    rare: false,
  },
  {
    id: 'atum',
    name: 'Atum',
    sprite: sprite('atum'),
    kg: { min: 20, max: 70 },
    pricePerKg: 30,
    power: 9,
    stamina: 9,
    baits: ['corrico'],
    rarity: 5,
    description: 'Forte como um touro. Se deixar, puxa o barco.',
    rare: false,
  },
  {
    id: 'olho-de-boi',
    name: 'Olho-de-boi',
    sprite: sprite('olho-de-boi'),
    kg: { min: 5, max: 30 },
    pricePerKg: 28,
    power: 8,
    stamina: 7,
    baits: ['carne', 'lula'],
    rarity: 6,
    description: 'Olhão arregalado, igual a Geane vendo E.T.',
    rare: false,
  },
  {
    id: 'marlim-azul',
    name: 'Marlim-azul',
    sprite: sprite('marlim-azul'),
    kg: { min: 100, max: 250 },
    pricePerKg: 20,
    power: 10,
    stamina: 10,
    baits: ['corrico'],
    rarity: 1,
    description: 'O chefão do mar. Luta até o fim, e por isso merece voltar pra água.',
    rare: true,
    fightStyle: 'saltador',
  },
] satisfies Omit<Species, 'medals'>[]);

// Cena de 180 × 400 px lógicos, vista de cima, com o costado do barco embaixo e a ponta da vara em
// (90, 370). Do barco para o mar aberto: o costado, o mar aberto e o azul profundo do marlim.
const band = (top: number, bottom: number) => [
  { x: 0, y: top },
  { x: 180, y: top },
  { x: 180, y: bottom },
  { x: 0, y: bottom },
];

const altoMar = {
  id: 'alto-mar-da-bahia',
  name: 'Alto-mar da Bahia',
  background: 'src/assets/scene/alto-mar-da-bahia.png',
  zones: [
    {
      id: 'costado',
      polygon: band(250, 360),
      species: ['cavala', 'dourado-do-mar'],
      depthM: 20,
      name: 'Costado do barco',
      minReach: 0,
    },
    {
      id: 'mar-aberto',
      polygon: band(130, 250),
      species: ['cavala', 'dourado-do-mar', 'olho-de-boi', 'atum'],
      depthM: 60,
      name: 'Mar aberto',
      minReach: 3,
    },
    {
      id: 'azul-profundo',
      polygon: band(0, 130),
      species: ['olho-de-boi', 'atum', 'marlim-azul'],
      depthM: 200,
      name: 'Azul profundo',
      minReach: 5,
    },
  ],
} satisfies Location;

const rods = [
  { id: 'oceano', name: 'Vara Oceano', price: 30000, force: 9, reach: 10, episode: 5 },
  { id: 'lendaria', name: 'Vara Lendária', price: 50000, force: 10, reach: 10, episode: 5 },
] satisfies Rod[];

// O roteiro não dá nome à isca nova do episódio; o corrico é a isca clássica de atum e marlim.
const baits = [{ id: 'corrico', name: 'Isca de Corrico', price: 1200, episode: 5 }] satisfies Bait[];

const say = (speaker: CharacterId, expression: Expression, text: string): DialogLine => ({ speaker, expression, text });
/** Narração do roteiro (as linhas em itálico): sem retrato. */
const narrate = (text: string): DialogLine => ({ speaker: null, text });

const scenes = [
  {
    id: 'ep5-abertura', // cena 1
    lines: [
      narrate('Alto-mar da Bahia. O barco sai cedinho, lotado.'),
      say('marcio', 'rindo', 'Chefe, hoje o funcionário 01 é capitão. Todo mundo a bordo!'),
      say('jane', 'rindo', 'A família inteira num barco só. O que pode dar errado?'),
      say('higashi', 'normal', 'Botei GPS no barco. Rota: a grande final. Ninha, você não devia estar trabalhando?'),
      say('ninha-adulta', 'rindo', 'Tô trabalhando, Sr. Higashi. Tô testando o jogo.'),
      say('angela', 'rindo', 'Seu Adilson, trouxe protetor solar pra família inteira. Ruiva no alto-mar não brinca.'),
      say('adilson', 'chocado', 'Vocês vieram todos?'),
      say('ninha-adulta', 'rindo', 'Pai, é a Copa Adilson Moscovits. A gente não ia perder.'),
    ],
  },
  {
    id: 'ep5-filial', // cena 2
    lines: [
      say('edvaldo', 'rindo', 'Filial flutuante, seu Adilson. Preço de alto-mar: o maior de todos.'),
      say('adilson', 'bravo', 'Até no meio do mar, Edvaldo?!'),
    ],
  },
  {
    id: 'ep5-almoco', // cena 3
    lines: [
      say('bem', 'rindo', 'Pega uma cavala pro almoço que a gelada eu já trouxe.'),
      say('kris', 'bravo', 'Gelada de quê, Bem? Adilson, líquido controlado! Tá tudo no prendrive.'),
      say('ricardo', 'rindo', 'Enquanto isso, um bongô pra chamar peixe. Tum-tum-ta!'),
    ],
  },
  {
    id: 'ep5-piranha', // cena 4: a Lavínia no mar aberto, com o Cervero ao lado
    lines: [
      say('lavinia', 'rindo', 'Adilsinho! Mar aberto é o meu parquinho.'),
      say('adilson', 'bravo', 'Você não cansa, né?'),
      say('lavinia', 'rindo', 'De te pirraçar? Nunca, Adilsinho. E hoje eu trouxe reforço: meu namorado!'),
      say('ruan', 'rindo', 'Prazer, seu Adilson. Pode deixar que eu fico de olho: um olho no peixe e outro no gato.'),
      say('adilson', 'chocado', 'Mais um pra me pirraçar no mar…'),
    ],
  },
  {
    id: 'ep5-irmas', // cena 5
    lines: [
      say('lu', 'rindo', 'Xô, desliguei o celular. Juro. Quase.'),
      say('geane', 'chocado', 'Xô, olha o céu! Aquela nuvem tem formato de disco voador!'),
      say('louise', 'rindo', 'Tio, o Lucca trouxe até boné de pescador.'),
      say('lucca', 'rindo', 'Pega o peixe gigante!'),
    ],
  },
  {
    id: 'ep5-chefao', // cena 6
    lines: [
      say('capenga', 'normal', 'Vim de Jacuípe só pra ver, seu Adilson. Aqui mora o marlim-azul. O maior de todos.'),
      say('marcio', 'chocado', 'Chefe, olha o tamanho dessa sombra!'),
      say('jane', 'normal', 'Esse é teimoso que nem você, pegador.'),
      say('ninha-adulta', 'normal', 'Pai, esse vai puxar forte. Não solta!'),
      say('lavinia', 'normal', 'Vai, Adilsinho. Hoje eu torço por você.'),
      say('ruan', 'rindo', 'Tô de olho na sombra dele, seu Adilson. Num dos olhos, pelo menos.'),
      say('geane', 'chocado', 'Xô, não desiste!'),
      say('ricardo', 'rindo', 'Tum-tum-ta! Força!'),
    ],
  },
  {
    id: 'ep5-marlim-solto', // cena 7: o Adilson solta o marlim de volta pro mar
    lines: [
      say('adilson', 'rindo', 'Peguei! Vocês viram? Peguei!'),
      narrate('O Adilson solta o marlim de volta pro mar.'),
      say('jane', 'chocado', 'Soltou?!'),
      say('adilson', 'normal', 'Quem luta assim merece continuar nadando.'),
    ],
  },
  {
    id: 'ep5-album', // cena 8
    lines: [say('marcio', 'rindo', 'Álbum completo, chefe. Do Poço do Magro até o alto-mar.')],
  },
  {
    // Cena 10: o encerramento final do jogo (HIST-10), com a frase de cada um. A carta de todo mundo
    // vem junto, e o aviso "A pescaria continua: todos os lugares seguem abertos" fecha a história.
    id: 'ep5-final',
    lines: [
      narrate('O sol se pondo no alto-mar. Todo mundo em volta do Adilson.'),
      narrate('Uma brisa com cheiro de Jacuípe passa pelo barco.'),
      say('ninha-adulta', 'normal', 'Pai, sentiu essa brisa? Lembrei do vô Didi dizendo "esse é o meu filho".'),
      say('adilson', 'rindo', 'E da mãe gritando JUNIORRRR lá de longe…'),
      say('jane', 'rindo', 'E do Tininho deixando tudo arrumado pra gente. Eles iam ficar orgulhosos.'),
      say('jane', 'normal', 'Tantos anos te aturando, pegador… e eu faria tudo de novo. A gente acredita em você.'),
      say('ninha-adulta', 'normal', 'Pai, segura firme. A próxima pescaria é nossa, e eu tô aqui pra ela.'),
      say('angela', 'normal', 'Seu Adilson, o senhor é família. E família a gente não solta.'),
      say('lavinia', 'normal', 'Adilsinho, sem pirraça agora: a gente te ama muito. Não desiste.'),
      say('ruan', 'normal', 'Seu Adilson, tô de olho na sua melhora. Com os dois olhos.'),
      say('lu', 'normal', 'Xô, cancelei todas as reuniões. Hoje eu só torço por você.'),
      say('geane', 'chocado', 'Xô, eu chorei, claro. Mas de esperança. Até os E.T. tão torcendo.'),
      say('louise', 'normal', 'Tio, você é o meu herói. Ponto final, sem recurso.'),
      say('lucca', 'rindo', 'Volta logo pra pescar comigo!'),
      say('edvaldo', 'rindo', 'A partir de hoje, pra você, desconto de verdade. Volta logo pra loja.'),
      say('ricardo', 'rindo', 'Já compus o samba da sua melhora. Tum-tum-ta!'),
      say('bem', 'rindo', 'Tô guardando uma gelada pra comemorar com você. Sem álcool, a Kris mandou.'),
      say('kris', 'normal', 'Remédio na hora, líquido controlado e coração forte. Tá tudo no prendrive. A gente tá aqui.'),
      say('marcio', 'normal', 'Chefe, o funcionário 01 segura as pontas até o senhor voltar.'),
      say('higashi', 'rindo', 'O GPS diz: destino, melhora. Chegada prevista: logo.'),
      say('adilson', 'rindo', 'Vocês são a melhor pescaria da minha vida.'),
    ],
  },
  {
    id: 'ep5-derrota', // "Se perder a Copa"
    lines: [say('ninha-adulta', 'normal', 'Pai, campeão não desiste. Bora de novo?')],
  },
] satisfies Scene[];

const caught = (id: SpeciesId) => (e: GameEvent) => e.type === 'Caught' && e.species === id;
const caughtHere = (e: GameEvent) => e.type === 'Caught' && species.some((sp) => sp.id === e.species);
// A compra conta pela vara possuída: comprada antes da hora, cumpre no evento seguinte em vez de travar.
const owns = (id: RodId) => (_e: GameEvent, p: Profile) => p.rods.owned.includes(id);
const albumComplete = (_e: GameEvent, p: Profile) => species.every((sp) => p.album[sp.id] !== undefined);

// Sem "se inscrever na Copa": o campeonato libera sozinho depois do último objetivo (CAMP-01).
const objectives = [
  { id: 'pegar-5-alto-mar', text: 'Pegar 5 peixes de alto-mar', done: caughtHere, count: 5, sceneOnDone: 'ep5-filial' },
  { id: 'comprar-oceano', text: 'Comprar a Vara Oceano', done: owns('oceano'), sceneOnDone: 'ep5-almoco' },
  { id: 'pegar-cavala', text: 'Pegar uma Cavala para o almoço', done: caught('cavala'), sceneOnDone: 'ep5-piranha' },
  { id: 'pegar-atum', text: 'Pegar um Atum', done: caught('atum'), sceneOnDone: 'ep5-irmas' },
  { id: 'comprar-lendaria', text: 'Comprar a Vara Lendária', done: owns('lendaria'), sceneOnDone: 'ep5-chefao' },
  { id: 'pegar-marlim', text: 'Pegar o Marlim-azul', done: caught('marlim-azul'), sceneOnDone: 'ep5-marlim-solto' },
  {
    id: 'album-completo',
    text: 'Registrar no álbum todas as espécies do alto-mar',
    done: albumComplete,
    sceneOnDone: 'ep5-album',
  },
] satisfies Objective[];

// Cena 9: as provocações aparecem antes do primeiro arremesso (HUMOR-04).
// Placar dos rivais em kg (soma dos 3 mais pesados): valores provisórios, T61 calibra.
const copaAdilsonMoscovits = {
  id: 'copa-adilson-moscovits',
  name: 'Copa Adilson Moscovits',
  casts: 8,
  countBest: 3,
  rivals: [
    { character: 'jane', kg: 110, taunt: say('jane', 'bravo', 'Na final eu não deixo barato, pegador.') },
    {
      character: 'lavinia',
      kg: 118.5,
      taunt: say('lavinia', 'rindo', 'Adilsinho, essa eu ganho de verdade. Sem pirraça. Mentira, com pirraça.'),
    },
    {
      character: 'ninha-adulta',
      kg: 126.4,
      taunt: say('ninha-adulta', 'rindo', 'Pai, aprendi com o melhor. Se prepara.'),
    },
  ],
  trophy: 'trofeu-copa-adilson-moscovits',
  message: 'carta-copa-adilson-moscovits',
} satisfies TournamentDef;

// docs/historia/cartas.md, "Episódio 5: Copa Adilson Moscovits (de todo mundo)".
const letter = {
  id: 'carta-copa-adilson-moscovits',
  from: 'Sua família',
  text: [
    'Adilson, pai, Xô, Junior, chefe, Adilsinho, pegador…',
    'Cada um aqui te chama de um jeito, mas todo mundo quer dizer a mesma coisa.',
    'Você foi do Poço do Magro ao alto-mar. Pegou o Pirarucu Lendário, o Camurupim, a Garoupa, o Dourado-dos-Ventos e o Marlim-azul. Ganhou a GuanambiCup, a Copa Jacuípe, a Copa Itaparica, a Copa dos Ventos e a Copa que leva o seu nome. Agora tem outra briga, a mais importante de todas. E essa a gente briga junto.',
    'Você sempre ensinou que pescaria é paciência: esperar a hora certa e não soltar quando o peixe puxa forte. Então não solta. A gente tá segurando a linha com você, cada um do seu jeito:',
    [
      'A Jane, que te atura e faria tudo de novo.',
      'A Ninha e a Ângela, com o protetor solar na bolsa e o jogo pronto pra próxima fase.',
      'A Lavínia, que promete continuar te pirraçando por muitos e muitos anos (agora com a ajuda do Cervero).',
      'A Lu e a Geane, chorando de esperança (e com os E.T. torcendo por você).',
      'A Louise e o Lucca, guardando o lugar do lado na próxima pescaria.',
      'O Edvaldo, com desconto de verdade dessa vez.',
      'O Ricardo e o bongô, a Bem e a gelada sem álcool, a Kris e o prendrive cheio de cuidados.',
      'O Márcio, segurando as pontas. E o Sr. Higashi, de GPS ligado no seu caminho de volta.',
    ].join('\n'),
    'A gente acredita na sua melhora. Todo dia. Ninguém aqui desiste, e você também não vai desistir.',
    'Os lugares de pesca continuam abertos. A vara tá te esperando. E a gente também.',
    'Com todo o amor do mundo,\nSua família',
  ].join('\n\n'),
} satisfies Message;

export const ep5 = {
  id: 5,
  locations: [altoMar],
  species,
  rods,
  baits,
  chapter: { title: 'A Grande Final', openingScene: 'ep5-abertura', objectives, closingScene: 'ep5-final' },
  scenes,
  defeatScene: 'ep5-derrota',
  tournament: copaAdilsonMoscovits,
  letter,
} satisfies EpisodeContent;
