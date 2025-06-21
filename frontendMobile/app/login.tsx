import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { login, isLoading, isLoggedIn } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    if (isLoggedIn) {
      router.replace('/(tabs)');
    }
  }, [isLoggedIn]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return false;
    }
    
    if (!formData.email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    
    if (!formData.password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return false;
    }
    
    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }
    
    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    try {
      await login(formData.email, formData.password);
      // Navigate to home page (tabs) after successful login
      router.replace('/(tabs)');
    } catch (error: any) {
      const errorMessage = error?.message || 'Login failed. Please try again.';
      Alert.alert('Login Error', errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <ThemedText style={styles.logo}>📸</ThemedText>
          <ThemedText type="title" style={styles.title}>Welcome Back</ThemedText>
          <ThemedText style={styles.subtitle}>Sign in to continue your week dump journey</ThemedText>
        </ThemedView>

        {/* Login Form */}
        <ThemedView style={styles.formContainer}>
          <ThemedView style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Email</ThemedText>
            <TextInput
              style={[styles.textInput, { 
                color: colors.text, 
                borderColor: colors.icon + '40',
                backgroundColor: colors.background 
              }]}
              placeholder="Enter your email"
              placeholderTextColor={colors.icon}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </ThemedView>

          <ThemedView style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Password</ThemedText>
            <ThemedView style={styles.passwordContainer}>
              <TextInput
                style={[styles.passwordInput, { 
                  color: colors.text, 
                  borderColor: colors.icon + '40',
                  backgroundColor: colors.background 
                }]}
                placeholder="Enter your password"
                placeholderTextColor={colors.icon}
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity 
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
              >
                <ThemedText style={[styles.passwordToggleText, { color: colors.tint }]}>
                  {showPassword ? '🙈' : '👁️'}
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>

          <TouchableOpacity 
            style={[styles.loginButton, { 
              backgroundColor: colors.tint,
              opacity: isLoading ? 0.7 : 1 
            }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <ThemedText style={styles.loginButtonText}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotPasswordButton}>
            <ThemedText style={[styles.forgotPasswordText, { color: colors.tint }]}>
              Forgot Password?
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Sign Up Link */}
        <ThemedView style={styles.signUpContainer}>
          <ThemedText style={styles.signUpText}>Don't have an account? </ThemedText>
          <TouchableOpacity onPress={() => router.push('/create-account')}>
            <ThemedText style={[styles.signUpLink, { color: colors.tint }]}>
              Sign Up
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Demo Info */}
        <ThemedView style={[styles.demoContainer, { backgroundColor: colors.tint + '10' }]}>
          <ThemedText style={[styles.demoTitle, { color: colors.tint }]}>Demo Mode</ThemedText>
          <ThemedText style={[styles.demoText, { color: colors.tint }]}>
            Use any email and password (min 6 chars) to test the app
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
    fontSize: 16,
  },
  formContainer: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingRight: 50,
    fontSize: 16,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  passwordToggleText: {
    fontSize: 18,
  },
  loginButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  signUpText: {
    fontSize: 14,
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  demoContainer: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  demoText: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
}); 