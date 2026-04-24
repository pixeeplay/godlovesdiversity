import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0a0314' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '900', letterSpacing: 1 },
        tabBarStyle: { backgroundColor: '#050208', borderTopColor: '#222', height: 88 },
        tabBarActiveTintColor: '#FF2BB1',
        tabBarInactiveTintColor: '#888',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color }) => <Ionicons name="heart" size={22} color={color} />
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: 'Galerie',
          tabBarIcon: ({ color }) => <Ionicons name="images" size={22} color={color} />
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Capturer',
          tabBarIcon: ({ color }) => <Ionicons name="camera" size={28} color={color} />
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: 'News',
          tabBarIcon: ({ color }) => <Ionicons name="newspaper" size={22} color={color} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <Ionicons name="person-circle" size={22} color={color} />
        }}
      />
    </Tabs>
  );
}
