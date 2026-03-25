import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  type TouchableOpacityProps,
  type TextStyle,
  type StyleProp,
} from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  type?: 'primary' | 'secondary' | 'danger' | 'disabled';
  size?: 'normal' | 'small';
  textStyle?: StyleProp<TextStyle>;
}

const Button: React.FC<ButtonProps> = ({
  title,
  type = 'primary',
  size = 'normal',
  textStyle,
  style,
  ...restProps
}) => {
  const isDisabled = type === 'disabled';

  const buttonStyles = [
    styles.button,
    size === 'small' && styles.buttonSmall,
    type === 'primary' && styles.buttonPrimary,
    type === 'secondary' && styles.buttonSecondary,
    type === 'danger' && styles.buttonDanger,
    isDisabled && styles.buttonDisabled,
    style,
  ];

  const textStyles = [
    styles.text,
    size === 'small' && styles.textSmall,
    type === 'secondary' && styles.textSecondary,
    isDisabled && styles.textDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      disabled={isDisabled}
      {...restProps}
    >
      <Text style={textStyles}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#1890ff',
  },
  buttonSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#1890ff',
  },
  buttonDanger: {
    backgroundColor: '#ff4d4f',
  },
  buttonDisabled: {
    backgroundColor: '#d9d9d9',
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  textSmall: {
    fontSize: 12,
  },
  textSecondary: {
    color: '#1890ff',
  },
  textDisabled: {
    color: '#bfbfbf',
  },
});

export default Button;
