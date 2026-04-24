import { View, Text, Pressable, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { API_BASE } from '@/lib/api';

export default function Profile() {
  const router = useRouter();

  function open(url: string) {
    WebBrowser.openBrowserAsync(url);
  }

  return (
    <ScrollView className="flex-1 bg-brand-dark p-6">
      <Text className="text-3xl font-black text-white mb-1">Profil & paramètres</Text>
      <Text className="text-white/60 mb-8">Préférences et raccourcis vers le mouvement.</Text>

      <Section title="🌟 Engagement">
        <Item icon="heart" label="Faire un don" onPress={async () => {
          const r = await fetch(`${API_BASE}/api/donate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 5 }) });
          const j = await r.json();
          if (j.url) open(j.url);
        }} />
        <Item icon="share-social" label="Partager l'app" onPress={() => open(`${API_BASE}`)} />
        <Item icon="sparkles" label="Demandez à GLD (chat IA)" onPress={() => router.push('/chat')} />
      </Section>

      <Section title="📸 Mes contributions">
        <Item icon="camera" label="Capturer une nouvelle photo" onPress={() => router.push('/capture')} />
        <Item icon="images" label="Voir la galerie" onPress={() => router.push('/gallery')} />
      </Section>

      <Section title="🌐 Le mouvement">
        <Item icon="document-text" label="Le message" onPress={() => open(`${API_BASE}/message`)} />
        <Item icon="library" label="L'argumentaire" onPress={() => open(`${API_BASE}/argumentaire`)} />
        <Item icon="download" label="Télécharger les affiches" onPress={() => open(`${API_BASE}/affiches`)} />
        <Item icon="newspaper" label="Newsletters" onPress={() => open(`${API_BASE}/newsletters`)} />
      </Section>

      <Section title="🛠 Admin">
        <Item icon="lock-closed" label="Connexion back-office" onPress={() => router.push('/login')} />
      </Section>

      <Section title="ℹ️ À propos">
        <Item icon="information-circle" label="À propos du mouvement" onPress={() => open(`${API_BASE}/a-propos`)} />
        <Item icon="shield-checkmark" label="Confidentialité (RGPD)" onPress={() => open(`${API_BASE}/rgpd`)} />
        <Item icon="document" label="Mentions légales" onPress={() => open(`${API_BASE}/mentions-legales`)} />
        <Item icon="mail" label="Contact" onPress={() => Linking.openURL('mailto:hello@godlovesdiversity.com')} />
      </Section>

      <Text className="text-white/30 text-xs text-center my-8">
        God Loves Diversity v1.0.0 · pixeeplay.com
      </Text>
    </ScrollView>
  );
}

function Section({ title, children }: any) {
  return (
    <View className="mb-6">
      <Text className="text-xs uppercase tracking-widest text-brand-pink mb-2">{title}</Text>
      <View className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">{children}</View>
    </View>
  );
}

function Item({ icon, label, onPress }: any) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center px-4 py-4 border-b border-white/5">
      <Ionicons name={icon} size={20} color="#FF2BB1" />
      <Text className="text-white text-base ml-3 flex-1">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#666" />
    </Pressable>
  );
}
