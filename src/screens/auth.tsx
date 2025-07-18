import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../lib/instant';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      await db.auth.sendMagicCode({ email: email.trim() });
      setStep('code');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      await db.auth.signInWithMagicCode({ email: email.trim(), code: code.trim() });
      onAuthSuccess();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setCode('');
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-1 px-6 justify-center">
        {/* Header */}
        <View className="mb-12">
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            {step === 'email' ? 'Welcome' : 'Verify Code'}
          </Text>
          <Text className="text-lg text-gray-600">
            {step === 'email' 
              ? 'Enter your email to get started' 
              : `We sent a code to ${email}`
            }
          </Text>
        </View>

        {step === 'email' ? (
          /* Email Step */
          <View className="space-y-6">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Email Address
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="w-full px-4 py-4 bg-gray-50 rounded-lg text-lg"
                style={{ fontSize: 16 }}
              />
            </View>

            <TouchableOpacity
              onPress={handleSendCode}
              disabled={isLoading}
              className={`w-full py-4 rounded-lg ${
                isLoading ? 'bg-gray-300' : 'bg-black'
              }`}
            >
              <Text className="text-white text-center text-lg font-medium">
                {isLoading ? 'Sending...' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Code Step */
          <View className="space-y-6">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Enter 6-digit code"
                keyboardType="number-pad"
                maxLength={6}
                className="w-full px-4 py-4 bg-gray-50 rounded-lg text-lg text-center"
                style={{ fontSize: 24, letterSpacing: 4 }}
              />
            </View>

            <TouchableOpacity
              onPress={handleVerifyCode}
              disabled={isLoading}
              className={`w-full py-4 rounded-lg ${
                isLoading ? 'bg-gray-300' : 'bg-black'
              }`}
            >
              <Text className="text-white text-center text-lg font-medium">
                {isLoading ? 'Verifying...' : 'Verify'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleBackToEmail}
              disabled={isLoading}
              className="w-full py-3"
            >
              <Text className="text-gray-600 text-center text-base">
                Back to email
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSendCode}
              disabled={isLoading}
              className="w-full py-3"
            >
              <Text className="text-gray-600 text-center text-base">
                Resend code
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer */}
        <View className="mt-12">
          <Text className="text-sm text-gray-500 text-center">
            By continuing, you agree to our Terms of Service
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
