import { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import InfoModal from '../components/InfoModal'

const RANK_COLORS = {
  E: '#888888',
  D: '#4a90d9',
  C: '#2ecc71',
  B: '#9b59b6',
  A: '#f1c40f',
  S: '#8b00ff',
}

export default function QuestScreen({ navigation }) {
  const [hunter, setHunter] = useState(null)
  const [quests, setQuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInfo, setShowInfo] = useState(false)
  useFocusEffect(
    useCallback(() => {
      fetchData()
    }, [])
  )

  async function fetchData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const [hunterRes, questsRes] = await Promise.all([
      supabase
        .from('hunters')
        .select('*')
        .eq('id', user.id)
        .single(),
      supabase
        .from('hunter_quests')
        .select('*, quests(*)')
        .eq('hunter_id', user.id)
        .order('assigned_at', { ascending: false })
    ])

    setHunter(hunterRes.data)
    setQuests(questsRes.data || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Quests werden geladen...</Text>
      </View>
    )
  }

  const rankColor = RANK_COLORS[hunter?.rank] || '#888888'
  const activeQuests = quests.filter(q => q.status === 'active')
  const completedQuests = quests.filter(q => q.status === 'completed')

  return (
    <ScrollView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>QUESTS</Text>
        <TouchableOpacity onPress={() => setShowInfo(true)}>
          <Text style={styles.infoIcon}>ℹ</Text>
        </TouchableOpacity>
      </View>

      {/* System Nachricht */}
      <View style={styles.systemMessage}>
        <Text style={styles.systemText}>
          "Jede Quest ist eine Prüfung.{'\n'}
          Jede abgeschlossene Quest bringt dich näher."
        </Text>
      </View>

      {/* Aktive Quests */}
      <Text style={styles.sectionTitle}>AKTIVE QUESTS</Text>

      {activeQuests.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Keine aktiven Quests.{'\n'}
            Das System beobachtet dich.
          </Text>
        </View>
      ) : (
        activeQuests.map((hq) => (
          <View
            key={hq.id}
            style={[styles.questCard, { borderLeftColor: rankColor }]}
          >
            {/* Quest Header */}
            <View style={styles.questHeader}>
              <Text style={styles.questTitle}>{hq.quests.title}</Text>
              <View style={[styles.xpBadge, { backgroundColor: rankColor + '22' }]}>
                <Text style={[styles.xpBadgeText, { color: rankColor }]}>
                  +{hq.quests.xp_reward} XP
                </Text>
              </View>
            </View>

            {/* Quest Beschreibung */}
            <Text style={styles.questDescription}>
              {hq.quests.description}
            </Text>

            {/* Fortschritt */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        (hq.progress / hq.quests.requirement_value) * 100,
                        100
                      )}%`,
                      backgroundColor: rankColor,
                    }
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {hq.progress} / {hq.quests.requirement_value}
              </Text>
            </View>

            {/* Quest Type Badge */}
            <Text style={styles.questType}>
              {hq.quests.type === 'weekly' ? '📅 WÖCHENTLICH' : '⚠ NOTFALL'}
            </Text>

          </View>
        ))
      )}

      {/* Abgeschlossene Quests */}
      {completedQuests.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            ABGESCHLOSSEN
          </Text>
          {completedQuests.map((hq) => (
            <View key={hq.id} style={styles.completedCard}>
              <View style={styles.questHeader}>
                <Text style={styles.completedTitle}>{hq.quests.title}</Text>
                <Text style={styles.completedCheck}>✓</Text>
              </View>
              <Text style={styles.completedXp}>+{hq.quests.xp_reward} XP</Text>
            </View>
          ))}
        </>
      )}

      <View style={{ height: 100 }} />

      <InfoModal
        visible={showInfo}
        title="QUESTS"
        content={
          "Quests sind wöchentliche Aufgaben die XP belohnen.\n\n" +
          "• Wöchentliche Quests — Jeden Montag neue Aufgaben\n" +
          "• Notfall Quests — Nach 5 Tagen Inaktivität\n" +
          "• Fortschritt — Wird automatisch beim Training getrackt\n\n" +
          "Höhere Ränge erhalten mehr und schwierigere Quests mit höheren XP Belohnungen."
        }
        onClose={() => setShowInfo(false)}
      />

    </ScrollView>
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
  systemMessage: {
    marginHorizontal: 24,
    marginBottom: 32,
    padding: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#222',
  },
  systemText: {
    color: '#333',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
    letterSpacing: 1,
  },
  sectionTitle: {
    color: '#333',
    fontSize: 11,
    letterSpacing: 3,
    marginHorizontal: 24,
    marginBottom: 12,
  },
  emptyCard: {
    marginHorizontal: 24,
    padding: 24,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyText: {
    color: '#333',
    fontSize: 13,
    letterSpacing: 1,
    textAlign: 'center',
    lineHeight: 20,
  },
  questCard: {
    marginHorizontal: 24,
    marginBottom: 12,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: 16,
  },
  questHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  questTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    flex: 1,
  },
  xpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  xpBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  questDescription: {
    color: '#444',
    fontSize: 13,
    letterSpacing: 1,
    lineHeight: 18,
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    color: '#444',
    fontSize: 11,
    letterSpacing: 1,
    width: 40,
    textAlign: 'right',
  },
  questType: {
    color: '#333',
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 4,
  },
  completedCard: {
    marginHorizontal: 24,
    marginBottom: 8,
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: '#111',
    borderRadius: 8,
    padding: 16,
  },
  completedTitle: {
    color: '#333',
    fontSize: 14,
    letterSpacing: 1,
    flex: 1,
  },
  completedCheck: {
    color: '#2ecc71',
    fontSize: 16,
  },
  completedXp: {
    color: '#222',
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 4,
  },
  infoIcon: {
    color: '#333',
    fontSize: 18,
  },
})