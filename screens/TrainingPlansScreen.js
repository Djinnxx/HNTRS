import { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
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

export default function TrainingPlansScreen({ navigation }) {
  const [plans, setPlans] = useState([])
  const [hunter, setHunter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPlanTitle, setNewPlanTitle] = useState('')
  const [newPlanDescription, setNewPlanDescription] = useState('')
  const [creating, setCreating] = useState(false)

  useFocusEffect(
    useCallback(() => {
      fetchData()
    }, [])
  )

  async function fetchData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const [hunterRes, plansRes] = await Promise.all([
      supabase.from('hunters').select('*').eq('id', user.id).single(),
      supabase
        .from('training_plans')
        .select(`
          *,
          training_plan_exercises (
            *,
            exercises (name, muscle_group)
          )
        `)
        .eq('hunter_id', user.id)
        .order('last_used_at', { ascending: false, nullsFirst: false })
    ])

    setHunter(hunterRes.data)
    setPlans(plansRes.data || [])
    setLoading(false)
  }

  async function createPlan() {
    if (!newPlanTitle.trim()) return
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: plan } = await supabase
      .from('training_plans')
      .insert({
        hunter_id: user.id,
        title: newPlanTitle.trim(),
        description: newPlanDescription.trim() || null,
      })
      .select()
      .single()

    setCreating(false)
    setShowCreateModal(false)
    setNewPlanTitle('')
    setNewPlanDescription('')

    if (plan) {
      navigation.navigate('TrainingPlanDetail', { plan })
    }
  }

  async function deletePlan(planId) {
    Alert.alert(
      'Plan löschen',
      'Möchtest du diesen Trainingsplan wirklich löschen?',
      [
        { text: 'ABBRECHEN', style: 'cancel' },
        {
          text: 'LÖSCHEN',
          style: 'destructive',
          onPress: async () => {
            await supabase
              .from('training_plans')
              .delete()
              .eq('id', planId)
            fetchData()
          }
        }
      ]
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Trainingspläne werden geladen...</Text>
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
        <Text style={styles.headerTitle}>TRAININGSPLÄNE</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)}>
          <Text style={[styles.createText, { color: rankColor }]}>+ NEU</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>

        {plans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>KEINE PLÄNE</Text>
            <Text style={styles.emptyText}>
              "Erstelle deinen ersten Trainingsplan{'\n'}
              und tracke deinen Fortschritt."
            </Text>
            <TouchableOpacity
              style={[styles.createButton, { borderColor: rankColor }]}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={[styles.createButtonText, { color: rankColor }]}>
                + PLAN ERSTELLEN
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={styles.planCard}
              onPress={() => navigation.navigate('TrainingPlanDetail', { plan })}
              onLongPress={() => deletePlan(plan.id)}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planTitle}>{plan.title}</Text>
                <View style={[styles.useBadge, { backgroundColor: rankColor + '22' }]}>
                  <Text style={[styles.useBadgeText, { color: rankColor }]}>
                    {plan.use_count}x
                  </Text>
                </View>
              </View>

              {plan.description ? (
                <Text style={styles.planDescription}>{plan.description}</Text>
              ) : null}

              <Text style={styles.planExercises}>
                {plan.training_plan_exercises?.length || 0} Übungen
              </Text>

              {plan.training_plan_exercises?.slice(0, 3).map((ex) => (
                <Text key={ex.id} style={styles.exercisePreview}>
                  · {ex.exercises?.name}
                  {ex.last_weight_kg ? ` — ${ex.last_weight_kg}kg` : ''}
                  {ex.last_reps ? ` × ${ex.last_reps}` : ''}
                </Text>
              ))}

              {plan.training_plan_exercises?.length > 3 && (
                <Text style={styles.moreExercises}>
                  +{plan.training_plan_exercises.length - 3} weitere...
                </Text>
              )}

              <Text style={styles.planHint}>Lang drücken zum Löschen</Text>

            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 100 }} />

      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>NEUER TRAININGSPLAN</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Plan Name"
              placeholderTextColor="#333"
              value={newPlanTitle}
              onChangeText={setNewPlanTitle}
              autoFocus
            />

            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Beschreibung (optional)"
              placeholderTextColor="#333"
              value={newPlanDescription}
              onChangeText={setNewPlanDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setShowCreateModal(false)
                  setNewPlanTitle('')
                  setNewPlanDescription('')
                }}
              >
                <Text style={styles.modalCancelText}>ABBRECHEN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: rankColor }]}
                onPress={createPlan}
                disabled={creating}
              >
                {creating
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.modalConfirmText}>ERSTELLEN</Text>
                }
              </TouchableOpacity>
            </View>

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
  },
  createText: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  emptyCard: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
    marginTop: 16,
  },
  emptyTitle: {
    color: '#333',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginBottom: 12,
  },
  emptyText: {
    color: '#333',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 1,
    marginBottom: 24,
  },
  createButton: {
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  createButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  planCard: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    marginTop: 4,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
    flex: 1,
  },
  useBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  useBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  planDescription: {
    color: '#444',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 8,
  },
  planExercises: {
    color: '#333',
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 8,
  },
  exercisePreview: {
    color: '#444',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 2,
  },
  moreExercises: {
    color: '#333',
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 4,
  },
  planHint: {
    color: '#222',
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 8,
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalContainer: {
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 8,
    padding: 24,
    width: '100%',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 4,
    padding: 14,
    color: '#ffffff',
    fontSize: 15,
    letterSpacing: 1,
    marginBottom: 12,
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  modalCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 4,
    padding: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#444',
    fontSize: 12,
    letterSpacing: 2,
  },
  modalConfirm: {
    flex: 1,
    borderRadius: 4,
    padding: 14,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
})