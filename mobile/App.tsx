import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import Ionicons from '@expo/vector-icons/Ionicons'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator } from 'react-native'

import { AuthProvider, useAuth } from './src/context/AuthContext'
import AuthScreen from './src/screens/AuthScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import UploadScreen from './src/screens/UploadScreen'
import LoadingScreen from './src/screens/LoadingScreen'
import ResultScreen from './src/screens/ResultScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import { colors } from './src/theme/colors'

export type RootStackParamList = {
  Auth: undefined
  Main: undefined
  Loading: { contractId: string; filename: string }
  Result: { analysisResult?: any; contractId?: string; isSaved?: boolean }
}

export type TabParamList = {
  Dashboard: undefined
  Upload: undefined
  Profile: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator<TabParamList>()

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 6,
          height: 62,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: '홈',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Upload"
        component={UploadScreen}
        options={{
          tabBarLabel: '분석하기',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: '마이페이지',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={23} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

function Navigation() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Loading" component={LoadingScreen} />
            <Stack.Screen name="Result" component={ResultScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Navigation />
    </AuthProvider>
  )
}
