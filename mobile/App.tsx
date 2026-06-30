import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import Ionicons from '@expo/vector-icons/Ionicons'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator } from 'react-native'

import { AuthProvider, useAuth } from './src/context/AuthContext'
import AuthScreen from './src/screens/AuthScreen'
import HomeScreen from './src/screens/HomeScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import UploadScreen from './src/screens/UploadScreen'
import MaskingReviewScreen from './src/screens/MaskingReviewScreen'
import LoadingScreen from './src/screens/LoadingScreen'
import ResultScreen from './src/screens/ResultScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import { colors } from './src/theme/colors'

// ── 네비게이터 타입 ────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Auth: undefined
  Main: undefined
}

export type TabParamList = {
  홈: undefined
  대시보드: undefined
  분석하기: undefined
  마이페이지: undefined
}

export type AnalyzeStackParamList = {
  Upload: undefined
  MaskingReview: { contractId: string; filename: string; contractType?: string }
  Loading: { contractId: string; filename: string; selectedIds?: number[] | null }
  Result: { analysisResult?: any; contractId?: string; isSaved?: boolean }
}

const RootStack = createNativeStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator<TabParamList>()
const AnalyzeStack = createNativeStackNavigator<AnalyzeStackParamList>()

// ── 분석하기 탭 내부 스택 (Upload → Loading → Result) ──────────────────────────

function AnalyzeNavigator() {
  return (
    <AnalyzeStack.Navigator screenOptions={{ headerShown: false }}>
      <AnalyzeStack.Screen name="Upload" component={UploadScreen} />
      <AnalyzeStack.Screen name="MaskingReview" component={MaskingReviewScreen} />
      <AnalyzeStack.Screen name="Loading" component={LoadingScreen} />
      <AnalyzeStack.Screen name="Result" component={ResultScreen} />
    </AnalyzeStack.Navigator>
  )
}

// ── 메인 탭 네비게이터 ──────────────────────────────────────────────────────────

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
        name="홈"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="대시보드"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="분석하기"
        component={AnalyzeNavigator}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="마이페이지"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={23} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

// ── 루트 네비게이터 ─────────────────────────────────────────────────────────────

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
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <RootStack.Screen name="Main" component={MainTabs} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthScreen} />
        )}
      </RootStack.Navigator>
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
