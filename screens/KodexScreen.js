import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { supabase } from '../lib/supabase'

const RANK_COLORS = {
  E: '#888888',
  D: '#4a90d9',
  C: '#2ecc71',
  B: '#9b59b6',
  A: '#f1c40f',
  S: '#8b00ff',
}

export default function KodexScreen({ navigation }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState({})
  const [expandedEntries, setExpandedEntries] = useState({})
  const [hunter, setHunter] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()

    const [hunterRes, categoriesRes] = await Promise.all([
      supabase.from('hunters').select('rank').eq('id', user.id).single(),
      supabase
        .from('kodex_categories')
        .select(`
          *,
          kodex_entries (
            id,
            title,
            content,
            order_index
          )
        `)
        .eq('is_active', true)
        .order('order_index')
    ])

    setHunter(hunterRes.data)
    setCategories(categoriesRes.data || [])
    setLoading(false)
  }

  function toggleCategory(categoryId) {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

  function toggleEntry(entryId) {
    setExpandedEntries(prev => ({
      ...prev,
      [entryId]: !prev[entryId]
    }))
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Kodex wird geladen...</Text>
      </View>
    )
  }

  const rankColor = RANK_COLORS[hunter?.rank] || '#888888'

  return (
    <ScrollView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← ZURÜCK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KODEX</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Intro */}
      <View style={styles.introCard}>
        <Text style={styles.introText}>
          "Wissen ist die stärkste Waffe eines Hunters.{'\n'}
          Studiere das System — beherrsche es."
        </Text>
      </View>

      {/* Kategorien */}
      {categories.map((category) => (
        <View key={category.id} style={styles.categoryContainer}>

          {/* Kategorie Header */}
          <TouchableOpacity
            style={[
              styles.categoryHeader,
              expandedCategories[category.id] && styles.categoryHeaderExpanded
            ]}
            onPress={() => toggleCategory(category.id)}
          >
            <View style={styles.categoryLeft}>
              <Text style={styles.categoryIcon}>
                {category.icon_emoji || '📖'}
              </Text>
              <Text style={styles.categoryTitle}>{category.title}</Text>
            </View>
            <Text style={styles.categoryArrow}>
              {expandedCategories[category.id] ? '▼' : '►'}
            </Text>
          </TouchableOpacity>

          {/* Kategorie Einträge */}
          {expandedCategories[category.id] && (
            <View style={styles.entriesContainer}>
              {category.kodex_entries
                ?.sort((a, b) => a.order_index - b.order_index)
                .map((entry) => (
                  <View key={entry.id}>

                    {/* Eintrag Titel */}
                    <TouchableOpacity
                      style={styles.entryHeader}
                      onPress={() => toggleEntry(entry.id)}
                    >
                      <Text style={styles.entryTitle}>{entry.title}</Text>
                      <Text style={[
                        styles.entryArrow,
                        expandedEntries[entry.id] && { color: rankColor }
                      ]}>
                        {expandedEntries[entry.id] ? '−' : '+'}
                      </Text>
                    </TouchableOpacity>

                    {/* Eintrag Inhalt */}
                    {expandedEntries[entry.id] && (
                      <View style={[
                        styles.entryContent,
                        { borderLeftColor: rankColor }
                      ]}>
                        <Text style={styles.entryText}>{entry.content}</Text>
                      </View>
                    )}

                  </View>
                ))}
            </View>
          )}

        </View>
      ))}

      <View style={{ height: 100 }} />

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
  introCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#222',
  },
  introText: {
    color: '#333',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
    letterSpacing: 1,
  },
  categoryContainer: {
    marginHorizontal: 24,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
  },
  categoryHeaderExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomColor: '#0a0a0a',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  categoryArrow: {
    color: '#444',
    fontSize: 12,
  },
  entriesContainer: {
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#1a1a1a',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  entryTitle: {
    color: '#888',
    fontSize: 13,
    letterSpacing: 1,
    flex: 1,
  },
  entryArrow: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  entryContent: {
    padding: 16,
    borderLeftWidth: 2,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  entryText: {
    color: '#555',
    fontSize: 13,
    lineHeight: 22,
    letterSpacing: 0.5,
  },
})