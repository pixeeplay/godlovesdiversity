import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Pressable, Image, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { endpoints, API_BASE } from '@/lib/api';
import { NeonHeartView } from '@/components/NeonHeart';

export default function Home() {
  const router = useRouter();
  const [verse, setVerse] = useState<string>('');
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [v, p] = await Promise.all([
        endpoints.verse('amour inclusif').catch(() => ({ text: '✨ Dieu est amour. La foi se conjugue au pluriel.' })),
        endpoints.photos({ take: '20' }).catch(() => ({ photos: [] }))
      ]);
      setVerse(v.text || '');
      setPhotos(p.photos || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function donate() {
    try {
      const r = await fetch(`${API_BASE}/api/donate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 5 })
      });
      const j = await r.json();
      if (j.url) {
        await WebBrowser.openBrowserAsync(j.url);
      }
    } catch {}
  }

  return (
    <ScrollView
      className="flex-1 bg-brand-dark"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#FF2BB1" />}
    >
      {/* Hero */}
      <LinearGradient colors={['#1a0530', '#0a0314']} className="px-6 pt-8 pb-12">
        <View className="items-center">
          <NeonHeartView size={140} />
          <Text className="text-xs uppercase tracking-[3px] text-white/60 mt-4">Mouvement interreligieux • 2026</Text>
          <Text className="text-5xl font-black text-brand-pink mt-3" style={{ textShadowColor: '#FF2BB1', textShadowRadius: 14 }}>
            GOD ❤
          </Text>
          <Text className="text-3xl font-black text-white -mt-1">LOVES DIVERSITY</Text>
          <Text className="text-base text-white/85 mt-5 text-center leading-6">
            Dieu n'est pas opposé aux personnes LGBT. L'amour, la justice et la compassion sont au cœur des grandes religions monothéistes.
          </Text>
          <View className="flex-row gap-2 mt-6 flex-wrap justify-center">
            <Pressable onPress={() => router.push('/gallery')} className="bg-brand-pink rounded-full px-5 py-3 flex-row items-center gap-2">
              <Ionicons name="images" size={14} color="white" />
              <Text className="text-white font-bold uppercase text-xs tracking-widest">Voir les photos</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/capture')} className="border-2 border-white/30 rounded-full px-5 py-3 flex-row items-center gap-2">
              <Ionicons name="camera" size={14} color="white" />
              <Text className="text-white font-bold uppercase text-xs tracking-widest">Participer</Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      {/* Verset du jour */}
      {verse ? (
        <View className="mx-6 -mt-6 mb-6 bg-brand-pink/20 border border-brand-pink/40 rounded-2xl p-5">
          <Text className="text-xs uppercase tracking-widest text-brand-pink mb-2">Inspiration du jour</Text>
          <Text className="text-white italic text-base leading-6">{verse}</Text>
        </View>
      ) : null}

      {/* CTA Don */}
      <Pressable onPress={donate} className="mx-6 mb-6 rounded-2xl overflow-hidden">
        <LinearGradient colors={['#FF2BB1', '#8B5CF6']} className="px-5 py-4 flex-row items-center justify-between">
          <View>
            <Text className="text-white font-black text-base">💖 Soutenir le mouvement</Text>
            <Text className="text-white/80 text-xs">Don rapide via Apple Pay · 5 €</Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={32} color="white" />
        </LinearGradient>
      </Pressable>

      {/* Carrousel photos */}
      <View className="mb-10">
        <View className="flex-row items-center justify-between px-6 mb-4">
          <View>
            <Text className="text-xs uppercase tracking-[3px] text-brand-pink">Galerie</Text>
            <Text className="text-2xl font-black text-white">À travers le monde</Text>
          </View>
          <Pressable onPress={() => router.push('/gallery')}>
            <Ionicons name="arrow-forward" size={22} color="#FF2BB1" />
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator color="#FF2BB1" className="mt-6" />
        ) : (
          <FlatList
            data={photos}
            keyExtractor={(p) => p.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(`/photo/${item.id}`)}
                className="w-56 rounded-2xl overflow-hidden border border-white/10 bg-white/5"
              >
                <Image source={{ uri: item.url }} style={{ width: '100%', height: 280 }} resizeMode="cover" />
                <View className="p-3">
                  {item.placeName && <Text className="text-white font-bold text-sm" numberOfLines={1}>{item.placeName}</Text>}
                  <Text className="text-white/60 text-xs" numberOfLines={1}>
                    📍 {item.city || ''}{item.country ? ', ' + item.country : ''}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>

      {/* Chat IA */}
      <Pressable onPress={() => router.push('/chat')} className="mx-6 mb-12 rounded-2xl bg-zinc-900 border border-zinc-800 p-5 flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-full bg-brand-pink/20 items-center justify-center">
          <Ionicons name="sparkles" size={20} color="#FF2BB1" />
        </View>
        <View className="flex-1">
          <Text className="text-white font-bold">Demandez à GLD</Text>
          <Text className="text-white/60 text-xs">Assistant IA inclusif · Foi & diversité</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </Pressable>
    </ScrollView>
  );
}
