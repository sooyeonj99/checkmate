import React, { useEffect, useRef } from 'react'
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import Ionicons from '@expo/vector-icons/Ionicons'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator, Platform } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'

import { AuthProvider, useAuth } from './src/context/AuthContext'
import { ThemeProvider, useTheme } from './src/context/ThemeContext'

const navigationRef = createNavigationContainerRef()
import AuthScreen from './src/screens/AuthScreen'
import HomeScreen from './src/screens/HomeScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import UploadScreen from './src/screens/UploadScreen'
import MaskingReviewScreen from './src/screens/MaskingReviewScreen'
import LoadingScreen from './src/screens/LoadingScreen'
import ResultScreen from './src/screens/ResultScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import ChatScreen from './src/screens/ChatScreen'
import FranchiseScreen from './src/screens/FranchiseScreen'
import TemplateEditorScreen from './src/screens/TemplateEditorScreen'
import SigningScreen from './src/screens/SigningScreen'
import SignedDocScreen from './src/screens/SignedDocScreen'
import ReportDocScreen from './src/screens/ReportDocScreen'
import GenerateScreen from './src/screens/GenerateScreen'
import CompareScreen from './src/screens/CompareScreen'
import BulkScreen from './src/screens/BulkScreen'
import AdminScreen from './src/screens/AdminScreen'
import LawTrackerScreen from './src/screens/LawTrackerScreen'
import { colors } from './src/theme/colors'
import api from './src/services/api'

// ── 알림 핸들러 설정 ──────────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null
  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') return null
  const token = (await Notifications.getExpoPushTokenAsync()).data
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    })
  }
  return token
}

// ── 네비게이터 타입 ────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Auth: undefined
  Main: undefined
  Signing: { token: string }
  SignedDoc: { recordId: number; contractName: string }
  ReportDoc: { savedId: number; filename: string }
  Franchise: undefined
  TemplateEditor: undefined
  Generate: undefined
  Compare: undefined
  Bulk: undefined
  Admin: undefined
  LawTracker: undefined
}

export type TabParamList = {
  홈: undefined
  대시보드: undefined
  분석하기: undefined
  챗봇: undefined
  마이페이지: undefined
}

export type AnalyzeStackParamList = {
  Upload: undefined
  MaskingReview: { contractId: string; filename: string; contractType?: string }
  Loading: { contractId: string; filename: string; selectedIds?: number[] | null; userType?: string }
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
  const insets = useSafeAreaInsets()
  const bottomPad = insets.bottom > 0 ? insets.bottom : 8
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: bottomPad,
          paddingTop: 6,
          height: 56 + bottomPad,
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
        name="챗봇"
        component={ChatScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={23} color={color} />
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
  const { user, isLoading, pendingResult, setPendingResult } = useAuth()
  const prevUserRef = useRef<typeof user>(null)
  const notifSubRef = useRef<any>(null)
  const responseSubRef = useRef<any>(null)

  // 푸시 토큰 등록 (로그인 후)
  useEffect(() => {
    if (!user) return
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        api.post('/users/push-token', { push_token: token }).catch(() => {})
      }
    })

    // 포그라운드 알림 수신 (표시만)
    notifSubRef.current = Notifications.addNotificationReceivedListener(() => {})

    // 알림 탭 → 서명 화면으로 이동
    responseSubRef.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any
      if (data?.type === 'signing_request' && data?.token && navigationRef.isReady()) {
        navigationRef.navigate('Signing' as any, { token: data.token })
      }
    })

    return () => {
      notifSubRef.current?.remove()
      responseSubRef.current?.remove()
    }
  }, [user])

  // 재로그인 후 Result 화면으로 자동 복귀
  useEffect(() => {
    const wasLoggedOut = prevUserRef.current === null
    prevUserRef.current = user

    if (user && wasLoggedOut && pendingResult && navigationRef.isReady()) {
      const timer = setTimeout(() => {
        if (navigationRef.isReady()) {
          // @ts-ignore — 중첩 탭+스택 네비게이션 타입 한계로 cast 필요
          navigationRef.navigate('분析하기', {
            screen: 'Result',
            params: {
              analysisResult: pendingResult.analysisResult,
              contractId: pendingResult.contractId,
            },
          })
        }
        setPendingResult(null)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [user, pendingResult])

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <RootStack.Screen name="Main" component={MainTabs} />
            <RootStack.Screen name="Signing" component={SigningScreen} />
            <RootStack.Screen name="SignedDoc" component={SignedDocScreen} />
            <RootStack.Screen name="ReportDoc" component={ReportDocScreen} />
            <RootStack.Screen name="Franchise" component={FranchiseScreen} />
            <RootStack.Screen name="TemplateEditor" component={TemplateEditorScreen} />
            <RootStack.Screen name="Generate" component={GenerateScreen} />
            <RootStack.Screen name="Compare" component={CompareScreen} />
            <RootStack.Screen name="Bulk" component={BulkScreen} />
            <RootStack.Screen name="Admin" component={AdminScreen} />
            <RootStack.Screen name="LawTracker" component={LawTrackerScreen} />
          </>
        ) : (
          <>
            <RootStack.Screen name="Auth" component={AuthScreen} />
            <RootStack.Screen name="Signing" component={SigningScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <Navigation />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
