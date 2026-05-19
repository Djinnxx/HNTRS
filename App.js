import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'
import { View, Text, StyleSheet } from 'react-native'
import LoginScreen from './screens/LoginScreen'
import RegisterScreen from './screens/RegisterScreen'
import HomeScreen from './screens/HomeScreen'
import ProfileScreen from './screens/ProfileScreen'
import WorkoutScreen from './screens/WorkoutScreen'
import StatsScreen from './screens/StatsScreen'
import QuestScreen from './screens/QuestScreen'
import RankingScreen from './screens/RankingScreen'
import PrivacyScreen from './screens/PrivacyScreen'
import TrainingPlansScreen from './screens/TrainingPlansScreen'
import TrainingPlanDetailScreen from './screens/TrainingPlanDetailScreen'
import WorkoutFromPlanScreen from './screens/WorkoutFromPlanScreen'
import KodexScreen from './screens/KodexScreen'

const Stack = createNativeStackNavigator()
const Tab = createMaterialTopTabNavigator()

function MainTabs() {
  return (
    <Tab.Navigator
      tabBarPosition="top"
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderBottomWidth: 1,
          borderBottomColor: '#1a1a1a',
          elevation: 0,
          shadowOpacity: 0,
          paddingTop: 48,
        },
        tabBarIndicatorStyle: {
          backgroundColor: '#ffffff',
          height: 1,
        },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#333333',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
          letterSpacing: 2,
        },
        tabBarPressColor: 'transparent',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'HOME' }}
      />
      <Tab.Screen
        name="Workout"
        component={WorkoutScreen}
        options={{ tabBarLabel: 'TRAIN' }}
      />
      <Tab.Screen
        name="Quests"
        component={QuestScreen}
        options={{ tabBarLabel: 'QUESTS' }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{ tabBarLabel: 'STATS' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'PROFIL' }}
      />
    </Tab.Navigator>
  )
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        id="MainStack"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a0a' }
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Ranking" component={RankingScreen} />
        <Stack.Screen name="Privacy" component={PrivacyScreen} />
        <Stack.Screen name="TrainingPlans" component={TrainingPlansScreen} options={{ headerShown: false }} />
        <Stack.Screen name="TrainingPlanDetail" component={TrainingPlanDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="WorkoutFromPlan" component={WorkoutFromPlanScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Kodex" component={KodexScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}