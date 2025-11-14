import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';

interface DeleteConfirmModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  visible,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      {/* 불투명한 배경 */}
      <View style={styles.overlay}>
        {/* 모달 컨테이너 */}
        <View style={styles.modalContainer}>
          {/* 텍스트와 버튼을 하나로 묶은 컨테이너 */}
          <View style={styles.contentContainer}>
            {/* 텍스트 */}
            <View style={styles.textContainer}>
              <Text style={styles.titleText}>정말 녹음을</Text>
              <Text style={styles.titleText}>삭제하시나요?</Text>
            </View>
            
            {/* 버튼 컨테이너 */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={onConfirm}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // 불투명한 배경
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    width: 287,
    height: 194,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 24, // 위아래 패딩 24px
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10, // 텍스트와 버튼 사이 간격
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.56,
    textAlign: 'center',
    lineHeight: 42, // 1.5 line height
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 20,
    width: '100%',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#CECCD0',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#0A0A0A',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
  },
  confirmButton: {
    backgroundColor: '#B780FD',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#0A0A0A',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.44,
  },
});

export default DeleteConfirmModal;

