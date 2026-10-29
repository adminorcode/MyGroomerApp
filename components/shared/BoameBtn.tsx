import {
    ActivityIndicator,
    Pressable,
    PressableProps,
    StyleSheet,
    Text,
    ViewStyle,
} from "react-native";
import { borderRadius, fonts, spacing, typography } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";

type Variant = "primary" | "secondary" | "outline" | "danger";

export type BoameBtnProps = Omit<PressableProps, "children"> & {
    title: string;
    variant?: Variant;
    loading?: boolean;
    fullWidth?: boolean;
};

export default function BoameBtn({
    title,
    variant = "primary",
    loading = false,
    disabled = false,
    fullWidth = true,
    style,
    ...props
}: BoameBtnProps) {
    const isDisabled = disabled || loading;
    const { colors } = useTheme();

    const contentColor = (pressed: boolean) => {
        if (isDisabled) return colors.onDisabled;
        if (variant === "outline") return colors.primary;
        if (variant === "secondary") return pressed ? colors.onSecondaryPressed : colors.onSecondary;
        if (variant === "danger") return colors.onError;
        return colors.onPrimary;
    };

    const variantStyle = (pressed: boolean): ViewStyle => {
        if (isDisabled) {
            return {
                backgroundColor: colors.disabled,
                borderWidth: 1,
                borderColor: colors.disabledBorder,
            };
        }
        if (variant === "outline") {
            return {
                backgroundColor: pressed ? colors.selectionSoft : "transparent",
                borderWidth: 1,
                borderColor: colors.primary,
            };
        }
        if (variant === "secondary") {
            return { backgroundColor: pressed ? colors.secondaryPressed : colors.secondary };
        }
        if (variant === "danger") {
            return { backgroundColor: pressed ? colors.errorPressed : colors.error };
        }
        return { backgroundColor: pressed ? colors.primaryPressed : colors.primary };
    };

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isDisabled, busy: loading }}
            disabled={isDisabled}
            style={({ pressed }) => [
                styles.base,
                fullWidth && styles.fullWidth,
                variantStyle(pressed),
                style as ViewStyle,
            ]}
            {...props}
        >
            {({ pressed }) =>
                loading ? (
                    <ActivityIndicator color={contentColor(pressed)} size="small" />
                ) : (
                    <Text style={[styles.label, { color: contentColor(pressed) }]}>{title}</Text>
                )
            }
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        alignItems: "center",
        justifyContent: "center",
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.sm + 4,
        paddingHorizontal: spacing.md,
        minHeight: 48,
    },
    fullWidth: {
        width: "100%",
    },
    label: {
        fontSize: typography.sizes.md,
        fontFamily: fonts.semibold,
    },
});
