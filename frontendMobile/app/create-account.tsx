import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, View, Dimensions, Image, SafeAreaView } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import NavigationButtons from '@/components/NavigationButtons';

const { width, height } = Dimensions.get('window');

export default function CreateAccountScreen() {
  const colorScheme = useColorScheme();
  const { register, isLoading, isLoggedIn } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
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
      router.replace('/splash');
    } catch (error: any) {
      const errorMessage = error?.message || 'Account creation failed. Please try again.';
      Alert.alert('Registration Error', errorMessage);
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
                 {/* Navigation Buttons */}
         <NavigationButtons showGroupsButton={false} position="bottom" />

        <View style={styles.topBeigeBox} />
        <View style={styles.topScribble} />

        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <Image source={require('@/assets/images/dumpster-fire.png')} style={styles.dumpsterGif} resizeMode="contain" />
        </View>

        <View style={styles.welcomeContainer}>
          <ThemedText style={styles.welcomeText}>join the dump</ThemedText>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>name</ThemedText>
            <TextInput
              style={styles.textInput}
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

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
            style={styles.createButton}
            onPress={handleCreateAccount}
            disabled={isLoading}
          >
            <ThemedText style={styles.createButtonText}>
              {isLoading ? 'creating account...' : 'create account'}
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.termsContainer}>
            <ThemedText style={styles.termsText}>
              by creating an account, you agree to our terms
            </ThemedText>
          </View>
        </View>

        <View style={styles.signInContainer}>
          <ThemedText style={styles.signInText}>Already have an account? </ThemedText>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <ThemedText style={styles.signInLink}>Sign in</ThemedText>
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
    justifyContent: 'center',
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
    marginTop: height * 0.06,
    marginBottom: -15,
  },
  dumpsterGif: {
    width: 190,
    height: 190,
  },
  // --- TEXT & FORM ---
  welcomeContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  welcomeText: {
    fontSize: 28,
    height: 30,
    fontWeight: 'bold',
    color: '#1C1C1C',
  },
  formSection: {
    paddingHorizontal: 40,
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    color: '#3C3C3C',
    marginBottom: 5,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#F5EFE6',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    color: '#1C1C1C',
  },
  createButton: {
    backgroundColor: '#F7C52D',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1C',
  },
  termsContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  termsText: {
    fontSize: 12,
    color: '#A0A0A0',
    textAlign: 'center',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  signInText: {
    color: '#A0A0A0',
  },
  signInLink: {
    color: '#E85D42',
    fontWeight: 'bold',
    marginLeft: 5,
  },
}); 