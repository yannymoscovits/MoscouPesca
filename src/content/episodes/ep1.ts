// Episódio 1: Tirando a Ferrugem, na Barragem do Poço do Magro (Guanambi, BA).
// Fonte: docs/historia/episodio-1.md. Números de peso, preço e força são iniciais; T61 calibra.

import type { Bait, Episode, Location, Rod, Species } from '../types';

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

export const ep1 = {
  id: 1,
  locations: [pocoDoMagro],
  species,
  rods,
  baits,
  // Roteiro (T23), GuanambiCup e carta (T24) entram nas próximas tarefas.
  chapter: { title: 'Tirando a Ferrugem', openingScene: 'ep1-abertura', objectives: [], closingScene: 'ep1-vitoria' },
  tournament: {
    id: 'guanambicup',
    name: 'GuanambiCup',
    casts: 8,
    countBest: 3,
    rivals: [],
    trophy: 'trofeu-guanambicup',
    message: 'carta-guanambicup',
  },
  letter: { id: 'carta-guanambicup', from: 'Sua família', text: '{{PENDENTE}}' },
} satisfies Episode;
