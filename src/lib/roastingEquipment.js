import { ROASTER_BRANDS } from './roasterConstants'

export const emptyMachine = {
  roaster_brand: '',
  custom_brand: '',
  batch_size_kg: '',
}

export function normalizeMachinesForSave(machines) {
  return machines.map((machine) => ({
    roaster_brand:
      machine.roaster_brand === 'Other'
        ? machine.custom_brand?.trim() || 'Other'
        : machine.roaster_brand?.trim(),
    batch_size_kg: machine.batch_size_kg,
  }))
}

export function machinesFromDatabase(rows) {
  if (!rows?.length) {
    return [{ ...emptyMachine }]
  }

  return rows.map((row) => {
    const isKnownBrand = ROASTER_BRANDS.includes(row.roaster_brand)

    return {
      roaster_brand: isKnownBrand ? row.roaster_brand : 'Other',
      custom_brand: isKnownBrand ? '' : row.roaster_brand,
      batch_size_kg: row.batch_size_kg?.toString() ?? '',
    }
  })
}
