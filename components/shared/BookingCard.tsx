import { Pressable, Text, View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Calendar, ChevronRight, MapPin } from "lucide-react-native";
import { BookingCardTypes } from "../../types/booking.types";
import { useTheme } from "../../context/ThemeContext";
import { borderRadius, fonts, spacing, typography } from "../../constants/theme";
import StatusBadge from "./StatusBadge";
import { formatMoney } from "../../utils/formatMoney";

function formatScheduledAt(value: string) {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleString("pt-BR", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export function BookingCard({ service_name, provider_name, price, scheduled_at,
    customer_location, booking_status, showChevron, onPress, style,perspective, customer_name }: BookingCardTypes) {
    const { colors } = useTheme();

    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
                style as StyleProp<ViewStyle> || {},
            ]}
        >
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={[styles.serviceName, { color: colors.text }]} numberOfLines={1}>
                        {service_name}
                    </Text>
                    <StatusBadge status={booking_status} />
                </View>

                <Text style={[styles.provider, { color: colors.textSecondary }]}>
                    {perspective === 'provider'
                        ? `para ${customer_name} · ${formatMoney(price)}`
                        : `por ${provider_name} · ${formatMoney(price)}`}
                </Text>

                <View style={styles.row}>
                    <Calendar size={16} color={colors.textSecondary} />
                    <Text style={[styles.rowText, { color: colors.text }]} numberOfLines={1}>
                        {formatScheduledAt(scheduled_at)}
                    </Text>
                </View>

                <View style={styles.row}>
                    <MapPin size={16} color={colors.textSecondary} />
                    <Text style={[styles.rowText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {customer_location}
                    </Text>
                </View>
            </View>

            {showChevron && (
                <ChevronRight size={20} color={colors.textSecondary} />
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        marginBottom: spacing.sm,
    },
    content: {
        flex: 1,
        gap: spacing.xs,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.xs,
        gap: spacing.sm,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    rowText: {
        flex: 1,
        fontSize: typography.sizes.sm,
        fontFamily: fonts.medium,
    },
    serviceName: {
        flex: 1,
        fontSize: typography.sizes.md,
        fontFamily: fonts.semibold,
    },
    provider: {
        fontSize: typography.sizes.sm,
        fontFamily: fonts.regular,
        marginBottom: spacing.xs,
    },
});
