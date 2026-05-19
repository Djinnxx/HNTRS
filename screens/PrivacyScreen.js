import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native'
import { supabase } from '../lib/supabase'

export default function PrivacyScreen({ navigation }) {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('hunter_privacy_settings')
      .select('*')
      .eq('hunter_id', user.id)
      .single()
    setSettings(data)
    setLoading(false)
  }

  async function updateSetting(key, value) {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from('hunter_privacy_settings')
      .update({ [key]: value })
      .eq('hunter_id', user.id)

    setSaving(false)
  }

  async function setPreset(preset) {
    const { data: { user } } = await supabase.auth.getUser()
    let newSettings = {}

    if (preset === 'shadow') {
      newSettings = {
        show_profile: false,
        show_avatar: false,
        show_rank: false,
        show_titles: false,
        show_skillung: false,
        show_workout_history: false,
        show_performance_stats: false,
        show_pr_achievements: false,
        show_body_scan: false,
        show_checkin_locations: false,
        show_learning_activity: false,
        show_learning_subjects: false,
        show_learning_journal: false,
        show_followers: false,
        show_following: false,
        show_guild: false,
        allow_follow_requests: false,
        allow_duel_requests: false,
        allow_raid_invites: false,
        show_in_leaderboard: false,
        show_in_guild_ranking: false,
        show_in_seasonal_ranking: false,
      }
    } else if (preset === 'balanced') {
      newSettings = {
        show_profile: true,
        show_avatar: true,
        show_rank: true,
        show_titles: true,
        show_skillung: false,
        show_workout_history: false,
        show_performance_stats: false,
        show_pr_achievements: false,
        show_body_scan: false,
        show_checkin_locations: false,
        show_learning_activity: false,
        show_learning_subjects: false,
        show_learning_journal: false,
        show_followers: true,
        show_following: true,
        show_guild: true,
        allow_follow_requests: true,
        allow_duel_requests: true,
        allow_raid_invites: true,
        show_in_leaderboard: true,
        show_in_guild_ranking: true,
        show_in_seasonal_ranking: false,
      }
    } else if (preset === 'open') {
      newSettings = {
        show_profile: true,
        show_avatar: true,
        show_rank: true,
        show_titles: true,
        show_skillung: true,
        show_workout_history: true,
        show_performance_stats: true,
        show_pr_achievements: true,
        show_body_scan: false,
        show_checkin_locations: false,
        show_learning_activity: false,
        show_learning_subjects: false,
        show_learning_journal: false,
        show_followers: true,
        show_following: true,
        show_guild: true,
        allow_follow_requests: true,
        allow_duel_requests: true,
        allow_raid_invites: true,
        show_in_leaderboard: true,
        show_in_guild_ranking: true,
        show_in_seasonal_ranking: true,
      }
    }

    setSettings(prev => ({ ...prev, ...newSettings }))
    setSaving(true)

    await supabase
      .from('hunter_privacy_settings')
      .update(newSettings)
      .eq('hunter_id', user.id)

    setSaving(false)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Einstellungen werden geladen...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>

          {/* Header */}
          <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={styles.backText}>← ZURÜCK</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>PRIVATSPHÄRE</Text>
              {saving && <ActivityIndicator size="small" color="#444" />}
          </View>

      {/* Preset Buttons */}
      <Text style={styles.sectionTitle}>SCHNELLEINSTELLUNG</Text>
      <View style={styles.presetContainer}>
        <TouchableOpacity
          style={styles.presetButton}
          onPress={() => setPreset('shadow')}
        >
          <Text style={styles.presetIcon}>🔒</Text>
          <Text style={styles.presetTitle}>SHADOW</Text>
          <Text style={styles.presetSub}>Alles privat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.presetButton}
          onPress={() => setPreset('balanced')}
        >
          <Text style={styles.presetIcon}>⚖️</Text>
          <Text style={styles.presetTitle}>BALANCED</Text>
          <Text style={styles.presetSub}>Rang sichtbar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.presetButton}
          onPress={() => setPreset('open')}
        >
          <Text style={styles.presetIcon}>🌐</Text>
          <Text style={styles.presetTitle}>OPEN</Text>
          <Text style={styles.presetSub}>Alles öffentlich</Text>
        </TouchableOpacity>
      </View>

      {/* Profil */}
      <Text style={styles.sectionTitle}>PROFIL</Text>
      <View style={styles.settingsCard}>
        <SettingRow
          label="Profil sichtbar"
          value={settings?.show_profile}
          onChange={val => updateSetting('show_profile', val)}
        />
        <SettingRow
          label="Avatar sichtbar"
          value={settings?.show_avatar}
          onChange={val => updateSetting('show_avatar', val)}
        />
        <SettingRow
          label="Rang sichtbar"
          value={settings?.show_rank}
          onChange={val => updateSetting('show_rank', val)}
        />
        <SettingRow
          label="Titel sichtbar"
          value={settings?.show_titles}
          onChange={val => updateSetting('show_titles', val)}
        />
        <SettingRow
          label="Skillung sichtbar"
          value={settings?.show_skillung}
          onChange={val => updateSetting('show_skillung', val)}
          last
        />
      </View>

      {/* Training */}
      <Text style={styles.sectionTitle}>TRAINING</Text>
      <View style={styles.settingsCard}>
        <SettingRow
          label="Workout-Verlauf sichtbar"
          value={settings?.show_workout_history}
          onChange={val => updateSetting('show_workout_history', val)}
        />
        <SettingRow
          label="Performance Stats sichtbar"
          value={settings?.show_performance_stats}
          onChange={val => updateSetting('show_performance_stats', val)}
        />
        <SettingRow
          label="Bestleistungen sichtbar"
          value={settings?.show_pr_achievements}
          onChange={val => updateSetting('show_pr_achievements', val)}
          last
        />
      </View>

      {/* Lernen */}
      <Text style={styles.sectionTitle}>LERNEN</Text>
      <View style={styles.settingsCard}>
        <SettingRow
          label="Lernaktivität sichtbar"
          value={settings?.show_learning_activity}
          onChange={val => updateSetting('show_learning_activity', val)}
        />
        <SettingRow
          label="Lernthemen sichtbar"
          value={settings?.show_learning_subjects}
          onChange={val => updateSetting('show_learning_subjects', val)}
        />
        <SettingRow
          label="Lern-Journal sichtbar"
          value={settings?.show_learning_journal}
          onChange={val => updateSetting('show_learning_journal', val)}
          last
        />
      </View>

      {/* Social */}
      <Text style={styles.sectionTitle}>SOCIAL</Text>
      <View style={styles.settingsCard}>
        <SettingRow
          label="Follower sichtbar"
          value={settings?.show_followers}
          onChange={val => updateSetting('show_followers', val)}
        />
        <SettingRow
          label="Following sichtbar"
          value={settings?.show_following}
          onChange={val => updateSetting('show_following', val)}
        />
        <SettingRow
          label="Gilde sichtbar"
          value={settings?.show_guild}
          onChange={val => updateSetting('show_guild', val)}
        />
        <SettingRow
          label="Follow-Anfragen erlauben"
          value={settings?.allow_follow_requests}
          onChange={val => updateSetting('allow_follow_requests', val)}
        />
        <SettingRow
          label="Duell-Anfragen erlauben"
          value={settings?.allow_duel_requests}
          onChange={val => updateSetting('allow_duel_requests', val)}
        />
        <SettingRow
          label="Raid-Einladungen erlauben"
          value={settings?.allow_raid_invites}
          onChange={val => updateSetting('allow_raid_invites', val)}
          last
        />
      </View>

      {/* Ranking */}
      <Text style={styles.sectionTitle}>RANKING</Text>
      <View style={styles.settingsCard}>
        <SettingRow
          label="Im globalen Ranking sichtbar"
          value={settings?.show_in_leaderboard}
          onChange={val => updateSetting('show_in_leaderboard', val)}
        />
        <SettingRow
          label="Im Gilden-Ranking sichtbar"
          value={settings?.show_in_guild_ranking}
          onChange={val => updateSetting('show_in_guild_ranking', val)}
        />
        <SettingRow
          label="Im Saison-Ranking sichtbar"
          value={settings?.show_in_seasonal_ranking}
          onChange={val => updateSetting('show_in_seasonal_ranking', val)}
          last
        />
      </View>

      {/* Shadow Hunter Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          "Ein Shadow Hunter trainiert im Verborgenen.{'\n'}
          Niemand kennt seinen Rang — bis er es zulässt."
        </Text>
      </View>

      <View style={{ height: 100 }} />

    </ScrollView>
  )
}

function SettingRow({ label, value, onChange, last }) {
  return (
    <View style={[styles.settingRow, last && styles.lastRow]}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value || false}
        onValueChange={onChange}
        trackColor={{ false: '#1a1a1a', true: '#333' }}
        thumbColor={value ? '#ffffff' : '#444'}
      />
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
  headerTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  sectionTitle: {
    color: '#333',
    fontSize: 11,
    letterSpacing: 3,
    marginHorizontal: 24,
    marginBottom: 8,
    marginTop: 16,
  },
  presetContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    gap: 8,
    marginBottom: 8,
  },
  presetButton: {
    flex: 1,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  presetIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  presetTitle: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 2,
  },
  presetSub: {
    color: '#333',
    fontSize: 9,
    letterSpacing: 1,
  },
  settingsCard: {
    marginHorizontal: 24,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  settingLabel: {
    color: '#888',
    fontSize: 13,
    letterSpacing: 1,
    flex: 1,
  },
  infoCard: {
    marginHorizontal: 24,
    marginTop: 24,
    padding: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#222',
  },
  infoText: {
    color: '#333',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
    letterSpacing: 1,
    },
    backText: {
        color: '#444',
        fontSize: 12,
        letterSpacing: 2,
    },
})