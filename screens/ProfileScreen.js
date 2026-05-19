import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
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

export default function ProfileScreen({ navigation }) {
  const [hunter, setHunter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  useEffect(() => {
    fetchHunter()
  }, [])

  async function fetchHunter() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('hunters')
      .select('*')
      .eq('id', user.id)
      .single()
    setHunter(data)
    setLoading(false)
  }

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Berechtigung fehlt', 'Erlaube den Zugriff auf deine Fotos.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!result.canceled) {
      uploadAvatar(result.assets[0].uri)
    }
  }

  async function uploadAvatar(uri) {
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const response = await fetch(uri)
    const blob = await response.blob()
    const arrayBuffer = await new Response(blob).arrayBuffer()
    const filePath = `${user.id}/avatar.jpg`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (uploadError) {
      Alert.alert('Fehler', 'Avatar konnte nicht hochgeladen werden.')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    await supabase
      .from('hunters')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    setHunter(prev => ({ ...prev, avatar_url: publicUrl }))
    setUploading(false)
  }

  async function handleRename() {
    if (!newUsername.trim()) return
    if (newUsername.trim().length < 3) return

    if (hunter?.username_changed_at) {
      const lastChange = new Date(hunter.username_changed_at)
      const today = new Date()
      const daysDiff = Math.floor((today - lastChange) / (1000 * 60 * 60 * 24))
      if (daysDiff < 30) {
        const daysLeft = 30 - daysDiff
        setShowRenameModal(false)
        // Zeige Info im Modal statt Alert
        return
      }
    }

    setRenameLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: existing } = await supabase
      .from('hunters')
      .select('id')
      .eq('username', newUsername.trim())
      .maybeSingle()

    if (existing) {
      setRenameLoading(false)
      return
    }

    const { error } = await supabase
      .from('hunters')
      .update({
        username: newUsername.trim(),
        username_changed_at: new Date()
      })
      .eq('id', user.id)

    if (!error) {
      setHunter(prev => ({
        ...prev,
        username: newUsername.trim(),
        username_changed_at: new Date()
      }))
      setShowRenameModal(false)
      setNewUsername('')
    }

    setRenameLoading(false)
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('hunter_quests').delete().eq('hunter_id', user.id)
    await supabase.from('workouts').delete().eq('hunter_id', user.id)
    await supabase.from('hunter_skills').delete().eq('hunter_id', user.id)
    await supabase.from('xp_events').delete().eq('hunter_id', user.id)
    await supabase.from('hunter_privacy_settings').delete().eq('hunter_id', user.id)
    await supabase.from('hunter_locations').delete().eq('hunter_id', user.id)
    await supabase.from('dsgvo_compliance').delete().eq('hunter_id', user.id)
    await supabase.from('hunters').delete().eq('id', user.id)
    await supabase.auth.signOut()

    setDeleteLoading(false)
    navigation.replace('Login')
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Profil wird geladen...</Text>
      </View>
    )
  }

  const rankColor = RANK_COLORS[hunter?.rank] || '#888888'

  return (
    <ScrollView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PROFIL</Text>
        <TouchableOpacity onPress={() => setShowInfo(true)}>
          <Text style={styles.infoIcon}>ℹ</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={pickAvatar} disabled={uploading}>
          <View style={[styles.avatarContainer, { borderColor: rankColor }]}>
            {uploading ? (
              <ActivityIndicator color={rankColor} />
            ) : hunter?.avatar_url ? (
              <Image
                source={{ uri: hunter.avatar_url }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarPlaceholder}>+</Text>
            )}
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>
          {uploading ? 'Wird hochgeladen...' : 'Tippe um Avatar zu ändern'}
        </Text>
      </View>

      {/* Hunter Info */}
      <View style={[styles.infoCard, { borderColor: rankColor }]}>
        <View style={[styles.rankBadge, { backgroundColor: rankColor }]}>
          <Text style={styles.rankText}>{hunter?.rank}</Text>
        </View>
        <Text style={styles.hunterName}>{hunter?.username}</Text>
        <Text style={styles.hunterSubtitle}>Registered Hunter</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: rankColor }]}>
              {hunter?.total_xp || 0}
            </Text>
            <Text style={styles.statLabel}>TOTAL XP</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: rankColor }]}>
              {hunter?.rank}
            </Text>
            <Text style={styles.statLabel}>RANG</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: rankColor }]}>0</Text>
            <Text style={styles.statLabel}>QUESTS</Text>
          </View>
        </View>
      </View>

      {/* System Nachricht */}
      <View style={styles.systemMessage}>
        <Text style={styles.systemText}>
          "Jeder Hunter beginnt als E-Rang.{'\n'}
          Was dich definiert ist nicht wo du startest —{'\n'}
          sondern wohin du gehst."
        </Text>
      </View>

      {/* Buttons */}
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation.navigate('Privacy')}
      >
        <Text style={styles.settingsButtonText}>🔒 PRIVATSPHÄRE</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation.navigate('Kodex')}
      >
        <Text style={styles.settingsButtonText}>📖 HNTRS KODEX</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => setShowRenameModal(true)}
      >
        <Text style={styles.settingsButtonText}>✏ HUNTER NAME ÄNDERN</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => setShowDeleteModal(true)}
      >
        <Text style={styles.deleteButtonText}>⚠ HNTRS LIZENZ LÖSCHEN</Text>
      </TouchableOpacity>

      {/* Rename Modal */}
      <Modal visible={showRenameModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>HUNTER NAME ÄNDERN</Text>
            <Text style={styles.modalSub}>
              {hunter?.username_changed_at
                ? `Letzter Wechsel: ${new Date(hunter.username_changed_at).toLocaleDateString('de-DE')}`
                : 'Erster Namenswechsel'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Neuer Hunter Name"
              placeholderTextColor="#333"
              value={newUsername}
              onChangeText={setNewUsername}
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setShowRenameModal(false)
                  setNewUsername('')
                }}
              >
                <Text style={styles.modalCancelText}>ABBRECHEN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={handleRename}
                disabled={renameLoading}
              >
                {renameLoading
                  ? <ActivityIndicator color="#000" size="small" />
                  : <Text style={styles.modalConfirmText}>ÄNDERN</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>HNTRS LIZENZ LÖSCHEN</Text>
            <Text style={styles.deleteWarningText}>
              "Diese Entscheidung kann nicht rückgängig gemacht werden.{'\n\n'}
              Dein Rang. Deine Quests. Dein Fortschritt.{'\n'}
              Alles wird gelöscht.{'\n\n'}
              Für immer."
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalCancelText}>ABBRECHEN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDelete}
                onPress={handleDeleteAccount}
                disabled={deleteLoading}
              >
                {deleteLoading
                  ? <ActivityIndicator color="#ff4444" size="small" />
                  : <Text style={styles.modalDeleteText}>LÖSCHEN</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 100 }} />

      <InfoModal
        visible={showInfo}
        title="PROFIL"
        content={
          "Deine Hunter Identität.\n\n" +
          "• Avatar — Tippe auf den Kreis um ein Foto hochzuladen\n" +
          "• Name ändern — Alle 30 Tage möglich\n" +
          "• Privatsphäre — Du entscheidest was andere sehen\n" +
          "• HNTRS Kodex — Das Systemhandbuch\n" +
          "• HNTRS Lizenz löschen — Löscht deinen Account permanent"
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
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
    marginBottom: 8,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    color: '#333',
    fontSize: 32,
  },
  avatarHint: {
    color: '#333',
    fontSize: 11,
    letterSpacing: 1,
  },
  infoCard: {
    marginHorizontal: 24,
    borderWidth: 1,
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#111',
    marginBottom: 16,
  },
  rankBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 20,
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  statLabel: {
    color: '#444',
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#222',
  },
  systemMessage: {
    marginHorizontal: 24,
    marginBottom: 16,
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
  settingsButton: {
    marginHorizontal: 24,
    marginTop: 8,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
  },
  settingsButtonText: {
    color: '#444',
    fontSize: 12,
    letterSpacing: 2,
  },
  deleteButton: {
    marginHorizontal: 24,
    marginTop: 8,
    backgroundColor: '#1a0000',
    borderWidth: 1,
    borderColor: '#3a0000',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ff4444',
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: 'bold',
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
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSub: {
    color: '#333',
    fontSize: 11,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 24,
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
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
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
    backgroundColor: '#ffffff',
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
  deleteWarningText: {
    color: '#444',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalDelete: {
    flex: 1,
    backgroundColor: '#1a0000',
    borderWidth: 1,
    borderColor: '#3a0000',
    borderRadius: 4,
    padding: 14,
    alignItems: 'center',
  },
  modalDeleteText: {
    color: '#ff4444',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  infoIcon: {
    color: '#333',
    fontSize: 18,
  },
})