import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, useEffect } from 'react-native'

const RANK_COLORS = {
  E: '#888888',
  D: '#4a90d9',
  C: '#2ecc71',
  B: '#9b59b6',
  A: '#f1c40f',
  S: '#8b00ff',
}

const RANK_TITLES = {
  E: 'E — RANG',
  D: 'D — RANG',
  C: 'C — RANG',
  B: 'B — RANG',
  A: 'A — RANG',
  S: 'S — RANG',
}

export default function RankUpModal({ visible, rank, xp, duration, onClose, isRankUp }) {
  const rankColor = RANK_COLORS[rank] || '#888888'

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { borderColor: rankColor }]}>

          {isRankUp ? (
            <>
              {/* Rang Aufstieg */}
              <Text style={styles.systemLabel}>— SYSTEM —</Text>
              <Text style={styles.rankUpTitle}>RANG AUFSTIEG</Text>

              {/* Rang Symbol */}
              <View style={[styles.rankCircle, { borderColor: rankColor }]}>
                <View style={[styles.rankCircleInner, { backgroundColor: rankColor + '22' }]}>
                  <Text style={[styles.rankLetter, { color: rankColor }]}>{rank}</Text>
                </View>
              </View>

              <Text style={[styles.rankTitle, { color: rankColor }]}>
                {RANK_TITLES[rank]}
              </Text>

              <Text style={styles.rankMessage}>
                "Das System hat deine Stärke anerkannt.{'\n'}
                Du bist aufgestiegen, Hunter."
              </Text>
            </>
          ) : (
            <>
              {/* Workout Abgeschlossen */}
              <Text style={styles.systemLabel}>— SYSTEM —</Text>
              <Text style={styles.workoutTitle}>WORKOUT{'\n'}ABGESCHLOSSEN</Text>

              {/* Symbol */}
              <View style={[styles.rankCircle, { borderColor: rankColor }]}>
                <View style={[styles.rankCircleInner, { backgroundColor: rankColor + '22' }]}>
                  <Text style={[styles.rankLetter, { color: rankColor }]}>+</Text>
                </View>
              </View>
            </>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: rankColor }]}>+{xp}</Text>
              <Text style={styles.statLabel}>XP</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: rankColor }]}>{duration}</Text>
              <Text style={styles.statLabel}>MINUTEN</Text>
            </View>
          </View>

          {/* Button */}
          <TouchableOpacity
            style={[styles.button, { borderColor: rankColor }]}
            onPress={onClose}
          >
            <Text style={[styles.buttonText, { color: rankColor }]}>
              WEITER
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  container: {
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderRadius: 8,
    padding: 32,
    width: '100%',
    alignItems: 'center',
  },
  systemLabel: {
    color: '#333',
    fontSize: 10,
    letterSpacing: 4,
    marginBottom: 12,
  },
  rankUpTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 6,
    marginBottom: 32,
    textAlign: 'center',
  },
  workoutTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 32,
  },
  rankCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  rankCircleInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankLetter: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  rankTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginBottom: 16,
  },
  rankMessage: {
    color: '#333',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 1,
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  statLabel: {
    color: '#333',
    fontSize: 10,
    letterSpacing: 3,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#1a1a1a',
  },
  button: {
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
})