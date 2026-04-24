import { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { endpoints } from '@/lib/api';

export default function PhotoDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [photo, setPhoto] = useState<any>(null);

  useEffect(() => {
    endpoints.photos({ take: '500' }).then((j) => {
      const p = j.photos?.find((x: any) => x.id === id);
      setPhoto(p);
    });
  }, [id]);

  if (!photo) return <ActivityIndicator color="#FF2BB1" className="mt-32" />;

  return (
    <ScrollView className="flex-1 bg-brand-dark">
      <Image source={{ uri: photo.url }} style={{ width: '100%', height: 480 }} resizeMode="cover" />
      <View className="p-6">
        {photo.placeName && <Text className="text-2xl font-black text-white mb-2">{photo.placeName}</Text>}
        <View className="flex-row items-center gap-2 mb-4">
          <Ionicons name="location" size={14} color="#FF2BB1" />
          <Text className="text-white/70">
            {photo.city || ''}{photo.city && photo.country ? ', ' : ''}{photo.country || ''}
          </Text>
        </View>
        {photo.placeType && (
          <View className="self-start bg-brand-pink/20 border border-brand-pink/40 rounded-full px-3 py-1 mb-4">
            <Text className="text-brand-pink text-xs font-bold">{photo.placeType}</Text>
          </View>
        )}
        {photo.caption && <Text className="text-white/80 italic text-base leading-7 mb-4">"{photo.caption}"</Text>}
        {photo.author && <Text className="text-white/50 text-sm">— {photo.author}</Text>}
      </View>
    </ScrollView>
  );
}
