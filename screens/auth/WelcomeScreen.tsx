import { StyleSheet, View } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "../../navigation/types";
import { spacing } from "../../constants/theme";
import { ProfileRoleSelector } from "../../design-system/patterns";
import { useTheme } from "../../context/ThemeContext";

type WelcomeScreenNavigationProp = StackNavigationProp<AuthStackParamList, "Welcome">;

type Props = {
    navigation: WelcomeScreenNavigationProp;
};

export default function WelcomeScreen({ navigation }: Props) {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ProfileRoleSelector
                title="MyGroomer"
                subtitle="Banho e tosa em domicílio"
                tutorLabel="Sou tutor"
                groomerLabel="Sou profissional"
                onSelectTutor={() => navigation.navigate("Login")}
                onSelectGroomer={() => navigation.navigate("Register")}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.huge,
    },
});
