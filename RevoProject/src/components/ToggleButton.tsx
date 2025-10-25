import { FC } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface ToggleButtonProps {
  isOn: boolean;
  onToggle: (isOn: boolean) => void;
  top?: number;
}

const ToggleButton: FC<ToggleButtonProps> = ({ isOn, onToggle, top = 0 }) => {
  return (
    <View style={[styles.toggleContainer, { top }]}>
      <TouchableOpacity 
        style={[styles.toggleOn, { backgroundColor: isOn ? '#B780FF' : '#3A3A3A' }]}
        onPress={() => onToggle(true)}
      >
        <Text style={styles.toggleText}>켜기</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.toggleOff, { backgroundColor: !isOn ? '#B780FF' : '#3A3A3A' }]}
        onPress={() => onToggle(false)}
      >
        <Text style={styles.toggleText}>끄기</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  toggleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  toggleOn: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 136,
    borderWidth: 1,
    borderColor: '#555555',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleOff: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 136,
    height: 135,
    borderWidth: 1,
    borderColor: '#555555',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleText: {
    color: '#F5F5F5',
    fontSize: 60,
    fontWeight: '700',
    letterSpacing: 1.2,
    lineHeight: 90,
  },
});

export default ToggleButton;
