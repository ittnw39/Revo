import { FC } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';

interface PageIndicatorProps {
  currentPage: number;
  totalPages: number;
  bottom?: number;
  onPageChange?: (page: number) => void;
}

const screenWidth = Dimensions.get('window').width;

const PageIndicator: FC<PageIndicatorProps> = ({ currentPage, totalPages, bottom = 92, onPageChange }) => {
  // 모든 페이지 수에서 동일한 간격 사용 (내기록 화면과 동일)
  // 모든 점은 원(14px)
  // 현재 페이지: #CECECE
  // 아닌 페이지: #2C2C2C
  // 간격: 모두 15px (내기록 화면과 동일)
  const dotWidth = 14;
  const gap = 15; // 내기록 화면과 동일한 간격

  // 전체 너비 계산
  let totalWidth = dotWidth * totalPages; // 모든 점의 너비
  if (totalPages > 1) {
    totalWidth += gap * (totalPages - 1); // 간격들
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
      {Array.from({ length: totalPages }, (_, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => onPageChange && onPageChange(index)}
          style={[
            styles.pageIndicatorTouchable,
            {
              marginLeft: index === 0 ? 0 : gap,
            }
          ]}
        >
          <View
            style={[
              styles.newPageDot,
              {
                backgroundColor: index === currentPage ? '#CECECE' : '#2C2C2C',
              }
            ]}
          />
        </TouchableOpacity>
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
  pageIndicatorTouchable: {
    width: 14,
    height: 14,
    justifyContent: 'center',
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
