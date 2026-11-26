// Sky Courier — tuning constants for the flight model, the world and the HUD.
// Every number here is a design choice for how the plane feels: a bush seaplane
// that is forgiving at cruise, punishes a stalled turn, and sips fuel at half
// throttle. Units are metres, metres per second and degrees unless noted.

export const VIEW = {
  width: 1280,
  height: 720,
  // How far ahead of the plane the camera looks, in pixels.
  lookAhead: 340,
  // Sea level on screen: y in world metres maps to this pixel row at the
  // camera's altitude. The camera keeps the plane near the middle band.
  horizonBand: 300,
};

export const PLANE = {
  // Top speed at full throttle, level flight, in m/s (~95 kt).
  maxSpeed: 49,
  // Cruise speed the plane settles at with half throttle.
  cruiseSpeed: 34,
  // Below this speed the wing stops flying and the nose drops.
  stallSpeed: 17,
  // How fast the engine answers the throttle, per second.
  throttleResponse: 0.55,
  // Pitch authority in degrees per second at the stick.
  pitchRate: 46,
  // Pitch range the pilot can hold.
  pitchMin: -32,
  pitchMax: 34,
  // Lift and drag shaping: lift grows with speed squared, drag faster still.
  // dragFactor is sized so half throttle settles near cruise speed and full
  // throttle near max speed: thrust = drag at steady speed.
  liftFactor: 0.021,
  dragFactor: 0.006,
  gravity: 9.8,
  // Fuel in percent; burn per second at full throttle.
  fuelBurn: 0.7,
  // A touchdown is a landing when the sink rate is under this (m/s).
  softTouchdown: 3.2,
  // ...and a crash when it is over this.
  hardTouchdown: 7.5,
};

export const WORLD = {
  // World length per mission, in metres.
  length: 4800,
  // Sea level is y = 0; islands rise above it.
  seaLevel: 0,
  // Ring radius in metres (the gate the plane must fly through).
  ringRadius: 26,
  // How close the plane must be to a ring centre to score it.
  ringScoreRadius: 24,
};

export const SCORE = {
  ring: 100,
  ringCombo: 25,
  landing: 250,
  gentleLanding: 150,
  cargoDrop: 120,
  timeBonusPerSecond: 4,
  fuelBonusPerPercent: 3,
};

export const PALETTES = {
  dawn: {
    skyTop: '#2e4d7a', skyMid: '#7fa8c9', skyLow: '#f2c98a',
    sun: '#ffd98a', sunGlow: 'rgba(255, 217, 138, 0.45)',
    sea: '#2f6f8f', seaDeep: '#1d4a66', seaGlint: 'rgba(255, 240, 200, 0.5)',
    sand: '#e8d29a', grass: '#5d8a4a', grassDark: '#47703a',
    cloud: 'rgba(255, 250, 240, 0.85)',
  },
  storm: {
    skyTop: '#3a4450', skyMid: '#6d7c8c', skyLow: '#b9a98c',
    sun: '#e8e0c8', sunGlow: 'rgba(232, 224, 200, 0.25)',
    sea: '#33566b', seaDeep: '#22384a', seaGlint: 'rgba(220, 230, 235, 0.35)',
    sand: '#cbb98a', grass: '#4f7040', grassDark: '#3d5a32',
    cloud: 'rgba(210, 215, 220, 0.8)',
  },
  night: {
    skyTop: '#060a1c', skyMid: '#101a38', skyLow: '#2c3a5e',
    sun: '#f4ead0', sunGlow: 'rgba(244, 234, 208, 0.12)',
    sea: '#0e2438', seaDeep: '#081826', seaGlint: 'rgba(180, 200, 230, 0.3)',
    sand: '#8a7d5e', grass: '#2c4630', grassDark: '#223624',
    cloud: 'rgba(160, 170, 200, 0.35)',
  },
};
