import { supabase } from './supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'

export async function checkInactivityAndNotify(hunterId) {
  try {
    // Prüfen ob heute bereits geprüft wurde
    const today = new Date().toDateString()
    const lastCheck = await AsyncStorage.getItem('lastInactivityCheck_' + hunterId)
    if (lastCheck === today) return

    await AsyncStorage.setItem('lastInactivityCheck_' + hunterId, today)

    // Letztes Workout holen
    const { data: workouts } = await supabase
      .from('workouts')
      .select('completed_at')
      .eq('hunter_id', hunterId)
      .order('completed_at', { ascending: false })
      .limit(1)

    if (!workouts || workouts.length === 0) return

    const lastWorkoutDate = new Date(workouts[0].completed_at)
    const today2 = new Date()
    const daysDiff = Math.floor(
      (today2 - lastWorkoutDate) / (1000 * 60 * 60 * 24)
    )

    if (daysDiff < 5) return

    // Prüfen ob bereits eine aktive Notfall-Quest existiert
    const { data: emergencyQuests } = await supabase
      .from('quests')
      .select('id')
      .eq('type', 'emergency')
      .eq('is_active', true)

    if (!emergencyQuests || emergencyQuests.length === 0) return

    const emergencyIds = emergencyQuests.map(q => q.id)

    const { data: existingEmergency } = await supabase
      .from('hunter_quests')
      .select('id')
      .eq('hunter_id', hunterId)
      .eq('status', 'active')
      .in('quest_id', emergencyIds)
      .limit(1)

    if (existingEmergency && existingEmergency.length > 0) return

    // Zufällige Notfall-Quest zuweisen
    const randomQuest = emergencyQuests[
      Math.floor(Math.random() * emergencyQuests.length)
    ]

    await supabase
      .from('hunter_quests')
      .insert({
        hunter_id: hunterId,
        quest_id: randomQuest.id,
        status: 'active',
        progress: 0,
      })

  } catch (error) {
    console.log('Inactivity check error:', error)
  }
}