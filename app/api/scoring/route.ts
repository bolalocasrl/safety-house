import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { calculateScore } from '@/lib/scoring/algorithm'

export async function POST(request: NextRequest) {
  // Auth check: verifica che la richiesta venga da un utente autenticato
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const body = await request.json()
  const { application_id } = body
  if (!application_id) {
    return NextResponse.json({ error: 'application_id richiesto' }, { status: 400 })
  }

  // Tutte le operazioni DB con admin client (bypassa RLS per update server-side)
  const db = createAdminClient()

  const { data: application, error: appError } = await db
    .from('applications')
    .select('id, candidate_id, listing_id')
    .eq('id', application_id)
    .single()

  if (appError || !application) {
    console.error('[scoring] application not found:', appError?.message)
    return NextResponse.json({ error: 'Candidatura non trovata' }, { status: 404 })
  }

  const { data: candidate, error: candidateError } = await db
    .from('candidates')
    .select('monthly_income, has_pets, smoker, num_occupants, vida_laboral_csv_code')
    .eq('id', application.candidate_id)
    .single()

  if (candidateError || !candidate) {
    console.error('[scoring] candidate not found:', candidateError?.message)
    return NextResponse.json({ error: 'Candidato non trovato' }, { status: 404 })
  }

  const { data: listing, error: listingError } = await db
    .from('listings')
    .select('monthly_rent, owner_requirements')
    .eq('id', application.listing_id)
    .single()

  if (listingError || !listing) {
    console.error('[scoring] listing not found:', listingError?.message)
    return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })
  }

  const breakdown = calculateScore(
    {
      monthly_income: candidate.monthly_income ?? 0,
      has_pets: candidate.has_pets ?? false,
      smoker: candidate.smoker ?? false,
      num_occupants: candidate.num_occupants ?? 1,
      vida_laboral_csv_code: candidate.vida_laboral_csv_code ?? null,
    },
    {
      monthly_rent: listing.monthly_rent,
      owner_requirements: listing.owner_requirements,
    }
  )

  const { error: candidateUpdateError } = await db
    .from('candidates')
    .update({ safety_score: breakdown.total })
    .eq('id', application.candidate_id)

  if (candidateUpdateError) {
    console.error('[scoring] candidate update failed:', candidateUpdateError.message, candidateUpdateError.code)
  } else {
    console.log('[scoring] candidate', application.candidate_id, '→ safety_score =', breakdown.total)
  }

  const { error: applicationUpdateError } = await db
    .from('applications')
    .update({ safety_score: breakdown.total })
    .eq('id', application_id)

  if (applicationUpdateError) {
    console.error('[scoring] application update failed:', applicationUpdateError.message, applicationUpdateError.code)
  } else {
    console.log('[scoring] application', application_id, '→ safety_score =', breakdown.total)
  }

  return NextResponse.json({
    safety_score: breakdown.total,
    breakdown: {
      solvency: breakdown.solvency,
      matching: breakdown.matching,
      fraud: breakdown.fraud,
    },
  })
}
