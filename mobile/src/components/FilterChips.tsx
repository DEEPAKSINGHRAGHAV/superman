import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface FilterOption {
    label: string;
    value: any;
}

interface FilterChipsProps {
    title?: string;
    options: FilterOption[];
    selectedValue: any;
    onValueChange: (value: any) => void;
    style?: any;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
    title,
    options,
    selectedValue,
    onValueChange,
    style
}) => {
    const { theme } = useTheme();

    // Safety check for options
    if (!options || !Array.isArray(options) || options.length === 0) {
        return null;
    }

    const getChipStyle = (isSelected: boolean) => ({
        ...styles.chip,
        backgroundColor: isSelected ? theme.colors.primary[500] : theme.colors.surface,
        borderColor: isSelected ? theme.colors.primary[500] : theme.colors.border,
    });

    const getChipTextStyle = (isSelected: boolean) => ({
        ...styles.chipText,
        color: isSelected ? '#FFFFFF' : theme.colors.text,
    });

    return (
        <View style={[styles.container, style]}>
            {title && (
                <Text style={[styles.title, { color: theme.colors.text }]}>
                    {title}
                </Text>
            )}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {options.map((option, index) => (
                    <TouchableOpacity
                        key={index}
                        style={getChipStyle(selectedValue === option.value)}
                        onPress={() => onValueChange(option.value)}
                    >
                        <Text style={getChipTextStyle(selectedValue === option.value)}>
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    scrollContent: {
        paddingHorizontal: 16,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '500',
    },
});