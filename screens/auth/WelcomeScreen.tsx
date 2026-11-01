import { StyleSheet, View } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "../../navigation/types";
import { spacing } from "../../constants/theme";
import { MGButton, MGScreen } from "../../design-system/components";
import { ProfileRoleSelector } from "../../design-system/patterns";
import { APP_NAME } from "../../constants/brand";

type WelcomeScreenNavigationProp = StackNavigationProp<AuthStackParamList, "Welcome">;

type Props = {
    navigation: WelcomeScreenNavigationProp;
};

export default function WelcomeScreen({ navigation }: Props) {
    return (
        <MGScreen scrollable contentStyle={styles.container}>
          <View style={styles.content}>
            <ProfileRoleSelector
                title={APP_NAME}
                subtitle="Banho e tosa em domicílio"
                tutorLabel="Sou tutor"
                groomerLabel="Sou profissional"
                onSelectTutor={() => navigation.navigate("TutorRegister")}
                onSelectGroomer={() => navigation.navigate("Register")}
            />
            <MGButton
                label="Já tem uma conta? Entrar"
                variant="tertiary"
                onPress={() => navigation.popTo("Login")}
            />
          </View>
        </MGScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.huge,
    },
    content: {
        width: '100%',
        maxWidth: 448,
        gap: spacing.xl,
    },
});
