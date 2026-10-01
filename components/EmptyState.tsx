import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface EmptyStateProps {
  symbol?: string;
  title: string;
  subtitle: string;
  ctaText?: string;
  onCtaPress?: () => void;
}

export function EmptyState({ symbol = '0', title, subtitle, ctaText, onCtaPress }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center py-10 px-5 bg-bg-primary">
      {/* Accent number/symbol */}
      <Text className="text-6xl font-display text-accent mb-4 tracking-tighter">
        {symbol}
      </Text>

      {/* Title */}
      <Text className="text-xl font-display text-text-primary text-center mb-2">
        {title}
      </Text>

      {/* Subtitle */}
      <Text className="text-sm font-body text-text-secondary text-center mb-8 max-w-[280px]">
        {subtitle}
      </Text>

      {/* CTA Button */}
      {ctaText && onCtaPress && (
        <TouchableOpacity
          onPress={onCtaPress}
          activeOpacity={0.85}
          className="bg-accent px-6 h-[52px] rounded-xl justify-center items-center"
        >
          <Text className="font-body-medium text-base text-text-inverse">
            {ctaText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
