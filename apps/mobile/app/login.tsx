import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE } from '@/lib/api';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function login() {
    // Pour le V1 mobile, on ouvre le BO web dans le browser intégré
    await WebBrowser.openBrowserAsync(`${API_BASE}/admin/login?email=${encodeURIComponent(email)}`);
    router.back();
  }

  return (
    <View className="flex-1 bg-brand-dark justify-center px-6">
      <View className="items-center mb-10">
        <Ionicons name="lock-closed" size={48} color="#FF2BB1" />
        <Text className="text-white text-2xl font-black mt-3">Back-office</Text>
        <Text className="text-white/60 text-center mt-2">Accès au panneau d'administration via ton navigateur sécurisé.</Text>
      </View>

      <TextInput
        value={email} onChangeText={setEmail} placeholder="email@example.com" placeholderTextColor="#555"
        autoCapitalize="none" keyboardType="email-address"
        className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-4 text-white mb-3"
      />
      <Pressable onPress={login} disabled={busy} className="bg-brand-pink rounded-full py-4 items-center mb-4">
        {busy ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold uppercase tracking-widest text-xs">Ouvrir le BO</Text>}
      </Pressable>
      <Pressable onPress={() => router.back()}>
        <Text className="text-white/60 text-center">Annuler</Text>
      </Pressable>
    </View>
  );
}
