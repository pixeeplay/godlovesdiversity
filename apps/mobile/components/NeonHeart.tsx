import { View } from 'react-native';
import Svg, { Path, Defs, Filter, FeGaussianBlur, FeMerge, FeMergeNode } from 'react-native-svg';

const COLORS = ['#FF2BB1', '#8B5CF6', '#22D3EE', '#34D399', '#FBBF24', '#EF4444'];

/** Cœur néon multi-couches — version native */
export function NeonHeartView({ size = 160 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg viewBox="-100 -100 200 200" width="100%" height="100%">
        <Defs>
          <Filter id="g">
            <FeGaussianBlur stdDeviation="2.5" />
            <FeMerge>
              <FeMergeNode />
              <FeMergeNode in="SourceGraphic" />
            </FeMerge>
          </Filter>
        </Defs>
        {COLORS.map((c, i) => {
          const scale = 1 - i * 0.13;
          return (
            <Path
              key={i}
              d="M0,80 C-60,30 -90,-10 -60,-50 C-40,-75 -10,-65 0,-40 C10,-65 40,-75 60,-50 C90,-10 60,30 0,80 Z"
              transform={`scale(${scale})`}
              fill="none"
              stroke={c}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.95 - i * 0.08}
            />
          );
        })}
      </Svg>
    </View>
  );
}
