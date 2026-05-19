import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native'

const RANK_COLORS = {
  E: '#888888',
  D: '#4a90d9',
  C: '#2ecc71',
  B: '#9b59b6',
  A: '#f1c40f',
  S: '#8b00ff',
}

export default function QuestCompleteModal({ visible, quest, rank, onClose }) {
  const rankColor = RANK_COLORS[rank] || '#888888'

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { borderColor: rankColor }]}>

          <Text style={styles.systemLabel}>— QUEST ABGESCHLOSSEN —</Text>

          <View style={[styles.iconContainer, { borderColor: rankColor }]}>
            <View style={[styles.iconInner, { backgroundColor: rankColor + '22' }]}>
              <Text style={[styles.icon, { color: rankColor }]}>✓</Text>
            </View>
          </View>

          <Text style={styles.questTitle}>{quest?.title}</Text>

          <Text style={styles.questMessage}>
            "Das System hat deine Leistung anerkannt.{'\n'}
            Die Prüfung ist bestanden, Hunter."
          </Text>

          <View style={styles.rewardContainer}>
            <Text style={styles.rewardLabel}>BELOHNUNG</Text>
            <Text style={[styles.rewardXP, { color: rankColor }]}>
              +{quest?.xp_reward} XP
            </Text>
          </View>

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
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  questTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
  },
  questMessage: {
    color: '#333',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 1,
    marginBottom: 24,
  },
  rewardContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  rewardLabel: {
    color: '#333',
    fontSize: 10,
    letterSpacing: 3,
    marginBottom: 8,
  },
  rewardXP: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 3,
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