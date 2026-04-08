import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Alert, TouchableOpacity, Image, Dimensions, useColorScheme, ScrollView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useQuiz } from '@/src/hooks/useQuiz';
import { supabase } from '@/src/lib/supabase';
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import ImageColors from 'react-native-image-colors';

const { width, height } = Dimensions.get('window');

export default function QuizScreen() {
  const [guess, setGuess] = useState('');
  const { t } = useTranslation();
  
  const [currentBrand, setCurrentBrand] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dominantColor, setDominantColor] = useState<string | null>(null);

  // Hook relies on the dynamic target
  const { submitGuess } = useQuiz(currentBrand?.brand_name || '');

  React.useEffect(() => {
    async function loadBrands() {
      setLoading(true);
      const { data, error } = await supabase.from('quiz_brands').select('*').eq('is_active', true);
      if (data && data.length > 0) {
        const selected = data[Math.floor(Math.random() * data.length)];
        console.log('SUPABASE RETURNED IMAGE URL:', selected.image_url);
        setCurrentBrand(selected);
      }
      setLoading(false);
    }
    loadBrands();
  }, []);

  React.useEffect(() => {
    if (!currentBrand?.image_url) return;
    setDominantColor(null);
    ImageColors.getColors(currentBrand.image_url, { fallback: '#262626', cache: true, key: currentBrand.image_url })
      .then(colors => {
        const color =
          colors.platform === 'android' ? (colors.dominant ?? colors.vibrant ?? colors.muted) :
          colors.platform === 'ios' ? colors.background :
          colors.platform === 'web' ? colors.dominant :
          null;
        if (color) setDominantColor(color);
      })
      .catch(() => {});
  }, [currentBrand?.image_url]);

  
  const systemColorScheme = useColorScheme();
  const [overrideTheme, setOverrideTheme] = useState<'light' | 'dark' | null>(null);
  const currentTheme = overrideTheme || systemColorScheme || 'light';
  const isDark = currentTheme === 'dark';
  const insets = useSafeAreaInsets();

  const toggleTheme = () => {
    setOverrideTheme(isDark ? 'light' : 'dark');
  };

  let [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const [isRevealed, setIsRevealed] = useState(false);

  const handleCheck = () => {
    Keyboard.dismiss();
    const result = submitGuess(guess);
    if (result.success && !result.nearMatch) {
      setIsRevealed(true);
    } else if (result.nearMatch) {
      Alert.alert(t('quiz.nearMatch_title'), t('quiz.nearMatch_message', { guess }), [{ text: t('quiz.nearMatch_button') }]);
      setGuess('');
    } else {
      Alert.alert(t('quiz.incorrect_title'), t('quiz.incorrect_message'), [{ text: t('quiz.incorrect_button') }]);
    }
  };

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: isDark ? '#0e0e0e' : '#f9f9f9' }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0e0e0e' : '#f9f9f9', paddingTop: insets.top }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView 
          contentContainerStyle={[styles.container, { backgroundColor: isDark ? '#0e0e0e' : '#f9f9f9', paddingBottom: Math.max(insets.bottom + 24, 48), paddingTop: 64 }]}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Theme Toggle Button */}
          <TouchableOpacity 
            onPress={toggleTheme} 
            style={{ position: 'absolute', top: 60, right: 24, zIndex: 100, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#262626' : '#e2e2e2', borderRadius: 22 }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 22 }}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>

          {/* Mesh Gradient Background Mock */}
      <View style={[styles.meshBackground1, { backgroundColor: isDark ? 'rgba(255, 159, 74, 0.08)' : 'rgba(144, 77, 0, 0.05)' }]} />
      <View style={[styles.meshBackground2, { backgroundColor: isDark ? 'rgba(12, 182, 253, 0.05)' : 'rgba(0, 101, 143, 0.03)' }]} />
      
      {/* Background Decorative Element */}
      <View style={styles.decorativeBackground} pointerEvents="none">
        <View style={[styles.decPill, { backgroundColor: isDark ? '#1f2020' : '#e8e8e8' }]} />
        <View style={styles.decGrid}>
            <View style={[styles.decBox, { backgroundColor: isDark ? '#1f2020' : '#e8e8e8' }]} />
            <View style={[styles.decBox, { backgroundColor: isDark ? '#1f2020' : '#e8e8e8' }]} />
        </View>
      </View>

      {/* Section Header */}
      <View style={styles.headerContainer}>
        <View style={[styles.chapterBadge, { backgroundColor: isDark ? '#0cb6fd' : '#00658f', shadowColor: isDark ? '#0cb6fd' : '#00658f' }]}>
          <Text style={styles.chapterText}>{t('quiz.chapterBadge')}</Text>
        </View>
        <Text style={[styles.headerTitle, { color: '#ff8c00' }]}>{t('quiz.title')}</Text>
      </View>

      {/* The Glass Card */}
      <View style={styles.cardWrapper}>
        <View style={[styles.cardGlow, { backgroundColor: '#ff8c00', shadowColor: '#ff8c00' }]} />
        <BlurView intensity={isDark ? 20 : 40} tint={isDark ? "dark" : "light"} style={[styles.glassCard, { borderColor: isDark ? 'rgba(255, 159, 74, 0.3)' : 'rgba(144, 77, 0, 0.15)', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.4)' }]}>
          <View style={[styles.imageContainer, { backgroundColor: dominantColor ?? (isDark ? '#262626' : '#e2e2e2') }]}>
             <Image 
                source={{uri: currentBrand?.image_url || 'https://via.placeholder.com/512'}}
                style={styles.logoImage}
                resizeMode="contain"
             />
          </View>
          
          <View style={styles.inputContainer}>
              {isRevealed && currentBrand ? (
                <View style={[styles.inputSection, { marginTop: 12 }]}>
                  <View style={{ alignItems: 'center', marginBottom: 24, paddingHorizontal: 16 }}>
                    <Text style={[styles.revealTitle, { color: isDark ? '#0cb6fd' : '#00658f', textAlign: 'center', fontSize: 32 }]}>
                      {currentBrand.brand_name}
                    </Text>
                    <Text style={[styles.revealDescription, { color: isDark ? '#adaaaa' : '#564334', textAlign: 'center', marginTop: 12, lineHeight: 22 }]}>
                      {currentBrand.description}
                    </Text>
                  </View>    
              <TouchableOpacity onPress={async () => { 
                setIsRevealed(false); 
                setGuess(''); 
                const { data } = await supabase.from('quiz_brands').select('*').eq('is_active', true);
                if (data && data.length > 0) {
                  setCurrentBrand(data[Math.floor(Math.random() * data.length)]);
                }
              }} style={[styles.buttonShadow, { backgroundColor: isDark ? '#0cb6fd' : '#00658f', borderRadius: 28, height: 56, width: '100%', justifyContent: 'center', alignItems: 'center', shadowColor: isDark ? '#0cb6fd' : '#00658f' }]}>
                <Text style={[styles.kineticButtonText, { color: '#ffffff' }]}>{t('quiz.reveal_next')}</Text>
              </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.inputSection]}>
                  <TextInput
                    style={[
                      styles.ghostInput,
                      {
                        borderBottomColor: isDark ? '#484848' : '#ddc1ae',
                        color: isDark ? '#ffffff' : '#1a1c1c'
                      }
                    ]}
                    placeholder={t('quiz.guessBrand')}
                    placeholderTextColor={isDark ? '#adaaaa' : '#888888'}
                    value={guess}
                    onChangeText={setGuess}
                    autoCapitalize="words"
                    autoCorrect={false}
                    onSubmitEditing={handleCheck}
                  />

                  <TouchableOpacity onPress={handleCheck} style={[styles.buttonShadow, { width: '100%' }]}>
                    <LinearGradient 
                      colors={['#FF8C00', '#B92902']} 
                      start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                      style={styles.kineticButton}
                    >
                      <Text style={[styles.kineticButtonText, { color: '#ffffff' }]}>{t('quiz.check')}</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.secondaryButton}>
                    <Text style={[styles.secondaryButtonText, { color: isDark ? '#adaaaa' : '#564334' }]}>{t('quiz.iDontKnow')}</Text>
                  </TouchableOpacity>
                </View>
              )}
          </View>
        </BlurView>
      </View>

      {/* Progress Footer */}
      <View style={styles.footerContainer}>
        <View style={styles.progressSection}>
           <Text style={[styles.progressLabel, { color: isDark ? '#adaaaa' : '#564334' }]}>{t('quiz.progress')}</Text>
           <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#262626' : '#e2e2e2' }]}>
              <View style={[styles.progressBarFill, { backgroundColor: isDark ? '#0cb6fd' : '#00658f' }]} />
           </View>
        </View>
        <Text style={[styles.scoreText, { color: '#ff8c00' }]}>01<Text style={[styles.scoreTotal, { color: isDark ? '#adaaaa' : '#564334' }]}>/12</Text></Text>
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  meshBackground1: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width * 1.5,
    height: height * 1.5,
    borderRadius: 9999,
    transform: [{ translateX: -width/2 }, { translateY: -height/2 }],
    zIndex: 0,
  },
  meshBackground2: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: width,
    height: height,
    borderRadius: 9999,
    transform: [{ translateX: width/4 }, { translateY: height/4 }],
    zIndex: 0,
  },
  decorativeBackground: {
    position: 'absolute',
    top: 100,
    width: '100%',
    alignItems: 'center',
    opacity: 0.2,
    zIndex: 1,
  },
  inputSection: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  revealTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 28,
    textAlign: 'center',
    marginTop: 8,
  },
  revealDescription: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  decPill: {
    height: 48,
    width: '80%',
    borderRadius: 24,
    marginBottom: 16,
  },
  decGrid: {
    flexDirection: 'row',
    gap: 16,
    width: '80%',
  },
  decBox: {
    flex: 1,
    height: 160,
    borderRadius: 8,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 48,
    zIndex: 10,
  },
  chapterBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 16,
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 0 },
  },
  chapterText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 48,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: -1,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 600,
    position: 'relative',
    zIndex: 10,
  },
  cardGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 16,
    opacity: 0.15,
    shadowRadius: 30,
    shadowOpacity: 0.2,
  },
  glassCard: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16/9,
    borderRadius: 12,
    marginBottom: 40,
    overflow: 'hidden',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  inputContainer: {
    width: '100%',
  },
  ghostInput: {
    width: '100%',
    backgroundColor: 'transparent',
    borderBottomWidth: 2,
    paddingVertical: 16,
    paddingHorizontal: 8,
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_700Bold',
    textAlign: 'center',
    marginBottom: 32,
  },
  actionButtons: {
    gap: 16,
  },
  buttonShadow: {
    shadowColor: '#B92902',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  kineticButton: {
    width: '100%',
    paddingVertical: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kineticButtonText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 18,
    letterSpacing: 2,
  },
  secondaryButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  footerContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 48,
    zIndex: 10,
  },
  progressSection: {
    gap: 4,
  },
  progressLabel: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  progressBarBg: {
    height: 6,
    width: 128,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    width: '33%',
  },
  scoreText: {
    fontSize: 36,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  scoreTotal: {
    fontSize: 18,
  }
});
