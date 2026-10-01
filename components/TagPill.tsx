import React from 'react';
import { Text, TouchableOpacity } from 'react-native';

interface TagPillProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

export function TagPill({ label, active = false, onPress, disabled = false }: TagPillProps) {
  return (
    <TouchableOpacity
      disabled={disabled || !onPress}
      onPress={onPress}
      activeOpacity={0.8}
      className={`px-2.5 py-1 rounded-full border ${
        active
          ? 'bg-accent-dim border-accent-border'
          : 'bg-bg-tertiary border-border'
      }`}
    >
      <Text
        className={`text-[11px] font-body-medium uppercase tracking-widest ${
          active ? 'text-accent' : 'text-text-secondary'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
