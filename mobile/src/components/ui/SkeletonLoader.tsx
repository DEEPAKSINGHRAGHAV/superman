import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface SkeletonLoaderProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
    width = '100%',
    height = 20,
    borderRadius = 4,
    style
}) => {
    const { theme } = useTheme();
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const opacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: theme.colors.border,
                    opacity,
                },
                style,
            ]}
        />
    );
};

interface BrandCardSkeletonProps {
    style?: ViewStyle;
}

export const BrandCardSkeleton: React.FC<BrandCardSkeletonProps> = ({ style }) => {
    const { theme } = useTheme();

    return (
        <View
            style={[
                {
                    backgroundColor: theme.colors.surface,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                },
                style,
            ]}
        >
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                    <SkeletonLoader width="60%" height={20} style={{ marginBottom: 8 }} />
                    <SkeletonLoader width="40%" height={14} />
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <SkeletonLoader width={70} height={24} borderRadius={12} />
                    <SkeletonLoader width={60} height={24} borderRadius={12} />
                </View>
            </View>

            {/* Description */}
            <SkeletonLoader width="100%" height={14} style={{ marginTop: 12, marginBottom: 4 }} />
            <SkeletonLoader width="80%" height={14} style={{ marginBottom: 12 }} />

            {/* Stats */}
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
                <SkeletonLoader width={100} height={16} />
                <SkeletonLoader width={80} height={16} />
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
                <SkeletonLoader width="33%" height={32} borderRadius={6} />
                <SkeletonLoader width="33%" height={32} borderRadius={6} />
                <SkeletonLoader width="33%" height={32} borderRadius={6} />
            </View>
        </View>
    );
};

interface CategoryCardSkeletonProps {
    style?: ViewStyle;
}

export const CategoryCardSkeleton: React.FC<CategoryCardSkeletonProps> = ({ style }) => {
    const { theme } = useTheme();

    return (
        <View
            style={[
                {
                    backgroundColor: theme.colors.surface,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                },
                style,
            ]}
        >
            {/* Header with icon */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <SkeletonLoader width={40} height={40} borderRadius={20} style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                        <SkeletonLoader width="60%" height={18} style={{ marginBottom: 8 }} />
                        <SkeletonLoader width="40%" height={14} />
                    </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <SkeletonLoader width={60} height={24} borderRadius={12} />
                </View>
            </View>

            {/* Description */}
            <SkeletonLoader width="100%" height={14} style={{ marginTop: 12, marginBottom: 4 }} />
            <SkeletonLoader width="70%" height={14} style={{ marginBottom: 12 }} />

            {/* Stats */}
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
                <SkeletonLoader width={100} height={16} />
                <SkeletonLoader width={80} height={16} />
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
                <SkeletonLoader width="25%" height={32} borderRadius={6} />
                <SkeletonLoader width="25%" height={32} borderRadius={6} />
                <SkeletonLoader width="25%" height={32} borderRadius={6} />
                <SkeletonLoader width="25%" height={32} borderRadius={6} />
            </View>
        </View>
    );
};

interface SkeletonListProps {
    count?: number;
    type?: 'brand' | 'category';
}

export const SkeletonList: React.FC<SkeletonListProps> = ({ count = 5, type = 'brand' }) => {
    const CardSkeleton = type === 'brand' ? BrandCardSkeleton : CategoryCardSkeleton;

    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <CardSkeleton key={index} />
            ))}
        </>
    );
};
