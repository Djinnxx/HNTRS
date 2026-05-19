import { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import { checkInactivityAndNotify } from '../lib/notifications'
import InfoModal from '../components/InfoModal'

const RANK_COLORS = {
  E: '#888888',
  D: '#4a90d9',
  C: '#2ecc71',
  B: '#9b59b6',
  A: '#f1c40f',
  S: '#8b00ff',
}

function xpForLevel(level) {
  if (level <= 50) {
    return Math.floor(100 * Math.pow(1.12, level))
  }
  return 50000
}

function getLevelMultiplier(level) {
  if (level <= 20) return 1.0
  if (level <= 40) return 1.5
  if (level <= 60) return 2.0
  if (level <= 80) return 3.0
  if (level <= 100) return 4.0
  return 5.0
}

export default function HomeScreen({ navigation }) {
  const [hunter, setHunter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  useFocusEffect(
    useCallback(() => {
      fetchHunter()
    }, [])
  )

  async function fetchHunter() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('hunters')
      .select('*')
      .eq('id', user.id)
      .single()
    setHunter(data)
    setLoading(false)

    // Inaktivität prüfen
    await checkInactivityAndNotify(user.id)

    // Willkommens-Modal einmal pro Tag
    const today = new Date().toDateString()
    const lastSeen = await AsyncStorage.getItem('lastSeen_' + user.id)
    if (lastSeen !== today) {
      await AsyncStorage.setItem('lastSeen_' + user.id, today)
      setShowWelcome(true)
      setTimeout(() => setShowWelcome(false), 3000)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>System wird geladen...</Text>
      </View>
    )
  }

  const rankColor = RANK_COLORS[hunter?.rank] || '#888888'
  const level = hunter?.level || 1
  const currentLevelXP = hunter?.current_level_xp || 0
  const xpNeeded = xpForLevel(level)
  const xpProgress = Math.min((currentLevelXP / xpNeeded) * 100, 100)
  const multiplier = getLevelMultiplier(level)

  return (
    <ScrollView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>HNTRS</Text>
        <TouchableOpacity onPress={() => setShowInfo(true)}>
          <Text style={styles.infoIcon}>ℹ</Text>
        </TouchableOpacity>
      </View>

      {/* Hunter Card */}
      <View style={[styles.hunterCard, { borderColor: rankColor }]}>

        {/* Rang & Level */}
        <View style={styles.rankRow}>
          <View style={[styles.rankBadge, { backgroundColor: rankColor }]}>
            <Text style={styles.rankText}>{hunter?.rank}</Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>LVL {level}</Text>
          </View>
        </View>

        {/* Hunter Name */}
        <Text style={styles.hunterName}>{hunter?.username}</Text>
        <Text style={styles.hunterSubtitle}>Registered Hunter</Text>

        {/* XP Leiste */}
        <View style={styles.xpBarContainer}>
          <View style={styles.xpBarLabels}>
            <Text style={styles.xpBarLabel}>XP</Text>
            <Text style={styles.xpBarLabel}>
              {currentLevelXP} / {xpNeeded}
            </Text>
          </View>
          <View style={styles.xpBarBackground}>
            <View
              style={[
                styles.xpBarFill,
                {
                  width: `${xpProgress}%`,
                  backgroundColor: rankColor,
                }
              ]}
            />
          </View>
          <Text style={styles.xpMultiplier}>
            Quest Multiplikator: ×{multiplier}
          </Text>
        </View>

        {/* Total XP */}
        <View style={styles.xpContainer}>
          <Text style={styles.xpLabel}>TOTAL XP</Text>
          <Text style={[styles.xpValue, { color: rankColor }]}>
            {hunter?.total_xp || 0}
          </Text>
        </View>

      </View>

      {/* System Nachricht */}
      <View style={styles.systemMessage}>
        <Text style={styles.systemText}>
          "Das System hat dich registriert, Hunter.{'\n'}
          Deine Reise beginnt jetzt."
        </Text>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>AKTIONEN</Text>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('Workout')}
      >
        <Text style={styles.actionButtonText}>⚔ WORKOUT STARTEN</Text>
        <Text style={styles.actionButtonSub}>Verdiene XP</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('Quests')}
      >
        <Text style={styles.actionButtonText}>📋 QUESTS</Text>
        <Text style={styles.actionButtonSub}>Wöchentliche Aufgaben</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('Stats')}
      >
        <Text style={styles.actionButtonText}>📊 STATISTIKEN</Text>
        <Text style={styles.actionButtonSub}>Dein Fortschritt</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.getParent('MainStack')?.navigate('Ranking')}
      >
        <Text style={styles.actionButtonText}>🌐 RANKING</Text>
        <Text style={styles.actionButtonSub}>Globale Hunter</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />

      {/* Willkommens Modal */}
      <Modal visible={showWelcome} transparent animationType="fade">
        <View style={styles.welcomeOverlay}>
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeSystem}>— SYSTEM —</Text>
            <Text style={styles.welcomeTitle}>WILLKOMMEN ZURÜCK</Text>
            <Text style={[styles.welcomeName, { color: rankColor }]}>
              {hunter?.username}
            </Text>
            <Text style={styles.welcomeRank}>
              LVL {level} · {hunter?.rank}-RANG HUNTER
            </Text>
          </View>
        </View>
      </Modal>

      <InfoModal
        visible={showInfo}
        title="HOME"
        content={
          "Der Home Screen zeigt deinen aktuellen Status als Hunter.\n\n" +
          "• Rang & Level — Dein aktueller Fortschritt\n" +
          "• XP Leiste — Fortschritt zum nächsten Level\n" +
          "• Quest Multiplikator — Steigt mit deinem Level\n" +
          "• Aktionen — Schnellzugriff auf alle Features\n\n" +
          "Trainiere regelmäßig um XP zu verdienen und Level aufzusteigen."
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
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 24,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 6,
  },
  hunterCard: {
    marginHorizontal: 24,
    borderWidth: 1,
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#111',
    marginBottom: 16,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  rankBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 20,
  },
  levelBadge: {
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  levelText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  hunterName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginBottom: 4,
  },
  hunterSubtitle: {
    color: '#444',
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 20,
  },
  xpBarContainer: {
    width: '100%',
    marginBottom: 20,
  },
  xpBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  xpBarLabel: {
    color: '#444',
    fontSize: 10,
    letterSpacing: 2,
  },
  xpBarBackground: {
    height: 4,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  xpMultiplier: {
    color: '#333',
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 6,
    textAlign: 'right',
  },
  xpContainer: {
    alignItems: 'center',
  },
  xpLabel: {
    color: '#444',
    fontSize: 10,
    letterSpacing: 3,
    marginBottom: 4,
  },
  xpValue: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 2,
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
  actionButton: {
    marginHorizontal: 24,
    marginBottom: 8,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 4,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    letterSpacing: 2,
    fontWeight: 'bold',
  },
  actionButtonSub: {
    color: '#333',
    fontSize: 11,
    letterSpacing: 1,
  },
  welcomeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeContainer: {
    alignItems: 'center',
    padding: 32,
  },
  welcomeSystem: {
    color: '#333',
    fontSize: 10,
    letterSpacing: 4,
    marginBottom: 16,
  },
  welcomeTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 6,
    marginBottom: 16,
    textAlign: 'center',
  },
  welcomeName: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginBottom: 8,
  },
  welcomeRank: {
    color: '#333',
    fontSize: 12,
    letterSpacing: 4,
  },
  infoIcon: {
    color: '#333',
    fontSize: 18,
    letterSpacing: 1,
  },
})