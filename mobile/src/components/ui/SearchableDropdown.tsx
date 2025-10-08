import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface SearchableDropdownProps {
    label: string;
    placeholder?: string;
    value: string;
    onSelect: (value: string, item?: any) => void;
    options: any[];
    optionLabelKey?: string;
    optionValueKey?: string;
    required?: boolean;
    error?: string;
    disabled?: boolean;
    loading?: boolean;
    searchPlaceholder?: string;
    emptyMessage?: string;
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
    label,
    placeholder = 'Select an option',
    value,
    onSelect,
    options = [],
    optionLabelKey = 'name',
    optionValueKey = 'name',
    required = false,
    error,
    disabled = false,
    loading = false,
    searchPlaceholder = 'Search...',
    emptyMessage = 'No options available',
}) => {
    const { theme } = useTheme();
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredOptions, setFilteredOptions] = useState(options);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredOptions(options);
        } else {
            const filtered = options.filter((option) => {
                const label = option[optionLabelKey] || '';
                return label.toLowerCase().includes(searchQuery.toLowerCase());
            });
            setFilteredOptions(filtered);
        }
    }, [searchQuery, options, optionLabelKey]);

    const handleSelect = (item: any) => {
        const selectedValue = item[optionValueKey];
        onSelect(selectedValue, item);
        setModalVisible(false);
        setSearchQuery('');
    };

    const getDisplayValue = () => {
        if (!value) return placeholder;
        const selectedOption = options.find(
            (option) => option[optionValueKey] === value
        );
        return selectedOption ? selectedOption[optionLabelKey] : value;
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[
                styles.optionItem,
                {
                    backgroundColor:
                        item[optionValueKey] === value
                            ? theme.colors.primary['50']
                            : theme.colors.surface,
                    borderBottomColor: theme.colors.border,
                },
            ]}
            onPress={() => handleSelect(item)}
        >
            <View style={styles.optionContent}>
                <Text
                    style={[
                        styles.optionLabel,
                        {
                            color:
                                item[optionValueKey] === value
                                    ? theme.colors.primary['600']
                                    : theme.colors.text,
                            fontWeight: item[optionValueKey] === value ? '600' : '400',
                        },
                    ]}
                    numberOfLines={4}
                >
                    {item[optionLabelKey]}
                </Text>
                {item.description && (
                    <Text
                        style={[styles.optionDescription, { color: theme.colors.textSecondary }]}
                        numberOfLines={2}
                    >
                        {item.description}
                    </Text>
                )}
            </View>
            {item[optionValueKey] === value && (
                <Icon name="check" size={22} color={theme.colors.primary['600']} style={styles.checkIcon} />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.labelContainer}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                    {label}
                    {required && <Text style={{ color: theme.colors.error['500'] }}> *</Text>}
                </Text>
            </View>

            <TouchableOpacity
                style={[
                    styles.inputContainer,
                    {
                        backgroundColor: theme.colors.surface,
                        borderColor: error ? theme.colors.error['500'] : theme.colors.border,
                        opacity: disabled ? 0.6 : 1,
                    },
                ]}
                onPress={() => !disabled && setModalVisible(true)}
                disabled={disabled}
            >
                <Text
                    style={[
                        styles.inputText,
                        {
                            color: value ? theme.colors.text : theme.colors.textSecondary,
                        },
                    ]}
                    numberOfLines={4}
                    ellipsizeMode="tail"
                >
                    {getDisplayValue()}
                </Text>
                <Icon
                    name="arrow-drop-down"
                    size={24}
                    color={theme.colors.textSecondary}
                    style={{ marginTop: 0 }}
                />
            </TouchableOpacity>

            {error && (
                <Text style={[styles.errorText, { color: theme.colors.error['500'] }]}>
                    {error}
                </Text>
            )}

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View
                        style={[
                            styles.modalContent,
                            { backgroundColor: theme.colors.background },
                        ]}
                    >
                        {/* Header */}
                        <View
                            style={[
                                styles.modalHeader,
                                { borderBottomColor: theme.colors.border },
                            ]}
                        >
                            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                                {label}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={styles.closeButton}
                            >
                                <Icon name="close" size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Search Input */}
                        <View style={styles.searchContainer}>
                            <Icon
                                name="search"
                                size={20}
                                color={theme.colors.textSecondary}
                                style={styles.searchIcon}
                            />
                            <TextInput
                                style={[
                                    styles.searchInput,
                                    {
                                        backgroundColor: theme.colors.surface,
                                        color: theme.colors.text,
                                    },
                                ]}
                                placeholder={searchPlaceholder}
                                placeholderTextColor={theme.colors.textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity
                                    onPress={() => setSearchQuery('')}
                                    style={styles.clearButton}
                                >
                                    <Icon
                                        name="close"
                                        size={18}
                                        color={theme.colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Options List */}
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator
                                    size="large"
                                    color={theme.colors.primary['500']}
                                />
                                <Text
                                    style={[styles.loadingText, { color: theme.colors.textSecondary }]}
                                >
                                    Loading options...
                                </Text>
                            </View>
                        ) : filteredOptions.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Icon
                                    name="inbox"
                                    size={48}
                                    color={theme.colors.textSecondary}
                                />
                                <Text
                                    style={[styles.emptyText, { color: theme.colors.textSecondary }]}
                                >
                                    {searchQuery ? 'No results found' : emptyMessage}
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredOptions}
                                renderItem={renderItem}
                                keyExtractor={(item, index) =>
                                    item._id || item.id || index.toString()
                                }
                                style={styles.optionsList}
                                showsVerticalScrollIndicator={true}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    labelContainer: {
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 48,
    },
    inputText: {
        fontSize: 16,
        flex: 1,
        lineHeight: 20,
    },
    errorText: {
        fontSize: 12,
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '85%',
        minHeight: '60%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    closeButton: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 8,
    },
    searchIcon: {
        position: 'absolute',
        left: 28,
        zIndex: 1,
    },
    searchInput: {
        flex: 1,
        paddingLeft: 36,
        paddingRight: 36,
        paddingVertical: 10,
        borderRadius: 8,
        fontSize: 16,
    },
    clearButton: {
        position: 'absolute',
        right: 28,
        padding: 4,
    },
    optionsList: {
        flex: 1,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        minHeight: 56,
    },
    optionContent: {
        flex: 1,
        marginRight: 12,
        paddingRight: 8,
    },
    optionLabel: {
        fontSize: 16,
        lineHeight: 22,
        flexWrap: 'wrap',
    },
    optionDescription: {
        fontSize: 12,
        marginTop: 2,
    },
    checkIcon: {
        marginTop: 2,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 14,
        textAlign: 'center',
    },
});
