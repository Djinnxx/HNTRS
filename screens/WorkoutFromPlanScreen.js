import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { supabase } from '../lib/supabase'
import RankUpModal from '../components/RankUpModal'

const RANK_COLORS = {
  E: '#888888',
  D: '#4a90d9',
  C: '#2ecc71',
  B: '#9b59b6',
  A: '#f1c40f',
  S: '#8b00ff',
}

export default function WorkoutFromPlanScreen({ navigation, route }) {
  const { plan, planExercises } = route.params
  const [hunter, setHunter] = useState(null)
  const [exercises, setExercises] = useState([])
  const [saving, setSaving] = useState(false)
  const [startTime] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [modalData, setModalData] = useState({})

  useEffect(() => {
    fetchHunter()
    initExercises()
  }, [])

  async function fetchHunter() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('hunters')
      .select('*')
      .eq('id', user.id)
      .single()
    setHunter(data)
  }

  function initExercises() {
    // Übungen aus Plan laden mit letzten Werten als Vorausfüllung
    const initialized = planExercises.map(pe => ({
      ...pe,
      sets: [{
        reps: pe.last_reps?.toString() || '',
        weight: pe.last_weight_kg?.toString() || '',
      }]
    }))
    setExercises(initialized)
  }

  function addSet(index) {
    const updated = [...exercises]
    const lastSet = updated[index].sets[updated[index].sets.length - 1]
    updated[index].sets.push({
      reps: lastSet.reps,
      weight: lastSet.weight,
    })
    setExercises(updated)
  }

  function removeSet(exerciseIndex, setIndex) {
    const updated = [...exercises]
    if (updated[exerciseIndex].sets.length === 1) return
    updated[exerciseIndex].sets.splice(setIndex, 1)
    setExercises(updated)
  }

  function updateSet(exerciseIndex, setIndex, field, value) {
    const updated = [...exercises]
    updated[exerciseIndex].sets[setIndex][field] = value
    setExercises(updated)
  }

    function calculateXP() {
        const duration = Math.floor((new Date() - startTime) / 60000)
        let xp = 0

        for (const exercise of exercises) {
            const validSets = exercise.sets.filter(s => s.reps)
            xp += validSets.length * 2
        }

        if (duration > 60) xp += 10
        if (exercises.length >= 5) xp += 5

        return Math.max(xp, 5)
    }

  async function saveWorkout() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const duration = Math.floor((new Date() - startTime) / 60000)
    const xpEarned = calculateXP()

    // Workout speichern
    const { data: workout } = await supabase
      .from('workouts')
      .insert({
        hunter_id: user.id,
        title: plan.title,
        duration_minutes: duration,
        xp_earned: xpEarned,
      })
      .select()
      .single()

    // Sets speichern + letzten Verlauf im Plan updaten
    for (const exercise of exercises) {
      const validSets = exercise.sets.filter(s => s.reps)

      for (const set of validSets) {
        await supabase.from('workout_sets').insert({
          workout_id: workout.id,
          exercise_id: exercise.exercise_id,
          sets: 1,
          reps: parseInt(set.reps) || 0,
          weight_kg: parseFloat(set.weight) || 0,
        })
      }

      // Letzten Verlauf im Trainingsplan updaten
      if (validSets.length > 0) {
        const lastSet = validSets[validSets.length - 1]
        await supabase
          .from('training_plan_exercises')
          .update({
            last_sets: validSets.length,
            last_reps: parseInt(lastSet.reps) || 0,
            last_weight_kg: parseFloat(lastSet.weight) || 0,
          })
          .eq('id', exercise.id)
      }
    }

    // XP vergeben
    await supabase.from('xp_events').insert({
      hunter_id: user.id,
      source_type: 'workout',
      source_id: workout.id,
      xp_amount: xpEarned,
    })

    // Hunter XP updaten
    await supabase
      .from('hunters')
      .update({ total_xp: (hunter.total_xp || 0) + xpEarned })
      .eq('id', user.id)

    // Plan use_count updaten
    await supabase
      .from('training_plans')
      .update({
        use_count: (plan.use_count || 0) + 1,
        last_used_at: new Date()
      })
      .eq('id', plan.id)

    // Quest Fortschritt updaten
    await updateQuestProgress(user.id)

    // Rang prüfen
    const { data: updatedHunter } = await supabase
      .from('hunters')
      .select('rank')
      .eq('id', user.id)
      .single()

    setSaving(false)
    setModalData({
      rank: updatedHunter?.rank || hunter?.rank,
      xp: xpEarned,
      duration,
      isRankUp: updatedHunter?.rank !== hunter?.rank
    })
    setShowModal(true)
  }

  async function updateQuestProgress(hunterId) {
    const { data: activeQuests } = await supabase
      .from('hunter_quests')
      .select('*, quests(*)')
      .eq('hunter_id', hunterId)
      .eq('status', 'active')

    if (!activeQuests) return

    for (const hq of activeQuests) {
      if (hq.quests.requirement_type === 'workouts_count') {
        const newProgress = (hq.progress || 0) + 1
        const completed = newProgress >= hq.quests.requirement_value

        await supabase
          .from('hunter_quests')
          .update({
            progress: newProgress,
            status: completed ? 'completed' : 'active',
            completed_at: completed ? new Date() : null
          })
          .eq('id', hq.id)

        if (completed) {
          await supabase.from('xp_events').insert({
            hunter_id: hunterId,
            source_type: 'quest',
            source_id: hq.quest_id,
            xp_amount: hq.quests.xp_reward,
          })
          await supabase
            .from('hunters')
            .update({ total_xp: (hunter.total_xp || 0) + hq.quests.xp_reward })
            .eq('id', hunterId)
        }
      }
    }
  }

  const rankColor = RANK_COLORS[hunter?.rank] || '#888888'

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← ZURÜCK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{plan.title}</Text>
        <TouchableOpacity onPress={saveWorkout} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#ffffff" size="small" />
            : <Text style={[styles.saveText, { color: rankColor }]}>SPEICHERN</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>

        {exercises.map((exercise, exerciseIndex) => (
          <View key={exercise.id} style={styles.exerciseCard}>

            <View style={styles.exerciseHeader}>
              <View>
                <Text style={styles.exerciseName}>
                  {exercise.exercises?.name}
                </Text>
                <Text style={styles.exerciseMuscle}>
                  {exercise.exercises?.muscle_group}
                </Text>
              </View>
            </View>

            {/* Sets Header */}
            <View style={styles.setHeader}>
              <Text style={styles.setHeaderText}>SET</Text>
              <Text style={styles.setHeaderText}>WIEDERHOLUNGEN</Text>
              <Text style={styles.setHeaderText}>KG</Text>
              <Text style={styles.setHeaderText}></Text>
            </View>

            {exercise.sets.map((set, setIndex) => (
              <View key={setIndex} style={styles.setRow}>
                <Text style={styles.setNumber}>{setIndex + 1}</Text>
                <TextInput
                  style={styles.setInput}
                  placeholder="0"
                  placeholderTextColor="#333"
                  value={set.reps}
                  onChangeText={val => updateSet(exerciseIndex, setIndex, 'reps', val)}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.setInput}
                  placeholder="0"
                  placeholderTextColor="#333"
                  value={set.weight}
                  onChangeText={val => updateSet(exerciseIndex, setIndex, 'weight', val)}
                  keyboardType="numeric"
                />
                <TouchableOpacity onPress={() => removeSet(exerciseIndex, setIndex)}>
                  <Text style={styles.removeSetText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addSetButton}
              onPress={() => addSet(exerciseIndex)}
            >
              <Text style={styles.addSetText}>+ SET HINZUFÜGEN</Text>
            </TouchableOpacity>

          </View>
        ))}

        <View style={{ height: 100 }} />

      </ScrollView>

      <RankUpModal
        visible={showModal}
        rank={modalData.rank}
        xp={modalData.xp}
        duration={modalData.duration}
        isRankUp={modalData.isRankUp}
        onClose={() => {
          setShowModal(false)
          navigation.getParent('MainStack')?.navigate('TrainingPlans')
        }}
      />

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 24,
  },
  backText: {
    color: '#444',
    fontSize: 12,
    letterSpacing: 2,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 4,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  saveText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  exerciseCard: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  exerciseHeader: {
    marginBottom: 16,
  },
  exerciseName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  exerciseMuscle: {
    color: '#444',
    fontSize: 11,
    letterSpacing: 2,
    marginTop: 2,
  },
  setHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  setHeaderText: {
    color: '#333',
    fontSize: 10,
    letterSpacing: 1,
    flex: 1,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  setNumber: {
    color: '#444',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  setInput: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 4,
    padding: 8,
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 4,
    fontSize: 15,
  },
  removeSetText: {
    color: '#222',
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
  },
  addSetButton: {
    marginTop: 8,
    padding: 8,
    alignItems: 'center',
  },
  addSetText: {
    color: '#333',
    fontSize: 11,
    letterSpacing: 2,
  },
})