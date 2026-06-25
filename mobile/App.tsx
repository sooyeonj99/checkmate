import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator } from 'react-native'

import { AuthProvider, useAuth } from './src/context/AuthContext'
import AuthScreen from './src/screens/AuthScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import UploadScreen from './src/screens/UploadScreen'
import LoadingScreen from './src/screens/LoadingScreen'
import ResultScreen from './src/screens/ResultScreen'
import { colors } from './src/theme/colors'

export type RootStackParamList = {
  Auth: undefined
  Dashboard: undefined
  Upload: undefined
  Loading: { contractId: string; filename: string }
  Result: { analysisResult?: any }
}

const Stack = createNativeStackNavigator<RootStackParamList>()

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
          // 로그인된 화면들
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Upload" component={UploadScreen} />
            <Stack.Screen name="Loading" component={LoadingScreen} />
            <Stack.Screen name="Result" component={ResultScreen} />
          </>
        ) : (
          // 로그인 화면
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Navigation />
    </AuthProvider>
  )
}
