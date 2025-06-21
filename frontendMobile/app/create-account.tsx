import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';

export default function CreateAccountScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { register, isLoading, isLoggedIn } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
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
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }
    
    if (formData.name.trim().length < 2) {
      Alert.alert('Error', 'Name must be at least 2 characters long');
      return false;
    }
    
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return false;
    }
    
    if (!formData.email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    
    if (!formData.password.trim()) {
      Alert.alert('Error', 'Please enter a password');
      return false;
    }
    
    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }
    
    return true;
  };

  const handleCreateAccount = async () => {
    if (!validateForm()) return;
    
    try {
      await register(formData.email, formData.password, formData.name);
      // Navigate to profile page after successful account creation
      router.replace('/(tabs)/explore'); // This is the profile tab
    } catch (error: any) {
      const errorMessage = error?.message || 'Account creation failed. Please try again.';
      Alert.alert('Registration Error', errorMessage);
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
          <ThemedText type="title" style={styles.title}>Join Week Dump</ThemedText>
          <ThemedText style={styles.subtitle}>Start sharing your weekly photo stories</ThemedText>
        </ThemedView>

        {/* Create Account Form */}
        <ThemedView style={styles.formContainer}>
          <ThemedView style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Name</ThemedText>
            <TextInput
              style={[styles.textInput, { 
                color: colors.text, 
                borderColor: colors.icon + '40',
                backgroundColor: colors.background 
              }]}
              placeholder="Enter your full name"
              placeholderTextColor={colors.icon}
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </ThemedView>

          <ThemedView style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Email</ThemedText>
            <TextInput
              style={[styles.textInput, { 
                color: colors.text, 
                borderColor: colors.icon + '40',
                backgroundColor: colors.background 
              }]}
              placeholder="Enter your email address"
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
                placeholder="Create a password (min 6 characters)"
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
            style={[styles.createButton, { 
              backgroundColor: colors.tint,
              opacity: isLoading ? 0.7 : 1 
            }]}
            onPress={handleCreateAccount}
            disabled={isLoading}
          >
            <ThemedText style={styles.createButtonText}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </ThemedText>
          </TouchableOpacity>

          {/* Terms and Privacy */}
          <ThemedView style={styles.termsContainer}>
            <ThemedText style={styles.termsText}>
              By creating an account, you agree to our{' '}
              <ThemedText style={[styles.termsLink, { color: colors.tint }]}>
                Terms of Service
              </ThemedText>
              {' '}and{' '}
              <ThemedText style={[styles.termsLink, { color: colors.tint }]}>
                Privacy Policy
              </ThemedText>
            </ThemedText>
          </ThemedView>
        </ThemedView>

        {/* Sign In Link */}
        <ThemedView style={styles.signInContainer}>
          <ThemedText style={styles.signInText}>Already have an account? </ThemedText>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <ThemedText style={[styles.signInLink, { color: colors.tint }]}>
              Sign In
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Features Preview */}
        <ThemedView style={styles.featuresContainer}>
          <ThemedText style={styles.featuresTitle}>What you'll get:</ThemedText>
          <ThemedView style={styles.featuresList}>
            <ThemedView style={styles.featureItem}>
              <ThemedText style={styles.featureIcon}>📅</ThemedText>
              <ThemedText style={styles.featureText}>Weekly photo dumps with friends</ThemedText>
            </ThemedView>
            <ThemedView style={styles.featureItem}>
              <ThemedText style={styles.featureIcon}>👥</ThemedText>
              <ThemedText style={styles.featureText}>Join multiple friend groups</ThemedText>
            </ThemedView>
            <ThemedView style={styles.featureItem}>
              <ThemedText style={styles.featureIcon}>🎲</ThemedText>
              <ThemedText style={styles.featureText}>Fun weekly prompts and challenges</ThemedText>
            </ThemedView>
            <ThemedView style={styles.featureItem}>
              <ThemedText style={styles.featureIcon}>🔔</ThemedText>
              <ThemedText style={styles.featureText}>Daily reminders to capture moments</ThemedText>
            </ThemedView>
          </ThemedView>
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
  createButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  termsContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 18,
  },
  termsLink: {
    fontWeight: '600',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  signInText: {
    fontSize: 14,
  },
  signInLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  featuresContainer: {
    alignItems: 'center',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    opacity: 0.8,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    fontSize: 18,
  },
  featureText: {
    fontSize: 14,
    opacity: 0.7,
  },
}); 