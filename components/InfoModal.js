import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native'

export default function InfoModal({ visible, title, content, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.content}>{content}</Text>
          <Text style={styles.hint}>Tippe irgendwo um zu schließen</Text>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  container: {
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 8,
    padding: 24,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  close: {
    color: '#444',
    fontSize: 16,
  },
  content: {
    color: '#555',
    fontSize: 13,
    lineHeight: 22,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  hint: {
    color: '#222',
    fontSize: 10,
    letterSpacing: 2,
    textAlign: 'center',
  },
})