import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { endpoints } from '@/lib/api';

const SUGGESTIONS = [
  'Que dit la Bible sur l\'homosexualité ?',
  'Existe-t-il des églises inclusives ?',
  'Comment concilier ma foi et mon identité ?'
];

type Msg = { role: 'user' | 'model'; text: string };

export default function Chat() {
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, [history]);

  async function send(q?: string) {
    const question = (q ?? input).trim(); if (!question) return;
    const next = [...history, { role: 'user' as const, text: question }];
    setHistory(next); setInput(''); setBusy(true);
    try {
      const r = await endpoints.chat(question, history);
      setHistory([...next, { role: 'model', text: r.text || 'Désolé, une erreur est survenue.' }]);
    } catch {
      setHistory([...next, { role: 'model', text: 'Pas de connexion. Réessaie dans un instant.' }]);
    }
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-brand-dark">
      <ScrollView ref={scrollRef} className="flex-1 px-4 py-4">
        {history.length === 0 && (
          <View className="mt-8">
            <Text className="text-white/70 text-center mb-6">
              ✨ Bonjour 🌈 Je suis GLD, l'assistant IA inclusif. Je réponds avec apaisement aux questions sur la foi et la diversité.
            </Text>
            <View className="gap-2">
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} onPress={() => send(s)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <Text className="text-white/90">{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {history.map((m, i) => (
          <View key={i} className={`mb-3 max-w-[85%] ${m.role === 'user' ? 'self-end' : 'self-start'}`}>
            <View className={`rounded-2xl px-4 py-3 ${m.role === 'user' ? 'bg-brand-pink' : 'bg-zinc-900 border border-zinc-800'}`}>
              <Text className="text-white">{m.text}</Text>
            </View>
          </View>
        ))}
        {busy && (
          <View className="self-start bg-zinc-900 border border-zinc-800 rounded-2xl px-3 py-2 flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#FF2BB1" />
            <Text className="text-white/60 text-xs">GLD réfléchit…</Text>
          </View>
        )}
      </ScrollView>
      <View className="flex-row gap-2 p-3 border-t border-white/10 bg-brand-ink">
        <TextInput
          value={input} onChangeText={setInput} placeholder="Pose ta question…" placeholderTextColor="#666"
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-3 text-white"
          onSubmitEditing={() => send()}
        />
        <Pressable onPress={() => send()} disabled={busy || !input} className="bg-brand-pink rounded-full w-12 h-12 items-center justify-center disabled:opacity-50">
          <Ionicons name="send" size={18} color="white" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
