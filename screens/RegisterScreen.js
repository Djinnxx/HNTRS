import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native'
import { supabase } from '../lib/supabase'

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister() {
    setLoading(true)
    setError('')

    // 1. Auth Account erstellen
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // 2. Hunter Profil erstellen
    const { error: profileError } = await supabase
      .from('hunters')
      .insert({
        id: data.user.id,
        username,
        email,
      })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    // 3. Privacy Settings erstellen (alles privat by default)
    await supabase
      .from('hunter_privacy_settings')
      .insert({ hunter_id: data.user.id })

    // 4. Hunter Skills erstellen
    await supabase
      .from('hunter_skills')
      .insert({ hunter_id: data.user.id })

    // 5. DSGVO Consent
    await supabase
      .from('dsgvo_compliance')
      .insert({
        hunter_id: data.user.id,
        data_processing_consent: true,
        consent_given_at: new Date()
      })

    navigation.replace('Main')
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.inner}>

        {/* Logo & Titel */}
        <Text style={styles.logo}>HNTRS</Text>
        <Text style={styles.subtitle}>Registriere dich als Hunter</Text>

        {/* Fehlermeldung */}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Username Input */}
        <Text style={styles.label}>HUNTER NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="Dein Hunter Name"
          placeholderTextColor="#444"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        {/* Email Input */}
        <Text style={styles.label}>EMAIL</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#444"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {/* Passwort Input */}
        <Text style={styles.label}>PASSWORT</Text>
        <TextInput
          style={styles.input}
          placeholder="Mindestens 6 Zeichen"
          placeholderTextColor="#444"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Privacy Hinweis */}
        <Text style={styles.privacy}>
          Dein Profil startet vollständig privat.{'\n'}
          Du entscheidest was andere sehen.
        </Text>

        {/* Register Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#000" />
            : <Text style={styles.buttonText}>ALS HUNTER REGISTRIEREN</Text>
          }
        </TouchableOpacity>

        {/* Login Link */}
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Bereits registriert? Einloggen</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  logo: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 11,
    color: '#444',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 48,
  },
  error: {
    color: '#ff4444',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 13,
  },
  label: {
    color: '#444',
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 4,
    padding: 16,
    color: '#ffffff',
    marginBottom: 16,
    fontSize: 15,
    letterSpacing: 1,
  },
  privacy: {
    color: '#333',
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 18,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#ffffff',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 3,
  },
  link: {
    color: '#555',
    textAlign: 'center',
    fontSize: 13,
    letterSpacing: 1,
  },
})