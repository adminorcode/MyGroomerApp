import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { borderRadius, fonts, spacing, typography } from "../../constants/theme";
import { TransactionStatus } from "../../types/transaction.types";

export default function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
    const { colors } = useTheme();

    const statusConfig: Record<TransactionStatus, { label: string; color: string; background: string }> = {
        [TransactionStatus.PENDING]: { label: 'Pending', color: colors.warning, background: colors.warningSoft },
        [TransactionStatus.COMPLETED]: { label: 'Completed', color: colors.success, background: colors.successSoft },
        [TransactionStatus.CANCELLED]: { label: 'Cancelled', color: colors.error, background: colors.errorSoft },
    }

    const { label, color, background } = statusConfig[status] ?? { label: status, color: colors.textSecondary, background: colors.surface }

    return (
        <View style={[styles.badge, { backgroundColor: background }]}>
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.lg,
        alignSelf: 'flex-start',
    },
    badgeText: {
        fontSize: typography.sizes.xs,
        fontFamily: fonts.medium,
        textTransform: 'capitalize',
    },
})
