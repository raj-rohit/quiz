import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { StyleProp, TextStyle } from 'react-native';

// Maps the design's Material Symbols names → @expo/vector-icons MaterialIcons glyphs.
const MAP = {
  explore: 'explore',
  sports_esports: 'sports-esports',
  person: 'person',
  language: 'language',
  expand_more: 'expand-more',
  expand_less: 'expand-less',
  play_arrow: 'play-arrow',
  check_circle: 'check-circle',
  stars: 'stars',
  star: 'star',
  schedule: 'schedule',
  lock: 'lock',
  lock_open: 'lock-open',
  fingerprint: 'fingerprint',
  shield: 'shield',
  info: 'info',
  smartphone: 'smartphone',
  dark_mode: 'dark-mode',
  task_alt: 'task-alt',
  local_fire_department: 'local-fire-department',
  bolt: 'bolt',
  workspace_premium: 'workspace-premium',
  arrow_forward: 'arrow-forward',
  restaurant: 'restaurant',
  graphic_eq: 'graphic-eq',
  sports_soccer: 'sports-soccer',
  travel_explore: 'travel-explore',
} as const;

export type IconName = keyof typeof MAP;

export function MaterialIcon({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  return <MaterialIcons name={MAP[name] as React.ComponentProps<typeof MaterialIcons>['name']} size={size} color={color} style={style} />;
}
