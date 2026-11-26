// Sky Courier — the three delivery legs. Each leg is a different sky, a
// different direction and a different problem: a calm dawn hop to learn the
// plane, a gusty storm crossing, and a night mail run with runway lights.
// The legs chain: finishing one starts the next, and the courier's total
// score carries across all three.

export const MISSIONS = [
  {
    name: 'Dawn Run',
    brief: 'First light over the lagoon. Rings to the far strip.',
    palette: 'dawn',
    seed: 11,
    direction: 1,
    fuel: 100,
    wind: false,
    parSeconds: 140,
  },
  {
    name: 'Storm Crossing',
    brief: 'A squall is rolling in. Gusts, rings, and less fuel to spare.',
    palette: 'storm',
    seed: 23,
    direction: -1,
    fuel: 90,
    wind: true,
    parSeconds: 165,
  },
  {
    name: 'Night Mail',
    brief: 'Last mail of the day, under the moon. Rings and runway lights.',
    palette: 'night',
    seed: 37,
    direction: 1,
    fuel: 85,
    wind: false,
    parSeconds: 150,
  },
];
