import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { endpoints } from '@/lib/api';

export default function News() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [verse, setVerse] = useState('');

  useEffect(() => {
    endpoints.verse('').then((r) => setVerse(r.text || '')).catch(() => {});
  }, []);

  async function subscribe() {
    if (!email.includes('@')) return Alert.alert('Email invalide');
    setBusy(true);
    try {
      await endpoints.subscribeNewsletter(email);
      setDone(true);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
    setBusy(false);
  }

  return (
    <ScrollView className="flex-1 bg-brand-dark p-6">
      <Text className="text-3xl font-black text-white mb-2">Newsletter & inspiration</Text>
      <Text className="text-white/60 mb-8">Recevez chaque mois les nouvelles du mouvement et des messages inspirants.</Text>

      {/* Inscription newsletter */}
      <View className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
        <View className="flex-row items-center gap-2 mb-3">
          <Ionicons name="mail" size={18} color="#FF2BB1" />
          <Text className="text-white font-bold uppercase text-xs tracking-widest">S'abonner</Text>
        </View>
        {done ? (
          <View className="flex-row items-center gap-2">
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text className="text-emerald-400">Vérifie ta boîte mail pour confirmer.</Text>
          </View>
        ) : (
          <>
            <TextInput
              value={email} onChangeText={setEmail}
              placeholder="vous@email.com" placeholderTextColor="#555"
              autoCapitalize="none" keyboardType="email-address"
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-3 text-white mb-3"
            />
            <Pressable onPress={subscribe} disabled={busy} className="bg-brand-pink rounded-full py-3 items-center">
              {busy ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold uppercase tracking-widest text-xs">S'abonner</Text>}
            </Pressable>
          </>
        )}
      </View>

      {/* Verset du jour rafraîchissable */}
      <View className="bg-brand-pink/15 border border-brand-pink/30 rounded-2xl p-5 mb-6">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-xs uppercase tracking-widest text-brand-pink">Inspiration du jour</Text>
          <Pressable onPress={() => endpoints.verse('').then((r) => setVerse(r.text))}>
            <Ionicons name="refresh" size={16} color="#FF2BB1" />
          </Pressable>
        </View>
        <Text className="text-white text-base italic leading-7">{verse || '✨ Chargement…'}</Text>
      </View>
    </ScrollView>
  );
}
