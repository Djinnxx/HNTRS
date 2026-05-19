import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Alle Hunter holen
  const { data: hunters } = await supabase
    .from('hunters')
    .select('id, rank')

  if (!hunters) return new Response('No hunters found', { status: 200 })

  // Wöchentliche Quests holen
  const { data: weeklyQuests } = await supabase
    .from('quests')
    .select('*')
    .eq('type', 'weekly')
    .eq('is_active', true)

  if (!weeklyQuests) return new Response('No quests found', { status: 200 })

  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() + 1)
  weekStart.setHours(0, 0, 0, 0)

  for (const hunter of hunters) {
    // Prüfen ob Hunter diese Woche schon Quests hat
    const { data: existingQuests } = await supabase
      .from('hunter_quests')
      .select('id')
      .eq('hunter_id', hunter.id)
      .eq('status', 'active')
      .gte('assigned_at', weekStart.toISOString())

    if (existingQuests && existingQuests.length > 0) continue

    // Passende Quests für Rang filtern
    const rankOrder = ['E', 'D', 'C', 'B', 'A', 'S']
    const hunterRankIndex = rankOrder.indexOf(hunter.rank)

    const eligibleQuests = weeklyQuests.filter(q => {
      const questRankIndex = rankOrder.indexOf(q.min_rank_required || 'E')
      return questRankIndex <= hunterRankIndex
    })

    // Anzahl Quests je nach Rang
    const questCount = {
      E: 2, D: 3, C: 3, B: 4, A: 4, S: 5
    }[hunter.rank] || 2

    // Zufällige Quests auswählen
    const shuffled = eligibleQuests.sort(() => Math.random() - 0.5)
    const selectedQuests = shuffled.slice(0, questCount)

    // Quests zuweisen
    for (const quest of selectedQuests) {
      await supabase
        .from('hunter_quests')
        .insert({
          hunter_id: hunter.id,
          quest_id: quest.id,
          status: 'active',
          progress: 0,
        })
    }
  }

  return new Response('Weekly quests assigned', { status: 200 })
})