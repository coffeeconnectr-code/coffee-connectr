import { supabase } from './supabase'

export async function fetchProfileRoasters(profileId) {
  const { data, error } = await supabase
    .from('profile_roasters')
    .select('*')
    .eq('profile_id', profileId)
    .order('sort_order', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function saveProfileRoasters(profileId, machines) {
  const { error: deleteError } = await supabase
    .from('profile_roasters')
    .delete()
    .eq('profile_id', profileId)

  if (deleteError) {
    throw deleteError
  }

  const validMachines = machines.filter(
    (machine) => machine.roaster_brand?.trim() && machine.batch_size_kg,
  )

  if (!validMachines.length) {
    return []
  }

  const rows = validMachines.map((machine, index) => ({
    profile_id: profileId,
    roaster_brand: machine.roaster_brand.trim(),
    batch_size_kg: Number(machine.batch_size_kg),
    sort_order: index,
  }))

  const { data, error } = await supabase.from('profile_roasters').insert(rows).select()

  if (error) {
    throw error
  }

  return data ?? []
}

export async function searchProfilesByRoaster(roasterBrand) {
  let query = supabase
    .from('profile_roasters')
    .select(
      `
      id,
      roaster_brand,
      batch_size_kg,
      profiles (
        id,
        user_id,
        name,
        location,
        primary_category,
        profile_photo_url,
        total_roasting_capacity_kg,
        contract_roasting_capacity_kg,
        is_verified
      )
    `,
    )

  if (roasterBrand) {
    query = query.eq('roaster_brand', roasterBrand)
  }

  const { data, error } = await query.order('roaster_brand', { ascending: true })

  if (error) {
    throw error
  }

  const profileMap = new Map()

  for (const row of data ?? []) {
    const profile = row.profiles
    if (!profile) {
      continue
    }

    const existing = profileMap.get(profile.id) ?? {
      ...profile,
      machines: [],
    }

    existing.machines.push({
      id: row.id,
      roaster_brand: row.roaster_brand,
      batch_size_kg: row.batch_size_kg,
    })

    profileMap.set(profile.id, existing)
  }

  return [...profileMap.values()]
}
