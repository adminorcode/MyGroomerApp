import { StyleSheet, Text, View } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "../../navigation/types";
import { fonts, spacing, typography } from "../../constants/theme";
import BoameBtn from "../../components/shared/BoameBtn";
import { useTheme } from "../../context/ThemeContext";

type WelcomeScreenNavigationProp = StackNavigationProp<AuthStackParamList, "Welcome">;

type Props = {
    navigation: WelcomeScreenNavigationProp;
};

export default function WelcomeScreen({ navigation }: Props) {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.title, { color: colors.brand }]}>MyGroomer</Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
                Banho e tosa em domicílio
            </Text>
            <View style={styles.actions}>
                <BoameBtn title="Sou tutor" onPress={() => navigation.navigate("Login")} />
                <BoameBtn title="Sou profissional" onPress={() => navigation.navigate("Register")} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.huge,
    },
    title: {
        fontSize: typography.sizes.xxl,
        fontFamily: fonts.logo,
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: typography.sizes.md,
        fontFamily: fonts.regular,
        marginBottom: spacing.xxl,
    },
    actions: {
        width: "100%",
        maxWidth: 448,
        gap: spacing.md,
    },
});
