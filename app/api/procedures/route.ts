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

  if (userError || !userData?.agency_id) {
    return NextResponse.json({ error: 'Agenzia non trovata' }, { status: 404 })
  }

  const body = await request.json()
  const { listing_id, candidate_id } = body

  if (!listing_id || !candidate_id) {
    return NextResponse.json({ error: 'listing_id e candidate_id richiesti' }, { status: 400 })
  }

  const { data: procedure, error } = await supabase
    .from('procedures')
    .insert({
      listing_id,
      candidate_id,
      agency_id: userData.agency_id,
      status: 'active',
      step_current: 1,
    })
    .select()
    .single()

  if (error) {
    console.error('[procedures] insert failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(procedure, { status: 201 })
}
