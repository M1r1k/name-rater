import { supabase, type RatedName, type NameRating, type NameWeight } from './supabase'

// Rated names management
export const createRatedName = async (name: string, isBlacklisted: boolean = false, comments?: string): Promise<RatedName | null> => {
  const { data, error } = await supabase
    .from('rated_names')
    .insert({ name, is_blacklisted: isBlacklisted, comments })
    .select()
    .single()

  if (error) {
    console.error('Error creating rated name:', error)
    return null
  }

  return data
}

export const getRatedName = async (name: string): Promise<RatedName | null> => {
  const { data, error } = await supabase
    .from('rated_names')
    .select('*')
    .eq('name', name)
    .single()

  if (error) {
    console.error('Error getting rated name:', error)
    return null
  }

  return data
}

export const getAllRatedNames = async (): Promise<RatedName[]> => {
  const { data, error } = await supabase
    .from('rated_names')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error getting all rated names:', error)
    return []
  }

  return data || []
}

export const deleteRatedName = async (nameId: number): Promise<void> => {
  const { error } = await supabase
    .from('rated_names')
    .delete()
    .eq('id', nameId)

  if (error) {
    console.error('Error deleting rated name:', error)
  }
}

export const updateComments = async (nameId: number, comments: string): Promise<RatedName | null> => {
  const { data, error } = await supabase
    .from('rated_names')
    .update({ comments })
    .eq('id', nameId)
    .select()
    .single()

  if (error) {
    console.error('Error updating comments:', error)
    return null
  }

  return data
}

// Ratings management
export const upsertRating = async (
  nameId: number,
  dimensionKey: string,
  parentId: string,
  rating: number
): Promise<NameRating | null> => {
  const { data, error } = await supabase
    .from('name_ratings')
    .upsert({
      name_id: nameId,
      dimension_key: dimensionKey,
      parent_id: parentId,
      rating,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'name_id,dimension_key,parent_id'
    })
    .select()
    .single()

  if (error) {
    console.error('Error upserting rating:', error)
    return null
  }

  return data
}

export const getRatingsForName = async (nameId: number, parentId?: string): Promise<NameRating[]> => {
  let query = supabase
    .from('name_ratings')
    .select('*')
    .eq('name_id', nameId)
  
  if (parentId) {
    query = query.eq('parent_id', parentId)
  }
  
  const { data, error } = await query.order('dimension_key')

  if (error) {
    console.error('Error getting ratings for name:', error)
    return []
  }

  return data || []
}

export const deleteRating = async (nameId: number, dimensionKey: string, parentId: string): Promise<void> => {
  const { error } = await supabase
    .from('name_ratings')
    .delete()
    .eq('name_id', nameId)
    .eq('dimension_key', dimensionKey)
    .eq('parent_id', parentId)

  if (error) {
    console.error('Error deleting rating:', error)
  }
}

// Weights management
export const upsertWeight = async (
  dimensionKey: string,
  weight: number
): Promise<NameWeight | null> => {
  const { data, error } = await supabase
    .from('name_weights')
    .upsert({
      dimension_key: dimensionKey,
      weight,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'dimension_key'
    })
    .select()
    .single()

  if (error) {
    console.error('Error upserting weight:', error)
    return null
  }

  return data
}

export const getAllWeights = async (): Promise<NameWeight[]> => {
  const { data, error } = await supabase
    .from('name_weights')
    .select('*')

  if (error) {
    console.error('Error getting all weights:', error)
    return []
  }

  return data || []
}

// Combined data operations
export const loadAllData = async (parentId?: string) => {
  const [ratedNames, weights] = await Promise.all([
    getAllRatedNames(),
    getAllWeights()
  ])

  // Get ratings for all names (filtered by parent if specified)
  const allRatings = await Promise.all(
    ratedNames.map(async (name) => {
      const ratings = await getRatingsForName(name.id, parentId)
      return { nameId: name.id, ratings }
    })
  )

  return { ratedNames, weights, allRatings }
} 