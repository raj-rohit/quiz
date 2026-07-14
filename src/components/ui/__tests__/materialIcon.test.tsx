import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { MaterialIcons } from '@expo/vector-icons';

import { MaterialIcon, IconName } from '../MaterialIcon';

const glyphOf = (name: IconName): string => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<MaterialIcon name={name} size={14} color="#fff" />);
  });
  return tree.root.findByType(MaterialIcons).props.name;
};

const glyphMap = (MaterialIcons as unknown as { glyphMap: Record<string, number> }).glyphMap;

test('error maps to a real MaterialIcons glyph', () => {
  const glyph = glyphOf('error');
  expect(glyph).toBe('error');
  expect(glyphMap[glyph]).toBeDefined();
});

test('wifi_off maps to a real MaterialIcons glyph', () => {
  const glyph = glyphOf('wifi_off');
  expect(glyph).toBe('wifi-off');
  expect(glyphMap[glyph]).toBeDefined();
});
