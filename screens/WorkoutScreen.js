import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native'
import { supabase } from '../lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import RankUpModal from '../components/RankUpModal'
import QuestCompleteModal from '../components/QuestCompleteModal'
import InfoModal from '../components/InfoModal'
import PRModal from '../components/PRModal'


const RANK_COLORS = {
  E: '#888888',
  D: '#4a90d9',
  C: '#2ecc71',
  B: '#9b59b6',
  A: '#f1c40f',
  S: '#8b00ff',
}

export default function WorkoutScreen({ navigation }) {
  const [hunter, setHunter] = useState(null)
  const [exercises, setExercises] = useState([])
  const [filteredExercises, setFilteredExercises] = useState([])
  const [selectedExercises, setSelectedExercises] = useState([])
  const [workoutTitle, setWorkoutTitle] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [startTime] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [modalData, setModalData] = useState({})
  const [recentWorkouts, setRecentWorkouts] = useState([])
  const [allExercises, setAllExercises] = useState([])
  const [showInfo, setShowInfo] = useState(false)
  const [showQuestModal, setShowQuestModal] = useState(false)
  const [completedQuest, setCompletedQuest] = useState(null)
  const [questQueue, setQuestQueue] = useState([])
  const [showPRModal, setShowPRModal] = useState(false)
  const [newPRs, setNewPRs] = useState([])

  useEffect(() => {
    fetchHunter()
    fetchExercises()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredExercises(exercises)
    } else {
      const filtered = exercises.filter(ex =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.muscle_group.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredExercises(filtered)
    }
  }, [searchQuery, exercises])

  async function processPendingXP() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const stored = await AsyncStorage.getItem('pendingXP_' + user.id)
      if (!stored) return

      const pending = JSON.parse(stored)
      const now = new Date()

      const readyToProcess = pending.filter(item => {
        const readyAt = new Date(item.readyAt)
        return now >= readyAt
      })

      if (readyToProcess.length === 0) return

      for (const item of readyToProcess) {
        await supabase.from('xp_events').insert({
          hunter_id: user.id,
          source_type: 'workout',
          source_id: user.id,
          xp_amount: item.xp,
        })

        await supabase
          .from('hunters')
          .update({ total_xp: (hunter?.total_xp || 0) + item.xp })
          .eq('id', user.id)
      }

      const remaining = pending.filter(item => {
        const readyAt = new Date(item.readyAt)
        return now < readyAt
      })

      await AsyncStorage.setItem('pendingXP_' + user.id, JSON.stringify(remaining))

    } catch (error) {
      console.log('PendingXP error:', error)
    }
  }

  async function scheduleXP(sets, title, duration) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const readyAt = new Date(Date.now() + 5 * 60 * 1000)
      const xp = sets.length * 2

      const { data: workout } = await supabase
        .from('workouts')
        .insert({
          hunter_id: user.id,
          title: title,
          duration_minutes: duration,
          xp_earned: xp,
        })
        .select()
        .single()

      if (workout && sets.length > 0) {
        await supabase.from('workout_sets').insert(
          sets.map(s => ({
            workout_id: workout.id,
            exercise_id: s.exercise_id,
            sets: 1,
            reps: parseInt(s.reps) || 0,
            weight_kg: parseFloat(s.weight) || 0,
          }))
        )
      }

      await updateQuestProgress(user.id, duration, sets)
      await updateSkillPoints(user.id)

      // PRs prüfen
      const newPRs = await checkPersonalRecords(user.id, sets)
      if (newPRs.length > 0) {
        setNewPRs(newPRs)
        setShowPRModal(true)
      }
      const newItem = {
        readyAt: readyAt.toISOString(),
        xp,
        workoutId: workout?.id,
      }

      const stored = await AsyncStorage.getItem('pendingXP_' + user.id)
      const pending = stored ? JSON.parse(stored) : []
      pending.push(newItem)
      await AsyncStorage.setItem('pendingXP_' + user.id, JSON.stringify(pending))

      setTimeout(async () => {
        await processPendingXP()
      }, 5 * 60 * 1000 + 1000)

      const { data: workoutsRes } = await supabase
        .from('workouts')
        .select('*, workout_sets(*, exercises(name))')
        .eq('hunter_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(5)
      setRecentWorkouts(workoutsRes || [])

      setModalData({
        rank: hunter?.rank,
        xp,
        duration,
        isRankUp: false
      })
      setShowModal(true)
      // Quest Modals zeigen falls vorhanden
      if (questQueue.length > 0) {
        setCompletedQuest(questQueue[0])
        setShowQuestModal(true)
      }
    } catch (error) {
      console.log('ScheduleXP error:', error)
    }
  }

  async function fetchHunter() {
    const { data: { user } } = await supabase.auth.getUser()
    const [hunterRes, workoutsRes] = await Promise.all([
      supabase.from('hunters').select('*').eq('id', user.id).single(),
      supabase
        .from('workouts')
        .select('*, workout_sets(*, exercises(name))')
        .eq('hunter_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(5)
    ])
    setHunter(hunterRes.data)
    setRecentWorkouts(workoutsRes.data || [])
    await processPendingXP()
  }

  async function fetchExercises() {
    setLoading(true)
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .order('muscle_group', { ascending: true })
    setExercises(data || [])
    setFilteredExercises(data || [])
    setAllExercises(data || [])
    setLoading(false)
  }

  function addExercise(exercise) {
    const alreadyAdded = selectedExercises.find(e => e.id === exercise.id)
    if (alreadyAdded) {
      Alert.alert('Bereits hinzugefügt', 'Diese Übung ist bereits im Workout.')
      return
    }
    setSelectedExercises(prev => [...prev, {
      ...exercise,
      sets: [{ reps: '', weight: '' }]
    }])
    setShowExerciseModal(false)
    setSearchQuery('')
  }

  function addSet(exerciseIndex) {
    const updated = [...selectedExercises]
    updated[exerciseIndex].sets.push({ reps: '', weight: '' })
    setSelectedExercises(updated)
  }

  function removeSet(exerciseIndex, setIndex) {
    const updated = [...selectedExercises]
    if (updated[exerciseIndex].sets.length === 1) {
      Alert.alert('Mindestens ein Set', 'Ein Workout braucht mindestens ein Set.')
      return
    }
    updated[exerciseIndex].sets.splice(setIndex, 1)
    setSelectedExercises(updated)
  }

  function updateSet(exerciseIndex, setIndex, field, value) {
    const updated = [...selectedExercises]
    updated[exerciseIndex].sets[setIndex][field] = value
    setSelectedExercises(updated)
  }

  function removeExercise(exerciseIndex) {
    const updated = [...selectedExercises]
    updated.splice(exerciseIndex, 1)
    setSelectedExercises(updated)
  }

  function calculateXP() {
    let xp = 0
    for (const exercise of selectedExercises) {
      const validSets = exercise.sets.filter(s => s.reps)
      xp += validSets.length * 2
    }
    return Math.max(xp, 0)
  }
  async function checkPersonalRecords(hunterId, sets) {
    try {
      const newPRs = []

      // Sets nach Übung gruppieren
      const exerciseMap = {}
      for (const set of sets) {
        if (!exerciseMap[set.exercise_id]) {
          exerciseMap[set.exercise_id] = []
        }
        exerciseMap[set.exercise_id].push(set)
      }

      for (const exerciseId of Object.keys(exerciseMap)) {
        const exerciseSets = exerciseMap[exerciseId]
        const exercise = allExercises.find(e => e.id === exerciseId)

        // Max Gewicht berechnen
        const maxWeight = Math.max(...exerciseSets.map(s => parseFloat(s.weight) || 0))
        // Max Reps berechnen
        const maxReps = Math.max(...exerciseSets.map(s => parseInt(s.reps) || 0))
        // Max Volumen (Gewicht × Reps)
        const maxVolume = Math.max(...exerciseSets.map(s =>
          (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)
        ))

        // Bestehende PRs holen
        const { data: existingPRs } = await supabase
          .from('personal_records')
          .select('*')
          .eq('hunter_id', hunterId)
          .eq('exercise_id', exerciseId)

        const prMap = {}
        for (const pr of existingPRs || []) {
          prMap[pr.record_type] = pr
        }

        // Max Gewicht PR prüfen
        if (maxWeight > 0) {
          if (!prMap['max_weight'] || maxWeight > prMap['max_weight'].value) {
            await supabase.from('personal_records').upsert({
              hunter_id: hunterId,
              exercise_id: exerciseId,
              record_type: 'max_weight',
              value: maxWeight,
              achieved_at: new Date()
            }, { onConflict: 'hunter_id,exercise_id,record_type' })

            if (prMap['max_weight']) {
              newPRs.push({
                exercise: exercise?.name || 'Übung',
                type: 'Gewicht',
                value: `${maxWeight}kg`,
                old: `${prMap['max_weight'].value}kg`
              })
            }
          }
        }

        // Max Reps PR prüfen
        if (maxReps > 0) {
          if (!prMap['max_reps'] || maxReps > prMap['max_reps'].value) {
            await supabase.from('personal_records').upsert({
              hunter_id: hunterId,
              exercise_id: exerciseId,
              record_type: 'max_reps',
              value: maxReps,
              achieved_at: new Date()
            }, { onConflict: 'hunter_id,exercise_id,record_type' })

            if (prMap['max_reps']) {
              newPRs.push({
                exercise: exercise?.name || 'Übung',
                type: 'Wiederholungen',
                value: `${maxReps} Reps`,
                old: `${prMap['max_reps'].value} Reps`
              })
            }
          }
        }

        // Max Volumen PR prüfen
        if (maxVolume > 0) {
          if (!prMap['max_volume'] || maxVolume > prMap['max_volume'].value) {
            await supabase.from('personal_records').upsert({
              hunter_id: hunterId,
              exercise_id: exerciseId,
              record_type: 'max_volume',
              value: maxVolume,
              achieved_at: new Date()
            }, { onConflict: 'hunter_id,exercise_id,record_type' })
          }
        }
      }

      return newPRs

    } catch (error) {
      console.log('PR check error:', error)
      return []
    }
  }
  async function updateSkillPoints(hunterId) {
    const skillDeltas = {
      str_points: 0,
      agi_points: 0,
      vit_points: 0,
      int_training_points: 0,
    }

    for (const exercise of selectedExercises) {
      const sets = exercise.sets.filter(s => s.reps).length
      switch (exercise.skill_type) {
        case 'STR': skillDeltas.str_points += sets * 2; break
        case 'AGI': skillDeltas.agi_points += sets * 2; break
        case 'VIT': skillDeltas.vit_points += sets * 2; break
        case 'INT_T': skillDeltas.int_training_points += sets * 2; break
      }
    }

    const { data: currentSkills } = await supabase
      .from('hunter_skills')
      .select('*')
      .eq('hunter_id', hunterId)
      .single()

    if (!currentSkills) return

    const updated = {
      str_points: (currentSkills.str_points || 0) + skillDeltas.str_points,
      agi_points: (currentSkills.agi_points || 0) + skillDeltas.agi_points,
      vit_points: (currentSkills.vit_points || 0) + skillDeltas.vit_points,
      int_training_points: (currentSkills.int_training_points || 0) + skillDeltas.int_training_points,
    }

    const dominant = Object.entries(updated).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0].replace('_points', '').toUpperCase()

    await supabase
      .from('hunter_skills')
      .update({ ...updated, dominant_skill: dominant, updated_at: new Date() })
      .eq('hunter_id', hunterId)
  }

  async function updateQuestProgress(hunterId, duration, completedSets) {
    try {
      const { data: activeQuests } = await supabase
        .from('hunter_quests')
        .select('*, quests(*)')
        .eq('hunter_id', hunterId)
        .eq('status', 'active')

      if (!activeQuests || activeQuests.length === 0) return

      // completedSets mit Exercise-Daten anreichern
      const currentSets = (completedSets || []).map(s => {
        const exercise = allExercises.find(e => e.id === s.exercise_id)
        return {
          exercise_id: s.exercise_id,
          exercise_name: exercise?.name || '',
          muscle_group: exercise?.muscle_group || '',
          skill_type: exercise?.skill_type || '',
          reps: parseInt(s.reps) || 0,
          weight_kg: parseFloat(s.weight) || 0,
        }
      })

      console.log('Quest Update — Sets:', currentSets.length, 'Duration:', duration)

      const totalReps = currentSets.reduce((sum, s) => sum + s.reps, 0)
      const totalSets = currentSets.length
      const totalWeight = currentSets.reduce((sum, s) => sum + (s.reps * s.weight_kg), 0)

      for (const hq of activeQuests) {
        const quest = hq.quests
        let progressGain = 0

        switch (quest.requirement_type) {
          case 'workouts_count':
            progressGain = 1
            break

          case 'muscle_group':
            const muscleGroups = [...new Set(currentSets.map(s => s.muscle_group))]
            if (muscleGroups.includes(quest.requirement_detail)) {
              progressGain = 1
            }
            break

          case 'exercise_specific':
            progressGain = currentSets
              .filter(s => s.exercise_name === quest.requirement_detail)
              .reduce((sum, s) => sum + s.reps, 0)
            break

          case 'total_reps':
            progressGain = totalReps
            break

          case 'total_sets':
            progressGain = totalSets
            break

          case 'skill_type':
            progressGain = currentSets
              .filter(s => s.skill_type === quest.requirement_detail).length
            break

          case 'duration_minutes':
            progressGain = duration
            break

          case 'total_weight':
            progressGain = Math.floor(totalWeight)
            break

          default:
            progressGain = 1
        }

        if (progressGain === 0) continue

        const newProgress = (hq.progress || 0) + progressGain
        const completed = newProgress >= quest.requirement_value

        await supabase
          .from('hunter_quests')
          .update({
            progress: newProgress,
            status: completed ? 'completed' : 'active',
            completed_at: completed ? new Date() : null
          })
          .eq('id', hq.id)

        // Quest Abschluss Modal triggern
        setQuestQueue(prev => [...prev, hq.quests])
        if (completed) {
          await supabase.from('xp_events').insert({
            hunter_id: hunterId,
            source_type: 'quest',
            source_id: hq.quest_id,
            xp_amount: quest.xp_reward,
          })

          await supabase
            .from('hunters')
            .update({ total_xp: (hunter?.total_xp || 0) + quest.xp_reward })
            .eq('id', hunterId)
        }
      }
    } catch (error) {
      console.log('Quest progress error:', error)
    }
  }

  const rankColor = RANK_COLORS[hunter?.rank] || '#888888'

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>WORKOUT</Text>
        <TouchableOpacity onPress={() => setShowInfo(true)}>
          <Text style={styles.infoIcon}>ℹ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={async () => {
            const allSets = selectedExercises.flatMap(e =>
              e.sets
                .filter(s => s.reps)
                .map(s => ({
                  exercise_id: e.id,
                  reps: s.reps,
                  weight: s.weight,
                }))
            )
            if (allSets.length === 0) return
            const duration = Math.floor((new Date() - startTime) / 60000)
            setSaving(true)
            await scheduleXP(allSets, workoutTitle || 'Workout', duration)
            setSaving(false)
          }}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#ffffff" size="small" />
            : <Text style={[styles.saveText, { color: rankColor }]}>BEENDEN</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Trainingspläne Button */}
      <TouchableOpacity
        style={styles.plansButton}
        onPress={() => navigation.getParent('MainStack')?.navigate('TrainingPlans')}
      >
        <Text style={styles.plansButtonText}>📋 TRAININGSPLÄNE</Text>
      </TouchableOpacity>

      <ScrollView style={styles.content}>

        {/* Workout Titel */}
        <TextInput
          style={styles.titleInput}
          placeholder="Workout Name (optional)"
          placeholderTextColor="#333"
          value={workoutTitle}
          onChangeText={setWorkoutTitle}
        />

        {/* Ausgewählte Übungen */}
        {selectedExercises.map((exercise, exerciseIndex) => (
          <View key={exercise.id} style={styles.exerciseCard}>

            <View style={styles.exerciseHeader}>
              <View>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseMuscle}>{exercise.muscle_group}</Text>
              </View>
              <TouchableOpacity onPress={() => removeExercise(exerciseIndex)}>
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>

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

        {/* Übung hinzufügen */}
        <TouchableOpacity
          style={[styles.addExerciseButton, { borderColor: rankColor }]}
          onPress={() => setShowExerciseModal(true)}
        >
          <Text style={[styles.addExerciseText, { color: rankColor }]}>
            + ÜBUNG HINZUFÜGEN
          </Text>
        </TouchableOpacity>

        {/* XP Preview */}
        {selectedExercises.length > 0 && (
          <View style={styles.xpPreview}>
            <Text style={styles.xpPreviewText}>
              Geschätzte XP:{' '}
              <Text style={{ color: rankColor }}>{calculateXP()} XP</Text>
            </Text>
          </View>
        )}

        {/* Verlauf */}
        {recentWorkouts.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historySectionTitle}>LETZTER VERLAUF</Text>
            {recentWorkouts.map((workout) => (
              <View key={workout.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyTitle}>{workout.title}</Text>
                  <Text style={[styles.historyXp, { color: rankColor }]}>
                    +{workout.xp_earned} XP
                  </Text>
                </View>
                <Text style={styles.historyDate}>
                  {new Date(workout.completed_at).toLocaleDateString('de-DE')}
                  {' · '}{workout.duration_minutes} min
                </Text>
                {workout.workout_sets?.slice(0, 3).map((set, i) => (
                  <Text key={i} style={styles.historySet}>
                    · {set.exercises?.name} — {set.weight_kg}kg × {set.reps}
                  </Text>
                ))}
                {workout.workout_sets?.length > 3 && (
                  <Text style={styles.historyMore}>
                    +{workout.workout_sets.length - 3} weitere Sets...
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />

      </ScrollView>

      {/* Übungs Modal */}
      <Modal
        visible={showExerciseModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ÜBUNG WÄHLEN</Text>
              <TouchableOpacity onPress={() => {
                setShowExerciseModal(false)
                setSearchQuery('')
              }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Übung suchen..."
              placeholderTextColor="#333"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />

            {loading ? (
              <ActivityIndicator color="#ffffff" style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={filteredExercises}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.exerciseItem}
                    onPress={() => addExercise(item)}
                  >
                    <View>
                      <Text style={styles.exerciseItemName}>{item.name}</Text>
                      <Text style={styles.exerciseItemMuscle}>
                        {item.muscle_group} · {item.skill_type}
                      </Text>
                    </View>
                    <Text style={styles.exerciseItemAdd}>+</Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}

          </View>
        </View>
      </Modal>
      {/* PR Modal */}
      <PRModal
        visible={showPRModal}
        prs={newPRs}
        rank={hunter?.rank}
        onClose={() => setShowPRModal(false)}
      />
      
      {/* Quest Complete Modal */}
      <QuestCompleteModal
        visible={showQuestModal}
        quest={completedQuest}
        rank={hunter?.rank}
        onClose={() => {
          const remaining = questQueue.slice(1)
          setQuestQueue(remaining)
          if (remaining.length > 0) {
            setCompletedQuest(remaining[0])
          } else {
            setShowQuestModal(false)
            setCompletedQuest(null)
          }
        }}
      />
      <InfoModal
        visible={showInfo}
        title="WORKOUT"
        content={
          "Logge dein Training und verdiene XP.\n\n" +
          "• Übung hinzufügen — Suche aus 300+ Übungen\n" +
          "• Sets & Reps — Trage Gewicht und Wiederholungen ein\n" +
          "• BEENDEN — Schließt das Workout ab\n" +
          "• XP werden nach 5 Minuten gutgeschrieben\n\n" +
          "Tipp: Nutze Trainingspläne um deine Lieblingsübungen zu speichern."
        }
        onClose={() => setShowInfo(false)}
      />
      {/* Rank Up Modal */}
      <RankUpModal
        visible={showModal}
        rank={modalData.rank}
        xp={modalData.xp}
        duration={modalData.duration}
        isRankUp={modalData.isRankUp}
        onClose={() => {
          setShowModal(false)
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
    paddingBottom: 12,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  saveText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  plansButton: {
    marginHorizontal: 24,
    marginBottom: 12,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
  },
  plansButtonText: {
    color: '#444',
    fontSize: 11,
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  titleInput: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 4,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 24,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  removeText: {
    color: '#333',
    fontSize: 16,
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
  addExerciseButton: {
    borderWidth: 1,
    borderRadius: 4,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  addExerciseText: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  xpPreview: {
    alignItems: 'center',
    padding: 16,
  },
  xpPreviewText: {
    color: '#333',
    fontSize: 13,
    letterSpacing: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f0f0f',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 24,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  modalClose: {
    color: '#444',
    fontSize: 18,
  },
  searchInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 4,
    padding: 12,
    color: '#ffffff',
    marginHorizontal: 24,
    marginBottom: 16,
    fontSize: 15,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  exerciseItemName: {
    color: '#ffffff',
    fontSize: 15,
    letterSpacing: 1,
  },
  exerciseItemMuscle: {
    color: '#444',
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 2,
  },
  exerciseItemAdd: {
    color: '#444',
    fontSize: 24,
  },
  separator: {
    height: 1,
    backgroundColor: '#111',
    marginHorizontal: 24,
  },
  historySection: {
    marginTop: 24,
    marginBottom: 24,
  },
  historySectionTitle: {
    color: '#333',
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 12,
  },
  historyCard: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  historyXp: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  historyDate: {
    color: '#333',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
  },
  historySet: {
    color: '#444',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 2,
  },
  historyMore: {
    color: '#333',
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 4,
  },
  infoIcon: {
    color: '#333',
    fontSize: 18,
  },
})