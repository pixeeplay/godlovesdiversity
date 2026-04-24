import { useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList, Image, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { endpoints } from '@/lib/api';

const FILTERS = [
  { v: 'ALL', l: 'TOUT' },
  { v: 'CHURCH', l: 'ÉGLISES' },
  { v: 'MOSQUE', l: 'MOSQUÉES' },
  { v: 'SYNAGOGUE', l: 'SYNAGOGUES' },
  { v: 'TEMPLE', l: 'TEMPLES' }
];

export default function Gallery() {
  const router = useRouter();
  const [filter, setFilter] = useState('ALL');
  const [view, setView] = useState<'grid' | 'map'>('grid');
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const w = Dimensions.get('window').width;
  const cardSize = (w - 16 * 3) / 2;

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = { take: '100' };
      if (filter !== 'ALL') params.placeType = filter;
      const j = await endpoints.photos(params);
      setPhotos(j.photos || []);
    } catch {
      setPhotos([]);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, [filter]);

  const geo = photos.filter((p) => p.latitude && p.longitude);

  return (
    <View className="flex-1 bg-brand-dark">
      {/* Filtres */}
      <FlatList
        data={FILTERS}
        keyExtractor={(f) => f.v}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setFilter(item.v)}
            className={`px-4 py-2 rounded-full ${filter === item.v ? 'bg-brand-pink' : 'bg-white/10'}`}
          >
            <Text className={`text-xs font-bold tracking-widest ${filter === item.v ? 'text-white' : 'text-white/70'}`}>
              {item.l}
            </Text>
          </Pressable>
        )}
      />

      {/* View switcher */}
      <View className="flex-row gap-2 px-4 mb-3">
        <Pressable onPress={() => setView('grid')} className={`flex-1 py-2 rounded-full ${view === 'grid' ? 'bg-white/15' : 'bg-white/5'}`}>
          <Text className="text-center text-white text-xs font-bold uppercase">📷 Grille</Text>
        </Pressable>
        <Pressable onPress={() => setView('map')} className={`flex-1 py-2 rounded-full ${view === 'map' ? 'bg-white/15' : 'bg-white/5'}`}>
          <Text className="text-center text-white text-xs font-bold uppercase">🗺 Carte</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color="#FF2BB1" className="mt-12" />
      ) : view === 'grid' ? (
        <FlatList
          data={photos}
          keyExtractor={(p) => p.id}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
          columnWrapperStyle={{ gap: 16 }}
          ListEmptyComponent={<Text className="text-white/50 italic text-center mt-16">Aucune photo pour ce filtre.</Text>}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/photo/${item.id}`)} style={{ width: cardSize }} className="mb-4 rounded-xl overflow-hidden border border-white/10">
              <Image source={{ uri: item.url }} style={{ width: cardSize, height: cardSize }} resizeMode="cover" />
              <View className="p-2 bg-black/40 absolute inset-x-0 bottom-0">
                <Text className="text-white text-xs" numberOfLines={1}>📍 {item.city || item.country || '—'}</Text>
              </View>
            </Pressable>
          )}
        />
      ) : (
        <View className="flex-1">
          <MapView
            provider={PROVIDER_DEFAULT}
            style={{ flex: 1 }}
            initialRegion={{ latitude: 30, longitude: 5, latitudeDelta: 80, longitudeDelta: 80 }}
            customMapStyle={DARK_MAP}
          >
            {geo.map((p) => (
              <Marker
                key={p.id}
                coordinate={{ latitude: p.latitude, longitude: p.longitude }}
                title={p.placeName || p.city || ''}
                description={p.country || ''}
                pinColor="#FF2BB1"
                onCalloutPress={() => router.push(`/photo/${p.id}`)}
              />
            ))}
          </MapView>
        </View>
      )}
    </View>
  );
}

const DARK_MAP = [
  { elementType: 'geometry', stylers: [{ color: '#1d1024' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0314' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#aaa' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0314' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a1a35' }] }
];
