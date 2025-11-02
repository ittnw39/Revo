import { FC } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

interface PageIndicatorProps {
  currentPage: number;
  totalPages: number;
  bottom?: number;
}

const screenWidth = Dimensions.get('window').width;

const PageIndicator: FC<PageIndicatorProps> = ({ currentPage, totalPages, bottom = 92 }) => {
  // 접근성 설정 (5개 페이지) 특별 스타일
  if (totalPages === 5) {
    // 모든 점은 원(14px)
    // 현재 페이지: #CECECE
    // 아닌 페이지: #2C2C2C
    // 간격: 모두 30px
    const dotWidth = 14;
    const gap = 14;
    const totalWidth = dotWidth * 5 + gap * 4; // 14*5 + 30*4 = 70 + 120 = 190px

    return (
      <View 
        style={[
          styles.pageIndicator,
          { 
            bottom,
            width: totalWidth,
            left: (screenWidth - totalWidth) / 2,
          }
        ]}
      >
        {Array.from({ length: 5 }, (_, index) => (
          <View
            key={index}
            style={[
              styles.newPageDot,
              {
                backgroundColor: index === currentPage ? '#CECECE' : '#2C2C2C',
                marginLeft: index === 0 ? 0 : gap,
              }
            ]}
          />
        ))}
      </View>
    );
  }

  // 일반 스타일 (1개, 2개, 3개, 4개 페이지)
  // 모든 점은 원(14px)
  // 현재 페이지: #CECECE
  // 아닌 페이지: #2C2C2C
  // 간격: 22px (첫 번째와 두 번째 사이), 나머지는 30px
  const dotWidth = 14;
  const firstGap = 22; // 첫 번째와 두 번째 사이
  const defaultGap = 30; // 나머지 간격

  // 전체 너비 계산 - 모든 점이 원이므로
  let totalWidth = dotWidth * totalPages; // 모든 점의 너비
  if (totalPages > 1) {
    totalWidth += firstGap + defaultGap * (totalPages - 2); // 간격들
  }

  return (
    <View 
      style={[
        styles.pageIndicator,
        { 
          bottom,
          width: totalWidth,
          left: (screenWidth - totalWidth) / 2,
        }
      ]}
    >
      {Array.from({ length: totalPages }, (_, index) => {
        const isFirst = index === 0;
        const isActive = index === currentPage;
        
        // 모든 점은 원(circle)
        // 현재 페이지: #CECECE
        // 아닌 페이지: #2C2C2C
        // 첫 번째 점은 marginLeft 없음
        // 두 번째 점은 firstGap (22px)
        // 나머지는 defaultGap (30px)
        const marginLeft = isFirst ? 0 : (index === 1 ? firstGap : defaultGap);
        
        return (
          <View
            key={index}
            style={[
              styles.newPageDot,
              { 
                backgroundColor: isActive ? '#CECECE' : '#2C2C2C',
                marginLeft: marginLeft,
              }
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  pageIndicator: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  newPageDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  newPageDotEllipse: {
    width: 15,
    height: 14,
  },
});

export default PageIndicator;
