import { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'

const RANK_COLORS = {
  E: '#888888',
  D: '#4a90d9',
  C: '#2ecc71',
  B: '#9b59b6',
  A: '#f1c40f',
  S: '#8b00ff',
}

export default function TrainingPlanDetailScreen({ navigation, route }) {
  const { plan } = route.params
  const [hunter, setHunter] = useState(null)
  const [planExercises, setPlanExercises] = useState([])
  const [allExercises, setAllExercises] = useState([])
  const [filteredExercises, setFilteredExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useFocusEffect(
    useCallback(() => {
      fetchData()
    }, [])
  )

  async function fetchData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const [hunterRes, planRes, exercisesRes] = await Promise.all([
      supabase.from('hunters').select('*').eq('id', user.id).single(),
      supabase
        .from('training_plan_exercises')
        .select('*, exercises(*)')
        .eq('plan_id', plan.id)
        .order('order_index'),
      supabase.from('exercises').select('*').order('muscle_group'),
    ])

    setHunter(hunterRes.data)
    setPlanExercises(planRes.data || [])
    setAllExercises(exercisesRes.data || [])
    setFilteredExercises(exercisesRes.data || [])
    setLoading(false)
  }

  function filterExercises(query) {
    setSearchQuery(query)
    if (query.trim() === '') {
      setFilteredExercises(allExercises)
    } else {
      setFilteredExercises(allExercises.filter(ex =>
        ex.name.toLowerCase().includes(query.toLowerCase()) ||
        ex.muscle_group.toLowerCase().includes(query.toLowerCase())
      ))
    }
  }

  async function addExercise(exercise) {
    const alreadyAdded = planExercises.find(e => e.exercise_id === exercise.id)
    if (alreadyAdded) return

    await supabase
      .from('training_plan_exercises')
      .insert({
        plan_id: plan.id,
        exercise_id: exercise.id,
        order_index: planExercises.length,
      })

    setShowAddModal(false)
    setSearchQuery('')
    fetchData()
  }

  async function removeExercise(planExerciseId) {
    await supabase
      .from('training_plan_exercises')
      .delete()
      .eq('id', planExerciseId)
    fetchData()
  }

  async function startWorkout() {
    navigation.getParent('MainStack')?.navigate('WorkoutFromPlan', {
      plan,
      planExercises
    })
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Plan wird geladen...</Text>
      </View>
    )
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
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Text style={[styles.addText, { color: rankColor }]}>+ ÜBUNG</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>

        {/* Plan Info */}
        {plan.description ? (
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionText}>{plan.description}</Text>
          </View>
        ) : null}

        {/* Start Button */}
        {planExercises.length > 0 && (
          <TouchableOpacity
            style={[styles.startButton, { borderColor: rankColor }]}
            onPress={startWorkout}
          >
            <Text style={[styles.startButtonText, { color: rankColor }]}>
              ⚔ WORKOUT STARTEN
            </Text>
            <Text style={styles.startButtonSub}>
              {planExercises.length} Übungen · {plan.use_count}x absolviert
            </Text>
          </TouchableOpacity>
        )}

        {/* Übungen Liste */}
        <Text style={styles.sectionTitle}>ÜBUNGEN</Text>

        {planExercises.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Noch keine Übungen.{'\n'}
              Tippe auf "+ ÜBUNG" um Übungen hinzuzufügen.
            </Text>
          </View>
        ) : (
          planExercises.map((pe, index) => (
            <View key={pe.id} style={styles.exerciseCard}>
              <View style={styles.exerciseLeft}>
                <Text style={styles.exerciseNumber}>{index + 1}</Text>
                <View>
                  <Text style={styles.exerciseName}>{pe.exercises?.name}</Text>
                  <Text style={styles.exerciseMuscle}>{pe.exercises?.muscle_group}</Text>
                  {pe.last_weight_kg || pe.last_reps ? (
                    <Text style={[styles.exerciseLast, { color: rankColor }]}>
                      Letztes Mal:
                      {pe.last_weight_kg ? ` ${pe.last_weight_kg}kg` : ''}
                      {pe.last_sets ? ` · ${pe.last_sets} Sets` : ''}
                      {pe.last_reps ? ` · ${pe.last_reps} Reps` : ''}
                    </Text>
                  ) : null}
                </View>
              </View>
              <TouchableOpacity onPress={() => removeExercise(pe.id)}>
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />

      </ScrollView>

      {/* Add Exercise Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ÜBUNG HINZUFÜGEN</Text>
              <TouchableOpacity onPress={() => {
                setShowAddModal(false)
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
              onChangeText={filterExercises}
              autoFocus
            />

            <FlatList
              data={filteredExercises}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const alreadyAdded = planExercises.find(e => e.exercise_id === item.id)
                return (
                  <TouchableOpacity
                    style={[
                      styles.exerciseItem,
                      alreadyAdded && styles.exerciseItemAdded
                    ]}
                    onPress={() => !alreadyAdded && addExercise(item)}
                  >
                    <View>
                      <Text style={[
                        styles.exerciseItemName,
                        alreadyAdded && { color: '#333' }
                      ]}>
                        {item.name}
                      </Text>
                      <Text style={styles.exerciseItemMuscle}>
                        {item.muscle_group} · {item.skill_type}
                      </Text>
                    </View>
                    <Text style={[
                      styles.exerciseItemAdd,
                      alreadyAdded && { color: '#222' }
                    ]}>
                      {alreadyAdded ? '✓' : '+'}
                    </Text>
                  </TouchableOpacity>
                )
              }}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />

          </View>
        </View>
      </Modal>

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#444',
    marginTop: 16,
    letterSpacing: 2,
    fontSize: 12,
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
  addText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  descriptionCard: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  descriptionText: {
    color: '#444',
    fontSize: 13,
    letterSpacing: 1,
    lineHeight: 18,
  },
  startButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginBottom: 4,
  },
  startButtonSub: {
    color: '#333',
    fontSize: 11,
    letterSpacing: 1,
  },
  sectionTitle: {
    color: '#333',
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#333',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 1,
  },
  exerciseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  exerciseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exerciseNumber: {
    color: '#333',
    fontSize: 20,
    fontWeight: 'bold',
    width: 32,
  },
  exerciseName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  exerciseMuscle: {
    color: '#444',
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 2,
  },
  exerciseLast: {
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 4,
  },
  removeText: {
    color: '#333',
    fontSize: 16,
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
  exerciseItemAdded: {
    opacity: 0.4,
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
})