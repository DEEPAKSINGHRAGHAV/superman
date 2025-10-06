import React, { useState } from 'react';
import {
    View,
    TextInput,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';

interface SearchBarProps {
    placeholder?: string;
    value: string;
    onChangeText: (text: string) => void;
    onClear?: () => void;
    onFilterPress?: () => void;
    showFilter?: boolean;
    style?: any;
}

export const SearchBar: React.FC<SearchBarProps> = ({
    placeholder = 'Search...',
    value,
    onChangeText,
    onClear,
    onFilterPress,
    showFilter = false,
    style,
}) => {
    const { theme } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    const handleClear = () => {
        onChangeText('');
        onClear?.();
    };

    const getContainerStyle = () => ({
        ...styles.container,
        backgroundColor: theme.colors.surface,
        borderColor: isFocused ? theme.colors.primary[500] : theme.colors.border,
        ...style,
    });

    const getInputStyle = () => ({
        ...styles.input,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily.regular,
    });

    return (
        <View style={getContainerStyle()}>
            <Icon
                name="search"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.searchIcon}
            />

            <TextInput
                style={getInputStyle()}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.placeholder}
                value={value}
                onChangeText={onChangeText}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
            />

            {value.length > 0 && (
                <TouchableOpacity
                    onPress={handleClear}
                    style={styles.clearButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Icon
                        name="clear"
                        size={20}
                        color={theme.colors.textSecondary}
                    />
                </TouchableOpacity>
            )}

            {showFilter && (
                <TouchableOpacity
                    onPress={onFilterPress}
                    style={styles.filterButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Icon
                        name="filter-list"
                        size={20}
                        color={theme.colors.primary[500]}
                    />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginVertical: 8,
    },
    searchIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 0,
    },
    clearButton: {
        marginLeft: 8,
        padding: 4,
    },
    filterButton: {
        marginLeft: 8,
        padding: 4,
    },
});

