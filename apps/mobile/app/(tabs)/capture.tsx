import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Alert, TextInput, ScrollView, ActivityIndicator, Image } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE } from '@/lib/api';

const PLACE_TYPES = [
  { v: 'CHURCH', l: '⛪ Église' },
  { v: 'MOSQUE', l: '🕌 Mosquée' },
  { v: 'SYNAGOGUE', l: '✡️ Synagogue' },
  { v: 'TEMPLE', l: '🛕 Temple' },
  { v: 'PUBLIC_SPACE', l: '🌆 Espace public' },
  { v: 'OTHER', l: '📍 Autre' }
];

export default function Capture() {
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const [step, setStep] = useState<'permissions' | 'camera' | 'review' | 'sending' | 'done'>('permissions');
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [recording, setRecording] = useState(false);
  const [media, setMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [authorName, setAuthorName] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [placeType, setPlaceType] = useState<string>('CHURCH');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [caption, setCaption] = useState('');
  const cameraRef = useRef<CameraView | null>(null);

  useEffect(() => {
    if (camPerm?.granted && (mode === 'photo' || micPerm?.granted)) {
      setStep('camera');
    }
  }, [camPerm?.granted, micPerm?.granted, mode]);

  async function requestAll() {
    await requestCam();
    await requestMic();
    const loc = await Location.requestForegroundPermissionsAsync();
    if (loc.granted) {
      const pos = await Location.getCurrentPositionAsync({});
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    }
  }

  async function takePhoto() {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
    if (photo) {
      setMedia({ uri: photo.uri, type: 'image' });
      setStep('review');
    }
  }

  async function startRecord() {
    if (!cameraRef.current) return;
    setRecording(true);
    try {
      const v = await cameraRef.current.recordAsync({ maxDuration: 30 });
      if (v?.uri) {
        setMedia({ uri: v.uri, type: 'video' });
        setStep('review');
      }
    } finally {
      setRecording(false);
    }
  }
  function stopRecord() {
    cameraRef.current?.stopRecording();
  }

  async function pickFromLibrary() {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false, quality: 0.85
    });
    if (!r.canceled && r.assets[0]) {
      setMedia({ uri: r.assets[0].uri, type: r.assets[0].type === 'video' ? 'video' : 'image' });
      setStep('review');
    }
  }

  async function send() {
    if (!media) return;
    setStep('sending');
    try {
      const fd = new FormData();
      // @ts-ignore - React Native FormData accepte ce format
      fd.append('file', { uri: media.uri, name: `upload.${media.type === 'video' ? 'mp4' : 'jpg'}`, type: media.type === 'video' ? 'video/mp4' : 'image/jpeg' });
      if (coords.lat) fd.append('latitude', String(coords.lat));
      if (coords.lng) fd.append('longitude', String(coords.lng));
      if (authorName) fd.append('authorName', authorName);
      if (placeName) fd.append('placeName', placeName);
      if (placeType) fd.append('placeType', placeType);
      if (city) fd.append('city', city);
      if (country) fd.append('country', country);
      if (caption) fd.append('caption', caption);
      fd.append('source', 'IOS');
      const r = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: fd });
      if (!r.ok) throw new Error(await r.text());
      setStep('done');
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible d\'envoyer');
      setStep('review');
    }
  }

  function reset() {
    setMedia(null); setAuthorName(''); setPlaceName(''); setCity(''); setCountry(''); setCaption('');
    setStep('camera');
  }

  if (step === 'done') {
    return (
      <View className="flex-1 bg-brand-dark items-center justify-center px-6">
        <View className="w-24 h-24 rounded-full bg-brand-pink/20 items-center justify-center mb-6">
          <Ionicons name="checkmark-circle" size={64} color="#FF2BB1" />
        </View>
        <Text className="text-3xl font-black text-white text-center mb-3">MERCI ❤</Text>
        <Text className="text-white/80 text-center mb-8 leading-6">
          Votre {media?.type === 'video' ? 'vidéo' : 'photo'} a été envoyée. Elle sera publiée après modération.
        </Text>
        <Pressable onPress={reset} className="bg-brand-pink rounded-full px-8 py-3">
          <Text className="text-white font-bold uppercase tracking-widest text-xs">En partager une autre</Text>
        </Pressable>
      </View>
    );
  }

  if (step === 'permissions' || !camPerm?.granted) {
    return (
      <View className="flex-1 bg-brand-dark items-center justify-center px-8">
        <Ionicons name="camera-outline" size={64} color="#FF2BB1" className="mb-6" />
        <Text className="text-2xl font-black text-white text-center mb-3">Partagez votre lumière</Text>
        <Text className="text-white/70 text-center mb-8 leading-6">
          Photographiez ou filmez-vous devant un lieu de culte avec l'affiche, et rejoignez le mouvement mondial.
          {'\n\n'}Pour fonctionner, l'application a besoin de votre caméra, micro (pour la vidéo) et position (optionnelle).
        </Text>
        <Pressable onPress={requestAll} className="bg-brand-pink rounded-full px-8 py-4">
          <Text className="text-white font-bold uppercase tracking-widest text-xs">Autoriser et continuer</Text>
        </Pressable>
        <Pressable onPress={pickFromLibrary} className="mt-4 px-8 py-3">
          <Text className="text-white/80 underline">Choisir depuis la galerie</Text>
        </Pressable>
      </View>
    );
  }

  if (step === 'sending') {
    return (
      <View className="flex-1 bg-brand-dark items-center justify-center">
        <ActivityIndicator size="large" color="#FF2BB1" />
        <Text className="text-white/80 mt-4">Envoi en cours…</Text>
      </View>
    );
  }

  if (step === 'review' && media) {
    return (
      <ScrollView className="flex-1 bg-brand-dark">
        <View className="aspect-[3/4] bg-black">
          <Image source={{ uri: media.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </View>
        <View className="p-5">
          <Text className="text-white font-bold text-lg mb-4">Détails (optionnel)</Text>
          <Field label="Votre prénom" value={authorName} onChange={setAuthorName} />
          <Field label="Nom du lieu" value={placeName} onChange={setPlaceName} placeholder="Notre-Dame de Paris" />
          <View className="mb-4">
            <Text className="text-xs text-white/60 mb-2 uppercase tracking-widest">Type de lieu</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {PLACE_TYPES.map((p) => (
                  <Pressable key={p.v} onPress={() => setPlaceType(p.v)}
                    className={`px-3 py-2 rounded-full border ${placeType === p.v ? 'bg-brand-pink border-brand-pink' : 'border-white/20'}`}>
                    <Text className={placeType === p.v ? 'text-white text-xs' : 'text-white/70 text-xs'}>{p.l}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1"><Field label="Ville" value={city} onChange={setCity} /></View>
            <View className="flex-1"><Field label="Pays" value={country} onChange={setCountry} /></View>
          </View>
          <Field label="Témoignage court (optionnel)" value={caption} onChange={setCaption} multiline />

          {coords.lat && (
            <Text className="text-white/40 text-xs mb-4">📍 Position auto : {coords.lat.toFixed(3)}, {coords.lng?.toFixed(3)}</Text>
          )}

          <View className="flex-row gap-2 mt-2">
            <Pressable onPress={() => setStep('camera')} className="flex-1 border-2 border-white/20 rounded-full py-4 items-center">
              <Text className="text-white font-bold uppercase text-xs tracking-widest">↺ Reprendre</Text>
            </Pressable>
            <Pressable onPress={send} className="flex-1 bg-brand-pink rounded-full py-4 items-center">
              <Text className="text-white font-bold uppercase text-xs tracking-widest">Envoyer ✓</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    );
  }

  // step = 'camera'
  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef as any}
        style={{ flex: 1 }}
        mode={mode === 'video' ? 'video' : 'picture'}
      />
      {/* Toggle mode */}
      <View className="absolute top-4 left-1/2 -translate-x-12 bg-black/60 rounded-full p-1 flex-row">
        <Pressable onPress={() => setMode('photo')} className={`px-4 py-2 rounded-full ${mode === 'photo' ? 'bg-brand-pink' : ''}`}>
          <Text className="text-white text-xs font-bold uppercase">Photo</Text>
        </Pressable>
        <Pressable onPress={() => setMode('video')} className={`px-4 py-2 rounded-full ${mode === 'video' ? 'bg-brand-pink' : ''}`}>
          <Text className="text-white text-xs font-bold uppercase">Vidéo</Text>
        </Pressable>
      </View>
      {/* Capture button */}
      <View className="absolute bottom-12 left-0 right-0 items-center">
        <Pressable
          onPress={mode === 'photo' ? takePhoto : (recording ? stopRecord : startRecord)}
          className={`w-20 h-20 rounded-full ${recording ? 'bg-red-500' : 'bg-white'} items-center justify-center border-4 border-white/30`}
        >
          {recording && <View className="w-6 h-6 rounded bg-white" />}
        </Pressable>
      </View>
      {/* Library button */}
      <Pressable onPress={pickFromLibrary} className="absolute bottom-16 right-8 w-12 h-12 rounded-full bg-black/50 items-center justify-center">
        <Ionicons name="images" size={20} color="white" />
      </Pressable>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, multiline }: any) {
  return (
    <View className="mb-4">
      <Text className="text-xs text-white/60 mb-2 uppercase tracking-widest">{label}</Text>
      <TextInput
        value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor="#555" multiline={multiline}
        className="bg-white/5 border border-white/15 rounded-xl px-3 py-3 text-white"
        style={{ minHeight: multiline ? 80 : undefined }}
      />
    </View>
  );
}
