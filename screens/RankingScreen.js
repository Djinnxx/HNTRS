import { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import * as Location from 'expo-location'
import { supabase } from '../lib/supabase'

const RANK_COLORS = {
  E: '#888888',
  D: '#4a90d9',
  C: '#2ecc71',
  B: '#9b59b6',
  A: '#f1c40f',
  S: '#8b00ff',
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function RankingScreen({ navigation }) {
  const [globalRanking, setGlobalRanking] = useState([])
  const [localRanking, setLocalRanking] = useState([])
  const [currentHunter, setCurrentHunter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('global')
  const [locationError, setLocationError] = useState(false)

  useFocusEffect(
    useCallback(() => {
      fetchRankings()
    }, [])
  )

  async function fetchRankings() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    // Aktuellen Hunter holen
    const { data: hunter } = await supabase
      .from('hunters')
      .select('*')
      .eq('id', user.id)
      .single()
    setCurrentHunter(hunter)

    // Globales Ranking — nur öffentliche Hunter
    const { data: allHunters } = await supabase
      .from('hunters')
      .select(`
        id,
        username,
        rank,
        total_xp,
        avatar_url,
        hunter_privacy_settings (
          show_in_leaderboard,
          show_rank,
          show_profile
        )
      `)
      .order('total_xp', { ascending: false })

    // Nur Hunter die im Leaderboard sichtbar sein wollen
    const publicHunters = allHunters?.filter(h =>
      h.hunter_privacy_settings?.show_in_leaderboard === true ||
      h.id === user.id
    ) || []

    setGlobalRanking(publicHunters)

    // Lokales Ranking — Location Permission anfragen
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setLocationError(true)
        setLoading(false)
        return
      }

        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
            timeInterval: 5000,
            distanceInterval: 0,
        })
      const { latitude, longitude } = location.coords

      // Hunter Locations holen
        const { data: hunterLocations } = await supabase
            .from('hunter_locations')
            .select('hunter_id, lat, lng, last_visited_at')

      if (!hunterLocations) {
        setLoading(false)
        return
      }

      // Hunter in 50km Umkreis filtern
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const nearbyHunterIds = hunterLocations
            .filter(loc => {
                const distance = getDistance(latitude, longitude, loc.lat, loc.lng)
                const lastVisited = new Date(loc.last_visited_at)
                return distance <= 50 && lastVisited >= thirtyDaysAgo
            })
            .map(loc => loc.hunter_id)

      // Lokale Hunter Daten holen
      if (nearbyHunterIds.length > 0) {
        const { data: localHunters } = await supabase
          .from('hunters')
          .select(`
            id,
            username,
            rank,
            total_xp,
            avatar_url,
            hunter_privacy_settings (
              show_in_leaderboard,
              show_rank,
              show_profile
            )
          `)
          .in('id', nearbyHunterIds)
          .order('total_xp', { ascending: false })

        const publicLocalHunters = localHunters?.filter(h =>
          h.hunter_privacy_settings?.show_in_leaderboard === true ||
          h.id === user.id
        ) || []

        setLocalRanking(publicLocalHunters)
      }
    } catch (error) {
      setLocationError(true)
    }

    setLoading(false)
  }

  function HunterRow({ hunter, position, isCurrentHunter }) {
    const rankColor = RANK_COLORS[hunter.rank] || '#888888'
    const isPrivate = !hunter.hunter_privacy_settings?.show_in_leaderboard

    return (
      <View style={[
        styles.hunterRow,
        isCurrentHunter && styles.currentHunterRow
      ]}>

        {/* Position */}
        <Text style={[
          styles.position,
          position <= 3 && { color: '#f1c40f' }
        ]}>
          {position === 1 ? '👑' : `#${position}`}
        </Text>

        {/* Avatar */}
        <View style={[styles.avatar, { borderColor: rankColor }]}>
          {hunter.avatar_url ? (
            <Image
              source={{ uri: hunter.avatar_url }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={[styles.avatarLetter, { color: rankColor }]}>
              {hunter.username?.[0]?.toUpperCase()}
            </Text>
          )}
        </View>

        {/* Info */}
        <View style={styles.hunterInfo}>
          <Text style={styles.hunterName}>
            {isPrivate && !isCurrentHunter ? '???' : hunter.username}
          </Text>
          <View style={[styles.rankBadge, { backgroundColor: rankColor + '22' }]}>
            <Text style={[styles.rankBadgeText, { color: rankColor }]}>
              {hunter.hunter_privacy_settings?.show_rank ? hunter.rank : '?'}-RANG
            </Text>
          </View>
        </View>

        {/* XP */}
        <Text style={[styles.xp, { color: rankColor }]}>
          {isPrivate && !isCurrentHunter ? '---' : `${hunter.total_xp} XP`}
        </Text>

      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Ranking wird geladen...</Text>
      </View>
    )
  }

  const rankings = activeTab === 'global' ? globalRanking : localRanking

  return (
    <View style={styles.container}>

          {/* Header */}
          <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={styles.backText}>← ZURÜCK</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>RANKING</Text>
              <View style={{ width: 60 }} />
          </View>

      {/* Tab Switch */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'global' && styles.activeTab]}
          onPress={() => setActiveTab('global')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'global' && styles.activeTabText
          ]}>
            GLOBAL
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'local' && styles.activeTab]}
          onPress={() => setActiveTab('local')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'local' && styles.activeTabText
          ]}>
            LOKAL (50km)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Location Error */}
      {activeTab === 'local' && locationError && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>
            Standort-Zugriff verweigert.{'\n'}
            Aktiviere den Standort um lokale Hunter zu sehen.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchRankings}
          >
            <Text style={styles.retryText}>ERNEUT VERSUCHEN</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Ranking Liste */}
      <ScrollView style={styles.list}>
        {rankings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {activeTab === 'local'
                ? 'Keine Hunter in deiner Nähe gefunden.'
                : 'Noch keine Hunter im Ranking.'}
            </Text>
          </View>
        ) : (
          rankings.map((hunter, index) => (
            <HunterRow
              key={hunter.id}
              hunter={hunter}
              position={index + 1}
              isCurrentHunter={hunter.id === currentHunter?.id}
            />
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

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
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 24,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#111',
    borderRadius: 4,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 4,
  },
  activeTab: {
    backgroundColor: '#222',
  },
  tabText: {
    color: '#333',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  activeTabText: {
    color: '#ffffff',
  },
  errorCard: {
    marginHorizontal: 24,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    color: '#444',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 1,
    marginBottom: 16,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryText: {
    color: '#444',
    fontSize: 11,
    letterSpacing: 2,
  },
  list: {
    flex: 1,
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
  },
  hunterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  currentHunterRow: {
    backgroundColor: '#111',
  },
  position: {
    color: '#333',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
    width: 36,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#111',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarLetter: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  hunterInfo: {
    flex: 1,
  },
  hunterName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  rankBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rankBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  xp: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  backText: {
  color: '#444',
  fontSize: 12,
  letterSpacing: 2,
},
})