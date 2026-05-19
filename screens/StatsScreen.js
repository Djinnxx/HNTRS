import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg'
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

// Pentagon Berechnung
function getPentagonPoints(cx, cy, r, rotation = -90) {
  const points = []
  for (let i = 0; i < 5; i++) {
    const angle = (i * 72 + rotation) * (Math.PI / 180)
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    })
  }
  return points
}

function pointsToString(points) {
  return points.map(p => `${p.x},${p.y}`).join(' ')
}

function RadarGraph({ stats, rankColor }) {
  const cx = 150
  const cy = 150
  const maxR = 100
  const labels = ['STR', 'AGI', 'VIT', 'INT-T', 'INT-L']
  const maxValue = 1000

  const bgPoints1 = getPentagonPoints(cx, cy, maxR)
  const bgPoints2 = getPentagonPoints(cx, cy, maxR * 0.66)
  const bgPoints3 = getPentagonPoints(cx, cy, maxR * 0.33)

  const values = [
    stats.str_points || 0,
    stats.agi_points || 0,
    stats.vit_points || 0,
    stats.int_training_points || 0,
    stats.int_learning_points || 0,
  ]

  const maxStat = Math.max(...values, 1)
  const scale = Math.min(maxStat, maxValue)

  const statPoints = getPentagonPoints(cx, cy, maxR).map((point, i) => {
    const ratio = Math.min(values[i] / scale, 1)
    const angle = (i * 72 + -90) * (Math.PI / 180)
    return {
      x: cx + maxR * ratio * Math.cos(angle),
      y: cy + maxR * ratio * Math.sin(angle),
    }
  })

  const labelPoints = getPentagonPoints(cx, cy, maxR + 24)

  return (
    <Svg width={300} height={300} viewBox="0 0 300 300">

      {/* Hintergrund Linien */}
      {bgPoints1.map((point, i) => (
        <Line
          key={`axis-${i}`}
          x1={cx} y1={cy}
          x2={point.x} y2={point.y}
          stroke="#1a1a1a"
          strokeWidth={1}
        />
      ))}

      {/* Hintergrund Pentagone */}
      <Polygon
        points={pointsToString(bgPoints1)}
        fill="none"
        stroke="#1a1a1a"
        strokeWidth={1}
      />
      <Polygon
        points={pointsToString(bgPoints2)}
        fill="none"
        stroke="#1a1a1a"
        strokeWidth={1}
      />
      <Polygon
        points={pointsToString(bgPoints3)}
        fill="none"
        stroke="#1a1a1a"
        strokeWidth={1}
      />

      {/* Stat Fläche */}
      <Polygon
        points={pointsToString(statPoints)}
        fill={rankColor + '33'}
        stroke={rankColor}
        strokeWidth={2}
      />

      {/* Stat Punkte */}
      {statPoints.map((point, i) => (
        <Circle
          key={`point-${i}`}
          cx={point.x}
          cy={point.y}
          r={4}
          fill={rankColor}
        />
      ))}

      {/* Labels */}
      {labelPoints.map((point, i) => (
        <SvgText
          key={`label-${i}`}
          x={point.x}
          y={point.y}
          textAnchor="middle"
          alignmentBaseline="middle"
          fill="#444444"
          fontSize={11}
          fontWeight="bold"
        >
          {labels[i]}
        </SvgText>
      ))}

    </Svg>
  )
}

export default function StatsScreen({ navigation }) {
  const [hunter, setHunter] = useState(null)
  const [skills, setSkills] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [personalRecords, setPersonalRecords] = useState([])
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

    const [hunterRes, skillsRes, workoutsRes, prsRes] = await Promise.all([
      supabase.from('hunters').select('*').eq('id', user.id).single(),
      supabase.from('hunter_skills').select('*').eq('hunter_id', user.id).single(),
      supabase
        .from('workouts')
        .select('*')
        .eq('hunter_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(5),
      supabase
        .from('personal_records')
        .select('*, exercises(name)')
        .eq('hunter_id', user.id)
        .eq('record_type', 'max_weight')
        .order('achieved_at', { ascending: false })
        .limit(10)
    ])

    setHunter(hunterRes.data)
    setSkills(skillsRes.data)
    setWorkouts(workoutsRes.data || [])
    setPersonalRecords(prsRes.data || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Statistiken werden geladen...</Text>
      </View>
    )
  }

  const rankColor = RANK_COLORS[hunter?.rank] || '#888888'

  return (
    <ScrollView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>STATISTIKEN</Text>
        <TouchableOpacity onPress={() => setShowInfo(true)}>
          <Text style={styles.infoIcon}>ℹ</Text>
        </TouchableOpacity>
      </View>

      {/* Radar Graph */}
      <View style={styles.graphCard}>
        <Text style={styles.sectionTitle}>HUNTER STATS</Text>
        <View style={styles.graphContainer}>
          {skills && (
            <RadarGraph
              stats={skills}
              rankColor={rankColor}
            />
          )}
        </View>

        {/* Stat Werte */}
        <View style={styles.statsList}>
          {[
            { label: 'STR', value: skills?.str_points || 0 },
            { label: 'AGI', value: skills?.agi_points || 0 },
            { label: 'VIT', value: skills?.vit_points || 0 },
            { label: 'INT-T', value: skills?.int_training_points || 0 },
            { label: 'INT-L', value: skills?.int_learning_points || 0 },
          ].map((stat) => (
            <View key={stat.label} style={styles.statRow}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <View style={styles.statBarContainer}>
                <View
                  style={[
                    styles.statBar,
                    {
                      width: `${Math.min((stat.value / 500) * 100, 100)}%`,
                      backgroundColor: rankColor
                    }
                  ]}
                />
              </View>
              <Text style={[styles.statValue, { color: rankColor }]}>
                {stat.value}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* XP Übersicht */}
      <View style={styles.xpCard}>
        <Text style={styles.sectionTitle}>FORTSCHRITT</Text>
        <View style={styles.xpRow}>
          <View style={styles.xpItem}>
            <Text style={[styles.xpValue, { color: rankColor }]}>
              {hunter?.total_xp || 0}
            </Text>
            <Text style={styles.xpLabel}>TOTAL XP</Text>
          </View>
          <View style={styles.xpDivider} />
          <View style={styles.xpItem}>
            <Text style={[styles.xpValue, { color: rankColor }]}>
              {hunter?.rank}
            </Text>
            <Text style={styles.xpLabel}>RANG</Text>
          </View>
          <View style={styles.xpDivider} />
          <View style={styles.xpItem}>
            <Text style={[styles.xpValue, { color: rankColor }]}>
              {workouts.length}
            </Text>
            <Text style={styles.xpLabel}>WORKOUTS</Text>
          </View>
        </View>
      </View>

      {/* Letzte Workouts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>LETZTE WORKOUTS</Text>
        {workouts.length === 0 ? (
          <Text style={styles.emptyText}>
            Noch keine Workouts abgeschlossen.
          </Text>
        ) : (
          workouts.map((workout) => (
            <View key={workout.id} style={styles.workoutItem}>
              <View>
                <Text style={styles.workoutTitle}>
                  {workout.title || 'Workout'}
                </Text>
                <Text style={styles.workoutDate}>
                  {new Date(workout.completed_at).toLocaleDateString('de-DE')}
                </Text>
              </View>
              <View style={styles.workoutRight}>
                <Text style={[styles.workoutXp, { color: rankColor }]}>
                  +{workout.xp_earned} XP
                </Text>
                <Text style={styles.workoutDuration}>
                  {workout.duration_minutes} min
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 100 }} />

      {/* Personal Records */}
      {personalRecords.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PERSÖNLICHE BESTLEISTUNGEN</Text>
          {personalRecords.map((pr) => (
            <View key={pr.id} style={styles.prItem}>
              <Text style={styles.prExercise}>{pr.exercises?.name}</Text>
              <Text style={[styles.prValue, { color: rankColor }]}>
                {pr.value} kg
              </Text>
            </View>
          ))}
        </View>
      )}

      <InfoModal
        visible={showInfo}
        title="STATISTIKEN"
        content={
          "Dein persönlicher Fortschritt als Hunter.\n\n" +
          "• Radar Graph — Zeigt deine 5 Stats (STR/AGI/VIT/INT-T/INT-L)\n" +
          "• Stats wachsen durch passende Übungen\n" +
          "• Letzte Workouts — Deine Trainingshistorie\n\n" +
          "Tipp: Trainiere verschiedene Übungstypen um einen ausgeglichenen Hunter zu entwickeln."
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
  graphCard: {
    marginHorizontal: 24,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 8,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  graphContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  sectionTitle: {
    color: '#333',
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  statsList: {
    width: '100%',
    marginTop: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statLabel: {
    color: '#444',
    fontSize: 11,
    letterSpacing: 2,
    width: 40,
  },
  statBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  statBar: {
    height: '100%',
    borderRadius: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
    width: 40,
    textAlign: 'right',
  },
  xpCard: {
    marginHorizontal: 24,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 8,
    padding: 24,
    marginBottom: 16,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  xpItem: {
    alignItems: 'center',
  },
  xpValue: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  xpLabel: {
    color: '#444',
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 4,
  },
  xpDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#222',
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 16,
  },
  emptyText: {
    color: '#333',
    fontSize: 13,
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 16,
  },
  workoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 4,
    padding: 16,
    marginBottom: 8,
  },
  workoutTitle: {
    color: '#ffffff',
    fontSize: 14,
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  workoutDate: {
    color: '#444',
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 4,
  },
  workoutRight: {
    alignItems: 'flex-end',
  },
  workoutXp: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  workoutDuration: {
    color: '#444',
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 4,
  },
  infoIcon: {
    color: '#333',
    fontSize: 18,
  },
  prItem: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#111',
  borderWidth: 1,
  borderColor: '#1a1a1a',
  borderRadius: 4,
  padding: 12,
  marginBottom: 8,
},
prExercise: {
  color: '#ffffff',
  fontSize: 13,
  letterSpacing: 1,
},
prValue: {
  fontSize: 16,
  fontWeight: 'bold',
  letterSpacing: 1,
},
})