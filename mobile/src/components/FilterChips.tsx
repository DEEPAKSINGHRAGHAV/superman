import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { PRODUCT_CATEGORIES } from '../constants';

interface FilterChipsProps {
    selectedCategory: string | null;
    onCategorySelect: (category: string | null) => void;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
    selectedCategory,
    onCategorySelect,
}) => {
    const { theme } = useTheme();

    const formatCategoryName = (category: string) => {
        return category.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    const getChipStyle = (isSelected: boolean) => ({
        ...styles.chip,
        backgroundColor: isSelected ? theme.colors.primary[500] : theme.colors.surface,
        borderColor: isSelected ? theme.colors.primary[500] : theme.colors.border,
    });

    const getChipTextStyle = (isSelected: boolean) => ({
        ...styles.chipText,
        color: isSelected ? theme.colors.white : theme.colors.text,
    });

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* All Categories Chip */}
                <TouchableOpacity
                    style={getChipStyle(selectedCategory === null)}
                    onPress={() => onCategorySelect(null)}
                >
                    <Text style={getChipTextStyle(selectedCategory === null)}>
                        All
                    </Text>
                </TouchableOpacity>

                {/* Category Chips */}
                {PRODUCT_CATEGORIES.map((category) => (
                    <TouchableOpacity
                        key={category}
                        style={getChipStyle(selectedCategory === category)}
                        onPress={() => onCategorySelect(category)}
                    >
                        <Text style={getChipTextStyle(selectedCategory === category)}>
                            {formatCategoryName(category)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    scrollContent: {
        paddingRight: 16,
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


