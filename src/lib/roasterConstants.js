export const ROASTER_BRANDS = [
  'Aillio',
  'Bacoffee',
  'Bühler',
  'Carmomaq',
  'Coffed',
  'Diedrich',
  'Fabrica',
  'Giesen',
  'Genio',
  'Golden Roasters',
  'Has Garanti',
  'IMF',
  'IKAWA (production)',
  'Joper',
  'Kaldi',
  'Loring',
  'Mill City',
  'Ozturk',
  'Pacci',
  'Petroncini',
  'Primo',
  'Probat',
  'Roest',
  'San Franciscan',
  'Sivetz',
  'Stronghold',
  'Titus',
  'Toper',
  'Typhoon',
  'US Roaster Corp',
  'Other',
]

export function isRoastingProfile(profileOrForm) {
  if (!profileOrForm) {
    return false
  }

  return (
    profileOrForm.primary_category === 'Roasting' ||
    (profileOrForm.secondary_categories ?? []).includes('Roasting')
  )
}

export function formatBatchSize(kg) {
  if (kg == null || kg === '') {
    return ''
  }

  return `${kg} kg`
}

export function formatCapacity(kg) {
  if (kg == null || kg === '') {
    return null
  }

  return `${kg} kg / week`
}
