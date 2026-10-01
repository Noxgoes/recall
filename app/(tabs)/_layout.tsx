import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#7A7593',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#EDEAF7',
          borderTopWidth: 1.5,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={[styles.tabLabel, { color: focused ? '#6C63FF' : '#7A7593' }]}>
              Home
            </Text>
          ),
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={focused ? '#6C63FF' : '#7A7593'} />
          ),
        }}
        // Fix home icon mapping
        listeners={{
          tabPress: (e) => {
            // normal behavior
          },
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={[styles.tabLabel, { color: focused ? '#6C63FF' : '#7A7593' }]}>
              Library
            </Text>
          ),
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} size={22} color={focused ? '#6C63FF' : '#7A7593'} />
          ),
        }}
      />
      <Tabs.Screen
        name="save"
        options={{
          tabBarLabel: () => null,
          tabBarButton: (props) => (
            <TouchableOpacity
              onPress={props.onPress}
              activeOpacity={0.85}
              style={[styles.customTabButton, { top: -14 }]}
            >
              <View style={styles.customTabButtonInner}>
                <Ionicons name="add" size={28} color="#FFFFFF" />
              </View>
              <Text style={[styles.customTabButtonText, { color: props.accessibilityState?.selected ? '#6C63FF' : '#7A7593' }]}>
                Save
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={[styles.tabLabel, { color: focused ? '#6C63FF' : '#7A7593' }]}>
              Review
            </Text>
          ),
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'clipboard' : 'clipboard-outline'} size={22} color={focused ? '#6C63FF' : '#7A7593'} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={[styles.tabLabel, { color: focused ? '#7A6BFF' : '#7A7593' }]}>
              Settings
            </Text>
          ),
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={22} color={focused ? '#7A6BFF' : '#7A7593'} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  customTabButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
  },
  customTabButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 2,
  },
  customTabButtonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
});
