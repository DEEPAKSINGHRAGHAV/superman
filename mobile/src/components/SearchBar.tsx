import React, { useState } from 'react';
import {
    View,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Text,
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
    resultCount?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
    placeholder = 'Search...',
    value,
    onChangeText,
    onClear,
    onFilterPress,
    showFilter = false,
    style,
    resultCount,
}) => {
    const { theme } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    const handleClear = () => {
        if (onClear) {
            // If onClear is provided, let parent handle the clearing logic
            onClear();
        } else {
            // Otherwise, just clear the text
            onChangeText('');
        }
    };

    const getContainerStyle = () => ({
        ...styles.container,
        backgroundColor: theme.colors.surface,
        borderColor: isFocused ? theme.colors.primary[500] : theme.colors.border,
        borderWidth: isFocused ? 2 : 1,
        ...style,
    });

    const getInputStyle = () => ({
        ...styles.input,
        color: theme.colors.text,
    });

    const showResultCount = value.length > 0 && resultCount !== undefined;

    return (
        <View>
            <View style={getContainerStyle()}>
                <Icon
                    name="search"
                    size={22}
                    color={isFocused ? theme.colors.primary[500] : theme.colors.textSecondary}
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
                    autoCapitalize="words"
                />

                {value.length > 0 && (
                    <TouchableOpacity
                        onPress={handleClear}
                        style={styles.clearButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.6}
                    >
                        <Icon
                            name="cancel"
                            size={20}
                            color={theme.colors.textSecondary}
                        />
                    </TouchableOpacity>
                )}

                {showFilter && (
                    <TouchableOpacity
                        onPress={onFilterPress}
                        style={styles.filterButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.6}
                    >
                        <Icon
                            name="tune"
                            size={22}
                            color={theme.colors.primary[500]}
                        />
                    </TouchableOpacity>
                )}
            </View>

            {showResultCount && (
                <Text style={[styles.resultCount, { color: theme.colors.textSecondary }]}>
                    {resultCount} {resultCount === 1 ? 'result' : 'results'} found
                </Text>
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
        paddingHorizontal: 14,
        paddingVertical: 10,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    searchIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 4,
    },
    clearButton: {
        marginLeft: 8,
        padding: 4,
        borderRadius: 12,
    },
    filterButton: {
        marginLeft: 8,
        padding: 6,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderRadius: 8,
    },
    resultCount: {
        fontSize: 13,
        marginTop: 8,
        marginLeft: 2,
        fontStyle: 'italic',
    },
});

