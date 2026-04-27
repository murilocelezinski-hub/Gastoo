import React, { useEffect, useMemo, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useThemeColors } from '../context/AppPreferencesContext';

const logo = require('../../assets/logo.png');

export default function SplashScreen({ navigation }) {
  const T = useThemeColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: T.chocolate,
          justifyContent: 'center',
          alignItems: 'center',
        },
        logo: {
          width: 280,
          height: 140,
        },
        subtitle: {
          fontFamily: 'Poppins_300Light',
          fontSize: 16,
          marginTop: 12,
          letterSpacing: 0.5,
        },
      }),
    [T]
  );
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 1200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={logo}
        style={[styles.logo, { opacity, transform: [{ scale }] }]}
        resizeMode="contain"
        accessibilityLabel="Logo Gastoo"
      />
      <Animated.Text style={[styles.subtitle, { opacity, color: T.brandFgMuted }]}>Seu companheiro de finanças</Animated.Text>
    </View>
  );
}
