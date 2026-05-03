import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  }

  const body = await request.json()
  const {
    title,
    address,
    city,
    monthly_rent,
    rooms,
    no_pets,
    no_smokers,
    max_occupants,
    min_income_ratio,
  } = body

  const { data: listing, error: insertError } = await supabase
    .from('listings')
    .insert({
      title,
      address,
      city,
      monthly_rent,
      rooms,
      agency_id: userData.agency_id,
      agent_id: user.id,
      status: 'active',
      owner_requirements: { no_pets, no_smokers, max_occupants, min_income_ratio },
      public_link_token: crypto.randomUUID(),
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(listing, { status: 201 })
}
