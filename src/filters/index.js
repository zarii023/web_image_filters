import wrinkles from './wrinkles'
import brightness from './brightness'
import spots from './spots'
import acne from './acne'
import firmness from './firmness'

export const FILTERS = {
  wrinkles,
  brightness,
  spots,
  acne,
  firmness,
}

export function getFilter(key) {
  return FILTERS[key] || null
}

export const FILTER_ORDER = ['wrinkles','brightness','spots','acne','firmness']
