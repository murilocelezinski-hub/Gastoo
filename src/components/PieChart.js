import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { T } from '../theme';

// Gera path de arco para donut chart (anel)
function describeDonutSlice(cx, cy, outerR, innerR, startAngle, endAngle) {
  const cos = Math.cos;
  const sin = Math.sin;
  const ox1 = cx + outerR * cos(startAngle);
  const oy1 = cy + outerR * sin(startAngle);
  const ox2 = cx + outerR * cos(endAngle);
  const oy2 = cy + outerR * sin(endAngle);
  const ix1 = cx + innerR * cos(endAngle);
  const iy1 = cy + innerR * sin(endAngle);
  const ix2 = cx + innerR * cos(startAngle);
  const iy2 = cy + innerR * sin(startAngle);
  const sweep = endAngle - startAngle;
  const largeArc = sweep > Math.PI ? 1 : 0;
  return [
    `M ${ox1} ${oy1}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2}`,
    `L ${ix1} ${iy1}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
    'Z',
  ].join(' ');
}

/**
 * Donut chart — substitui o PieChart sólido conforme Design System.
 * @param {{ label: string, value: number, color: string }[]} data
 */
export default function PieChart({
  data,
  size = 200,
  strokeColor = 'rgba(0,0,0,0.08)',
  emptyLabel = 'Sem dados',
  // Espessura do anel como fração do raio externo (padrão 38%)
  donutRatio = 0.38,
}) {
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  const paths = useMemo(() => {
    if (total <= 0) return [];
    const cx = size / 2;
    const cy = size / 2;
    const outerR = Math.max(size / 2 - 6, 4);
    const innerR = outerR * (1 - donutRatio);
    let angle = -Math.PI / 2;
    return data.map((d, i) => {
      const sweep = (d.value / total) * 2 * Math.PI;
      // Evita slice invisível para valores muito pequenos
      const safeSweep = Math.max(sweep, 0.005);
      const startAngle = angle;
      const endAngle = angle + safeSweep;
      angle = angle + sweep;
      return {
        key: `${d.label}-${i}`,
        d: describeDonutSlice(cx, cy, outerR, innerR, startAngle, endAngle),
        fill: d.color,
      };
    });
  }, [data, total, size, donutRatio]);

  if (total <= 0) {
    return (
      <View style={[styles.emptyWrap, { width: size, height: size }]}>
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.holder, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <G>
          {paths.map((p) => (
            <Path key={p.key} d={p.d} fill={p.fill} stroke={strokeColor} strokeWidth={1.5} strokeLinejoin="round" />
          ))}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  holder: { alignItems: 'center', justifyContent: 'center' },
  svg: { backgroundColor: 'transparent' },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: T.grayMed, textAlign: 'center', paddingHorizontal: 12 },
});
