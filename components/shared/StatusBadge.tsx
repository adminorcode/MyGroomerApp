import { StyleSheet, Text, View } from "react-native";
import { BookingStatus } from "../../types/booking.types";
import { useTheme } from "../../context/ThemeContext";
import { borderRadius, fonts, spacing, typography } from "../../constants/theme";



export default function StatusBadge({ status }: { status: BookingStatus }) {
    const { colors } = useTheme();
    
    const statusConfig: Record<BookingStatus, { label: string; color: string; background: string }> = {
        [BookingStatus.PENDING_PAYMENT]: { label: 'Pagamento pendente', color: colors.warning, background: colors.warningSoft },
        [BookingStatus.PENDING_CONFIRMATION]: { label: 'Aguardando confirmação', color: colors.warning, background: colors.warningSoft },
        [BookingStatus.CONFIRMED]: { label: 'Confirmado', color: colors.info, background: colors.infoSoft },
        [BookingStatus.IN_PROGRESS]: { label: 'Em andamento', color: colors.info, background: colors.infoSoft },
        [BookingStatus.COMPLETED]: { label: 'Concluído', color: colors.success, background: colors.successSoft },
        [BookingStatus.CANCELLED]: { label: 'Cancelado', color: colors.error, background: colors.errorSoft },
    }

    const { label, color, background } = statusConfig[status] ?? { label: status, color: colors.textSecondary, background: colors.surface }

    return (
        <View style={[styles.badge, { backgroundColor: background }]}>
        <Text style={[styles.badgeText, { color: color }]}>{label}</Text>
    </View>
    )
}

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.lg,
    },
    badgeText: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.medium,
        textTransform: 'capitalize'
    },
    label: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.medium,
        textTransform: 'capitalize'
    },
})