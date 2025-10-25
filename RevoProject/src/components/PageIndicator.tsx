import { FC } from 'react';
import { View, StyleSheet } from 'react-native';

interface PageIndicatorProps {
  currentPage: number;
  totalPages: number;
  top?: number;
}

const PageIndicator: FC<PageIndicatorProps> = ({ currentPage, totalPages, top = 753 }) => {
  // 페이지 개수에 따른 전체 너비 계산
  // 점 하나: 8px, 간격: 8px, 마지막 점은 간격 없음
  const totalWidth = totalPages * 8 + (totalPages - 1) * 8; // 8px * totalPages + 8px * (totalPages - 1)

  return (
    <View 
      style={[
        styles.pageIndicator,
        { 
          top,
          width: totalWidth,
          left: '50%',
          transform: [{ translateX: -totalWidth / 2 }]
        }
      ]}
    >
      {Array.from({ length: totalPages }, (_, index) => (
        <View
          key={index}
          style={[
            styles.pageDot,
            { 
              backgroundColor: index === currentPage ? '#1B1B1B' : '#838383',
              marginRight: index < totalPages - 1 ? 8 : 0 // 마지막 점은 marginRight 없음
            }
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  pageIndicator: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default PageIndicator;
