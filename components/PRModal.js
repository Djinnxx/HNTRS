import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native'

const RANK_COLORS = {
  E: '#888888',
  D: '#4a90d9',
  C: '#2ecc71',
  B: '#9b59b6',
  A: '#f1c40f',
  S: '#8b00ff',
}

export default function PRModal({ visible, prs, rank, onClose }) {
  const rankColor = RANK_COLORS[rank] || '#888888'

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { borderColor: rankColor }]}>

          <Text style={styles.systemLabel}>— SYSTEM —</Text>
          <Text style={styles.title}>NEUE BESTLEISTUNG</Text>

          <View style={[styles.iconContainer, { borderColor: rankColor }]}>
            <View style={[styles.iconInner, { backgroundColor: rankColor + '22' }]}>
              <Text style={[styles.icon, { color: rankColor }]}>★</Text>
            </View>
          </View>

          <ScrollView style={styles.prList}>
            {prs.map((pr, index) => (
              <View key={index} style={styles.prItem}>
                <Text style={styles.prExercise}>{pr.exercise}</Text>
                <View style={styles.prValues}>
                  <Text style={styles.prOld}>{pr.old}</Text>
                  <Text style={styles.prArrow}>→</Text>
                  <Text style={[styles.prNew, { color: rankColor }]}>{pr.value}</Text>
                </View>
                <Text style={styles.prType}>{pr.type}</Text>
              </View>
            ))}
          </ScrollView>

          <Text style={styles.message}>
            "Deine Grenzen verschieben sich.{'\n'}
            Das System hat es registriert."
          </Text>

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
    maxHeight: '80%',
  },
  systemLabel: {
    color: '#333',
    fontSize: 10,
    letterSpacing: 4,
    marginBottom: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 6,
    marginBottom: 24,
    textAlign: 'center',
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
  prList: {
    width: '100%',
    maxHeight: 200,
    marginBottom: 16,
  },
  prItem: {
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  prExercise: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  prValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  prOld: {
    color: '#333',
    fontSize: 16,
    letterSpacing: 1,
    textDecorationLine: 'line-through',
  },
  prArrow: {
    color: '#444',
    fontSize: 16,
  },
  prNew: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  prType: {
    color: '#333',
    fontSize: 10,
    letterSpacing: 2,
  },
  message: {
    color: '#333',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 1,
    marginBottom: 24,
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