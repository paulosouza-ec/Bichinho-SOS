import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import ReportScreen from './src/screens/ReportScreen';
import ReportDetailScreen from './src/screens/ReportDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AgencyHomeScreen from './src/screens/AgencyHomeScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';


const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          headerStyle: { backgroundColor: '#27ae60' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen} 
          options={{ title: 'Cadastro' }}
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="AgencyHome" 
          component={AgencyHomeScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Report" 
          component={ReportScreen} 
          options={{ title: 'Nova Denúncia' }}
        />
        <Stack.Screen 
          name="ReportDetail" 
          component={ReportDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{ title: 'Meu Perfil' }}
        />
        <Stack.Screen 
          name="ForgotPassword" 
          component={ForgotPasswordScreen} 
          options={{ title: 'Esqueci a Senha' }} />
        <Stack.Screen 
          name="ResetPassword" 
          component={ResetPasswordScreen} 
          options={{ title: 'Redefinir Senha' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
