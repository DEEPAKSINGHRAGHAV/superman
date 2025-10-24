import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundaryClass extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return <ErrorFallback error={this.state.error} />;
        }

        return this.props.children;
    }
}

const ErrorFallback: React.FC<{ error?: Error }> = ({ error }) => {
    const { theme } = useTheme();

    const handleRetry = () => {
        // This would typically reload the app or reset the error state
        console.log('Retry pressed');
    };

    const getContainerStyle = () => ({
        ...styles.container,
        backgroundColor: theme.colors.background,
    });

    const getTitleStyle = () => ({
        ...styles.title,
        color: theme.colors.text,
    });

    const getSubtitleStyle = () => ({
        ...styles.subtitle,
        color: theme.colors.textSecondary,
    });

    const getErrorTextStyle = () => ({
        ...styles.errorText,
        color: theme.colors.textSecondary,
    });

    return (
        <View style={getContainerStyle()}>
            <View style={styles.content}>
                <Icon name="error" size={64} color={theme.colors.error[500]} />

                <Text style={getTitleStyle()}>
                    Something went wrong
                </Text>

                <Text style={getSubtitleStyle()}>
                    We're sorry, but something unexpected happened
                </Text>

                {__DEV__ && error && (
                    <View style={[styles.errorContainer, { backgroundColor: theme.colors.gray[100] }]}>
                        <Text style={getErrorTextStyle()}>
                            {error.message}
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: theme.colors.primary[500] }]}
                    onPress={handleRetry}
                >
                    <Text style={styles.retryButtonText}>
                        Try Again
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export const ErrorBoundary: React.FC<Props> = (props) => {
    return <ErrorBoundaryClass {...props} />;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        marginTop: 20,
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    errorContainer: {
        padding: 16,
        borderRadius: 8,
        marginBottom: 24,
        width: '100%',
    },
    errorText: {
        fontSize: 12,
        fontFamily: 'monospace',
        textAlign: 'left',
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});






