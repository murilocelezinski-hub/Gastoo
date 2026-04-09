import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

function describeSlice(cx, cy, r, startAngle, endAngle) {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const sweep = endAngle - startAngle;
  const largeArc = sweep > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

/**
 * @param {{ label: string, value: number, color: string }[]} data
 */
export default function PieChart({
  data,
  size = 200,
  strokeColor = 'rgba(0,0,0,0.12)',
  emptyLabel = 'Sem dados',
}) {
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  const paths = useMemo(() => {
    if (total <= 0) return [];
    const cx = size / 2;
    const cy = size / 2;
    const r = Math.max(size / 2 - 8, 4);
    let angle = -Math.PI / 2;
    return data.map((d, i) => {
      const sweep = (d.value / total) * 2 * Math.PI;
      const startAngle = angle;
      const endAngle = angle + sweep;
      angle = endAngle;
      return {
        key: `${d.label}-${i}`,
        d: describeSlice(cx, cy, r, startAngle, endAngle),
        fill: d.color,
      };
    });
  }, [data, total, size]);

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
            <Path key={p.key} d={p.d} fill={p.fill} stroke={strokeColor} strokeWidth={1.25} strokeLinejoin="round" />
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
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#888', textAlign: 'center', paddingHorizontal: 12 },
});
