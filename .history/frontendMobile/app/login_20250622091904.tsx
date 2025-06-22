import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, View, Dimensions, Image, SafeAreaView } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const { login, isLoading, isLoggedIn } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Check if user is already logged in
  useEffect(() => {
    if (isLoggedIn) {
      router.replace('/splash');
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
      router.replace('/splash');
    } catch (error: any) {
      const errorMessage = error?.message || 'Login failed. Please try again.';
      Alert.alert('Login Error', errorMessage);
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.innerContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Custom Back Button - Hidden for login since it's an entry point */}
        {/* 
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <ThemedText style={styles.backButtonText}>←</ThemedText>
        </TouchableOpacity>
        */}

        {/* <View style={styles.topBeigeBox} /> */}
        {/* <View style={styles.topScribble} /> */}

        {/* Illustration */}
        <View style={styles.illustrationContainer}>
            <Image source={require('@/assets/images/dumpster-fire.png')} style={styles.dumpsterGif} resizeMode="contain" />
        </View>

        <View style={styles.welcomeContainer}>
          <ThemedText style={styles.welcomeText}>welcome back</ThemedText>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>email</ThemedText>
            <TextInput
              style={styles.textInput}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>password</ThemedText>
            <TextInput
              style={styles.textInput}
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              secureTextEntry={true}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity 
            style={styles.signInButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <ThemedText style={styles.signInButtonText}>
              {isLoading ? 'signing in...' : 'sign in'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.signUpContainer}>
          <ThemedText style={styles.signUpText}>Don't have an account? </ThemedText>
          <TouchableOpacity onPress={() => router.push('/create-account')}>
            <ThemedText style={styles.signUpLink}>Create one</ThemedText>
          </TouchableOpacity>
        </View>
        
        <View style={styles.bottomScribble} />

      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  innerContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 150, // space for bottom decor
  },

  // --- DECORATIONS ---
  topBeigeBox: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width * 0.7,
    height: 180,
    backgroundColor: '#F5EFE6',
    borderBottomRightRadius: 80,
  },
  topScribble: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 120,
    height: 40,
    borderWidth: 5,
    borderColor: '#E85D42',
    transform: [{ rotate: '-15deg' }],
  },
  bottomScribble: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    width: 60,
    height: 0,
    borderBottomWidth: 20,
    borderLeftWidth: 20,
    borderRightWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#E85D42',
    transform: [{ rotate: '120deg' }],
  },
  // --- ILLUSTRATION ---
  illustrationContainer: {
    alignItems: 'center',
    marginTop: height * 0.16,
    marginBottom: -40, // pull image down to overlap
  },
  dumpsterGif: {
    width: 190,
    height: 190,
  },
  // --- TEXT & FORM ---
  welcomeContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1C',
  },
  formSection: {
    paddingHorizontal: 40,
    marginTop: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    color: '#3C3C3C',
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#F5EFE6',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    color: '#1C1C1C',
  },
  signInButton: {
    backgroundColor: '#F7C52D',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  signInButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1C',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  signUpText: {
    color: '#A0A0A0',
  },
  signUpLink: {
    color: '#E85D42',
    fontWeight: 'bold',
    marginLeft: 5,
  },
}); 