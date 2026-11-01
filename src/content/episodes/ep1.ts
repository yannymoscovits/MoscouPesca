// Episódio 1: Tirando a Ferrugem, na Barragem do Poço do Magro (Guanambi, BA).
// Fonte: docs/historia/episodio-1.md. Números de peso, preço e força são iniciais; T61 calibra.

import type { TutorialPescaStep } from '../../domain/tutorialPesca';
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

const species = withMedals([
  {
    id: 'tilapia',
    name: 'Tilápia',
    sprite: sprite('tilapia'),
    kg: { min: 0.3, max: 1.8 },
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
    power: 5,
    stamina: 4,
    baits: ['minhoca', 'carne'],
    rarity: 6,
    description: 'Cara de brava, dente de brava, é brava mesmo. Cuidado com o dedo.',
    rare: false,
    fightStyle: 'saltador',
  },
  {
    id: 'curimata',
    name: 'Curimatã',
    sprite: sprite('curimata'),
    kg: { min: 0.5, max: 4 },
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
    power: 6,
    stamina: 7,
    baits: ['milho'],
    rarity: 4,
    description: 'Gordinho, simpático e mais forte do que parece.',
    rare: false,
    fightStyle: 'afundador',
  },
  {
    id: 'tucunare',
    name: 'Tucunaré',
    sprite: sprite('tucunare'),
    kg: { min: 1, max: 6 },
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
    kg: { min: 90, max: 90 }, // sempre 90 kg, como na história
    power: 10,
    stamina: 10,
    baits: ['carne'],
    requiresRod: 'carbono', // PONTO-09: o lendário só morde com a segunda vara do capítulo
    rarity: 1,
    description: 'Primo do gigante de 90 quilos que saiu em Ceraíma. Ninguém acredita até ver.',
    rare: true,
    fightStyle: 'afundador',
  },
  {
    id: 'piranha-lavinia',
    name: 'Piranha Lavínia',
    sprite: sprite('piranha-lavinia'),
    kg: { min: 0.8, max: 0.8 }, // a ficha da cena 5: "0,80 kg"
    power: 6, // um pouquinho mais brava que a traíra (força 5, fôlego 4)
    stamina: 5,
    baits: ['carne'], // só morde a Isca de Carne (cena 4)
    rarity: 3, // aparece um pouco menos que os peixes comuns do ponto
    description: 'Rouba isca, fala demais e jura que deixou o Adilsinho ganhar.',
    rare: false,
    valueLabel: 'inestimável', // spec, "Ficha da Piranha Lavínia"
    fightStyle: 'saltador', // pula como a traíra
  },
] satisfies Omit<Species, 'medals'>[], 1);

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
    {
      id: 'raso',
      polygon: band(250, 360),
      species: ['tilapia', 'piau', 'traira', 'curimata', 'piranha-lavinia'],
      depthM: 1.5,
      name: 'Beira do píer',
      minReach: 0,
    },
    {
      id: 'meio',
      polygon: band(150, 250),
      species: ['tilapia', 'traira', 'tambaqui', 'tucunare', 'piranha-lavinia'],
      depthM: 4,
      name: 'Pedral',
      minReach: 3,
    },
    {
      id: 'fundo',
      polygon: band(0, 150),
      species: ['curimata', 'traira', 'tambaqui', 'tucunare', 'pirarucu-lendario'],
      depthM: 9,
      name: 'Fundão',
      minReach: 5,
      requiresBait: 'carne', // PONTO-10: a última área pede a vara e a isca do capítulo
      requiresRod: 'carbono',
    },
  ],
} satisfies Location;

// Bambu e Minhoca já vêm no perfil novo (profile.ts: START_ROD, START_BAIT).
const rods = [
  { id: 'bambu', name: 'Vara de Bambu', price: 0, force: 1, reach: 2, episode: 1 },
  { id: 'fibra', name: 'Vara de Fibra', price: 100, force: 3, reach: 5, episode: 1 },
  { id: 'carbono', name: 'Vara de Carbono', price: 250, force: 6, reach: 8, episode: 1 },
] satisfies Rod[];

const baits = [
  { id: 'minhoca', name: 'Minhoca', price: 0, episode: 1 },
  { id: 'milho', name: 'Milho', price: 30, episode: 1 },
  { id: 'carne', name: 'Isca de Carne', price: 50, episode: 1 },
] satisfies Bait[];

const say = (speaker: CharacterId, expression: Expression, text: string): DialogLine => ({ speaker, expression, text });
/** HIST-16: a fala com um quadro animado em cima. */
const withArt = (line: DialogLine, art: SceneArtId): DialogLine => ({ ...line, art });

const scenes = [
  {
    id: 'ep1-abertura', // cena 1
    lines: [
      say('jane', 'normal', 'Adilson, a família inteira se juntou e organizou um torneio. A GuanambiCup!'),
      say('adilson', 'rindo', 'Um torneio? Então já pode ir gravando o meu nome no troféu.'),
      withArt(say('jane', 'bravo', 'Calma. Antes você tira a ferrugem. Toma, achei a sua vara de bambu no fundo do armário.'), 'vara-de-bambu'),
      withArt(say('jane', 'rindo', 'Tá mais torta que os causos que você conta.'), 'vara-de-bambu'),
      withArt(say('adilson', 'rindo', 'Torta nada. Na mão de um pegador, qualquer vara vira profissional.'), 'vara-de-bambu'),
      say('jane', 'bravo', 'Pegador? Você pegou foi gripe no ano passado.'),
      say('edvaldo', 'rindo', 'Antes de molhar a linha: sou o Edvaldo, dono da loja! Toque em Loja, no alto da tela, para comprar varas e iscas.'),
      say('edvaldo', 'normal', 'Cada peixe que você pega vira dinheiro pra loja, mas a carteira só junta o que você vai precisar. Na loja, escolha Varas ou Iscas, compre e equipe. Força ajuda na briga; alcance abre pontos mais distantes.'),
    ],
  },
  {
    id: 'ep1-piranha', // depois da Vara de Fibra: a Lavínia aparece para atrapalhar, e pegar ela vira o objetivo
    lines: [
      say('lavinia', 'rindo', 'Vara nova, Adilsinho? Que chique! Pena que eu roubo a minhoca de qualquer vara.'),
      say('adilson', 'chocado', 'Lavínia?! Que que você tá fazendo dentro da represa?'),
      say('lavinia', 'rindo', 'Atrapalhando você, ué! Me pega se for capaz: tô na Beira do píer ou no Pedral, e só caio com Isca de Carne.'),
      say('adilson', 'bravo', 'Pode esperar, que eu vou buscar essa isca.'),
    ],
  },
  {
    id: 'ep1-loja', // depois dos 3 primeiros peixes: o Edvaldo oferece a Vara de Fibra
    lines: [
      say('edvaldo', 'rindo', 'Essa vara de bambu é do tempo de Cabral, Moscou.'),
      say('edvaldo', 'normal', 'Pra você eu faço preço de família: o mesmo de todo mundo.'),
      say('edvaldo', 'normal', 'Leva a Vara de Fibra: alcança mais longe e aguenta peixe maior. Junta R$ 100 pescando e passa aqui!'),
    ],
  },
  {
    // cena 5; a linha "Ficha: Lavínia, a Piranha · 0,80 kg" é a ficha do peixe, que a pesca já mostra
    id: 'ep1-piranha-fisgada',
    lines: [
      say('lavinia', 'chocado', 'Tá bom, tá bom, Adilsinho! Me solta que eu te conto onde ficam os peixes grandes!'),
      say('lavinia', 'rindo', 'No Fundão mora um bicho gigante. Com essa varinha aí, nem tenta, Adilsinho.'),
      say('edvaldo', 'normal', 'Pro bicho do Fundão, só a Vara de Carbono: aguenta o tranco. Já tá aqui na loja!'),
      say('adilson', 'rindo', 'Agora sim, tô pronto.'),
    ],
  },
  {
    id: 'ep1-lenda', // cena 6
    lines: [
      say('edvaldo', 'normal', 'Carbono! Agora sim, Moscou. Com essa dá pra tentar o bicho.'),
      say('adilson', 'chocado', 'Que bicho?'),
      withArt(
        say(
          'edvaldo',
          'rindo',
          'O Pirarucu Lendário. Dizem que saiu um de 90 quilos pelo sangradouro de Ceraíma, e que o primo dele mora aqui no Poço do Magro.',
        ),
        'lenda-pirarucu',
      ),
      withArt(say('lavinia', 'rindo', 'Esse aí nem eu encaro, Adilsinho. Boa sorte!'), 'lenda-pirarucu'),
      say('edvaldo', 'normal', 'O Pirarucu do Fundão! Leva Isca de Carne e paciência, que ele puxa forte.'),
    ],
  },
  {
    id: 'ep1-pegou-lenda', // cena 7
    lines: [
      say('adilson', 'rindo', 'Agora quero ver alguém dizer que é causo!'),
      withArt(say('jane', 'chocado', 'Tira foto, tira foto! Senão ninguém acredita.'), 'foto-pirarucu'),
      withArt(say('adilson', 'rindo', 'Falei que eu era pegador.'), 'foto-pirarucu'),
      withArt(say('jane', 'rindo', 'Pegador de peixe, Adilson. Só de peixe.'), 'foto-pirarucu'),
      say('lavinia', 'bravo', 'Sorte de principiante, Adilsinho.'),
      say('edvaldo', 'rindo', 'E pro álbum ficar completo, falta peixe que só come milho. Chegou milho fresquinho na loja!'),
    ],
  },
  {
    id: 'ep1-album', // cena 8
    lines: [say('jane', 'rindo', 'Todos os peixes da represa no álbum. Agora pode se inscrever, campeão.')],
  },
  {
    id: 'ep1-vitoria', // cena 10; depois dela vêm a carta e o aviso do Episódio 2
    lines: [
      withArt(say('jane', 'rindo', 'Tá bom, você ganhou. Mas o peixe de 5 quilos daquele causo continua sendo mentira.'), 'trofeu'),
      withArt(say('jane', 'bravo', 'E pode tirar esse sorriso de pegador da cara.'), 'trofeu'),
    ],
  },
  {
    id: 'ep1-derrota', // "Se perder o torneio"
    lines: [say('ricardo', 'rindo', 'Faltou ritmo, Adilson! Bora de novo?')],
  },
] satisfies Scene[];

const caught = (id: SpeciesId) => (e: GameEvent) => e.type === 'Caught' && e.species === id;
// HIST-15: peixe pego antes da vez do objetivo (juntando dinheiro para a vara, por exemplo) já vale:
// quando o objetivo chega, ele se cumpre sozinho e a cena dele aparece.
const had = (id: SpeciesId) => (p: Profile) => p.album[id] !== undefined;
// A compra conta pela vara possuída: comprada antes da hora, cumpre no evento seguinte em vez de travar.
const owns = (id: RodId) => (_e: GameEvent, p: Profile) => p.rods.owned.includes(id);
const albumComplete = (_e: GameEvent, p: Profile) => species.every((sp) => p.album[sp.id] !== undefined);

// SPEC_DEVIATION: o roteiro tem 7 objetivos; o 7º, "se inscrever na GuanambiCup", não entra na lista.
// Reason: o campeonato só libera depois do último objetivo (CAMP-01) e nenhum evento marca a inscrição;
// com ele na lista, o torneio nunca liberaria. A cena 8 já convida a se inscrever.
const objectives = [
  {
    id: 'pegar-3-peixes',
    text: 'Pegar o primeiro peixe', // o do tutorial: logo depois, o Edvaldo oferece a vara // o peixe do tutorial já conta (TUTO-08)
    done: (e) => e.type === 'Caught',
    unlocks: ['fibra'], // o Edvaldo oferece a Vara de Fibra
    sceneOnDone: 'ep1-loja',
  },
  { id: 'comprar-fibra', text: 'Comprar a Vara de Fibra', done: owns('fibra'), unlocks: ['carne'], sceneOnDone: 'ep1-piranha' }, // a Lavínia só cai com Isca de Carne
  {
    id: 'pegar-piranha',
    text: 'Pegar a Piranha Lavínia — Beira do píer ou Pedral, com Isca de Carne',
    done: caught('piranha-lavinia'), satisfied: had('piranha-lavinia'),
    unlocks: ['carbono'],
    sceneOnDone: 'ep1-piranha-fisgada',
  },
  { id: 'comprar-carbono', text: 'Comprar a Vara de Carbono', done: owns('carbono'), sceneOnDone: 'ep1-lenda' },
  {
    id: 'pegar-pirarucu',
    text: 'Pegar o Pirarucu Lendário — no Fundão',
    done: caught('pirarucu-lendario'),
    unlocks: ['milho'], // o álbum pede Curimatá e Tambaqui, que só comem milho
    sceneOnDone: 'ep1-pegou-lenda',
  },
  {
    id: 'album-completo',
    text: 'Registrar no álbum todas as espécies do Poço do Magro',
    done: albumComplete,
    satisfied: p => albumComplete({ type: 'GameStarted' }, p),
    sceneOnDone: 'ep1-album',
  },
] satisfies Objective[];

/** Cena 2: a Jane conduz o tutorial da pescaria nova, uma fala por passo (TUTO-02; pesca-bass TUTOB-01). */
export const tutorial = {
  ponto: { speaker: 'jane', text: 'Primeiro, escolhe onde pescar. Toca num ponto aberto e depois em "Pescar aqui".' },
  direcao: { speaker: 'jane', text: 'Tá vendo a seta balançando? Ela mostra pra onde a isca vai. Toca em ARREMESSAR quando ela apontar pra uma sombra de peixe.' },
  forca: { speaker: 'jane', text: 'Agora a força. A barra enche e esvazia: mais cheia, mais longe. Toca em ARREMESSAR de novo quando ela chegar onde você quer.' },
  recolher: { speaker: 'jane', text: 'A isca tá na água! Segura RECOLHER pra trazer ela devagar, passando pelos peixes.' },
  atrair: { speaker: 'jane', text: 'Olha um peixe seguindo a isca! Toca em PUXAR umas vezes pra dar uns trancos e atiçar o bicho.' },
  fisgar: { speaker: 'jane', text: 'Ele mordeu! Toca em FISGAR. Calma, que esse aí espera.' },
  briga: { speaker: 'jane', text: 'Hora da briga! Mantém o peixe dentro da faixa verde até a barrinha encher.' },
  done: {
    speaker: 'jane',
    text: 'Pegou! Viu, seu pegador? Peixe você até pega. E nada de aumentar o peso na hora de contar.',
  },
} satisfies Record<TutorialPescaStep, DialogLine>;

/** TUTOB-05: o passo a passo de cada lição do tutorial, depois da fala da Jane; o jogo espera o "Entendi". */
export const tutorialTips = {
  ponto: [
    'Cada cartão é um ponto da represa. Os de cadeado pedem uma vara melhor.',
    'Toca num ponto aberto para ver os peixes de lá.',
    'Depois toca em "Pescar aqui".',
  ],
  direcao: [
    'As sombras escuras na água são os peixes.',
    'A seta amarela balança de um lado para o outro, devagar.',
    'Toca em ARREMESSAR quando ela apontar para uma sombra.',
  ],
  forca: [
    'Agora a barra de força enche e esvazia sozinha.',
    'O X na água mostra onde a isca vai cair: mais força, mais longe.',
    'Toca em ARREMESSAR quando o X estiver em cima dos peixes.',
  ],
  recolher: [
    'A isca caiu na água.',
    'Segura RECOLHER: a isca vem vindo devagar. Solta para ela parar.',
    'Os peixes perto da isca vêm conferir.',
  ],
  atrair: [
    'Um peixe começou a seguir a isca.',
    'Toca em PUXAR algumas vezes: a isca dá uns trancos.',
    'Isso atiça o peixe até ele morder.',
  ],
  fisgar: [
    'O peixe mordeu e aparece FISGAR.',
    'Toca em FISGAR para prender o peixe no anzol.',
    'No tutorial ele espera você, sem pressa.',
  ],
  briga: [
    'A faixa verde é a sua vara; o peixe sobe e desce.',
    'Segura SEGURAR pra faixa subir; solta pra descer.',
    'Peixe na faixa: a barrinha amarela enche. Cheia, pegou!',
    'A barrinha fina é a linha: estica com o peixe fora da faixa. Vermelha? Volta pro peixe!',
  ],
} satisfies Record<Exclude<TutorialPescaStep, 'done'>, string[]>;


// Cena 9: as provocações aparecem antes do primeiro arremesso (HUMOR-04).
// Placar dos rivais em kg (soma dos 3 mais pesados): valores provisórios, T61 calibra.
const guanambiCup = {
  id: 'guanambicup',
  name: 'GuanambiCup',
  casts: 5, // copa curta: 5 arremessos, valem os 3 mais pesados
  countBest: 3,
  rivals: [
    { character: 'ricardo', kg: 5.5, taunt: say('ricardo', 'rindo', 'Eu pesco no ritmo, Adilson. Tum-tum-ta! Os peixes vêm dançando.') },
    { character: 'bem', kg: 4.5, taunt: say('bem', 'rindo', 'Trouxe o isopor. Peixe dentro? Não, cerveja.') },
    {
      character: 'kris',
      kg: 6.9,
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
