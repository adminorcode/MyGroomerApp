import { View, Pressable, StyleSheet } from 'react-native'
import { StarIcon } from 'lucide-react-native'
import { useTheme } from '../../context/ThemeContext'
import { spacing } from '../../constants/theme'

type StarRatingProps = {
    rating: number
    onRatingChange?: (val: number) => void
    size?: number
    readOnly?: boolean
}

const StarRating = ({ rating, onRatingChange, size = 28, readOnly = false }: StarRatingProps) => {
    const { colors } = useTheme()
    return (
        <View style={styles.starsContainer} accessibilityRole={readOnly ? 'image' : 'radiogroup'} accessibilityLabel={readOnly ? `${rating} de 5 estrelas` : 'Sua nota'}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} accessible={!readOnly} accessibilityRole={readOnly ? undefined : 'radio'} accessibilityLabel={`${star} ${star === 1 ? 'estrela' : 'estrelas'}`} accessibilityState={readOnly ? undefined : { checked: rating === star }} aria-checked={readOnly ? undefined : rating === star} disabled={readOnly || !onRatingChange} style={({ pressed }) => ({ minWidth: readOnly ? size : 48, minHeight: readOnly ? size : 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })} onPress={() => onRatingChange?.(star)}>
                    <StarIcon
                        size={size}
                        color={colors.primary}
                        fill={star <= rating ? colors.primary : 'transparent'}
                    />
                </Pressable>
            ))}
        </View>
    )
}


const styles = StyleSheet.create({
    starsContainer:{
        display:'flex',
        flexDirection:'row',
        gap:spacing.xs,
        justifyContent:'center',
        alignContent:'center'
    }
})

export default StarRating
