import { StyleSheet, View } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "../../navigation/types";
import { spacing } from "../../constants/theme";
import { MGButton, MGScreen, MGText } from "../../design-system/components";
import MGBrand from '../../design-system/components/MGBrand';
import MGArtwork from '../../design-system/components/MGArtwork';
import { useMGTheme } from '../../design-system/theme/useMGTheme';
import { Heart, Scissors } from 'lucide-react-native';

type WelcomeScreenNavigationProp = StackNavigationProp<AuthStackParamList, "Welcome">;

type Props = {
    navigation: WelcomeScreenNavigationProp;
};

export default function WelcomeScreen({ navigation }: Props) {
    const { colors, radius } = useMGTheme();
    return (
        <MGScreen scrollable contentStyle={styles.container}>
          <View style={styles.content}>
            <MGBrand />
            <MGText style={styles.centered}>O cuidado que seu pet merece, pertinho de você.</MGText>
            <View style={[styles.illustration, { backgroundColor: colors.surface.pinkSubtle, borderRadius: radius.xl }]}>
                <MGArtwork name="welcome" width={160} height={160} />
            </View>
            <MGText variant="heading3" accessibilityRole="header" style={styles.centered}>Como você deseja começar?</MGText>
            <View style={{ gap: spacing.md }}>
                <MGButton label="Sou tutor" iconLeft={<Heart size={spacing.lg} color={colors.onAction.primary} />} onPress={() => navigation.navigate('TutorRegister')} />
                <MGButton label="Sou profissional" variant="secondary" iconLeft={<Scissors size={spacing.lg} color={colors.action.primary} />} onPress={() => navigation.navigate('Register')} />
            </View>
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
        paddingTop: spacing.xl,
        alignItems: "center",
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.huge,
    },
    content: {
        width: '100%',
        maxWidth: 448,
        gap: spacing.lg,
    },
    centered: { textAlign: 'center' },
    illustration: { minHeight: 180, padding: spacing.md, alignItems: 'center', justifyContent: 'center' },
});
