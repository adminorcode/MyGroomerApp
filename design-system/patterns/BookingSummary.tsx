import { StyleSheet, View } from 'react-native'
import MGCard from '../components/MGCard'
import MGDivider from '../components/MGDivider'
import MGText from '../components/MGText'
import { useMGTheme } from '../theme/useMGTheme'

export type BookingSummaryRow = {
  label: string
  value: string
}

type Props = {
  title?: string
  rows: BookingSummaryRow[]
  totalLabel?: string
  totalValue?: string
  footnote?: string
}

export default function BookingSummary({
  title = 'Resumo',
  rows,
  totalLabel,
  totalValue,
  footnote,
}: Props) {
  const { spacing, fonts } = useMGTheme()

  return (
    <MGCard>
      <MGText variant="heading3">{title}</MGText>
      <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
        {rows.map((row) => (
          <View key={`${row.label}-${row.value}`} accessibilityLabel={`${row.label}: ${row.value}`} style={styles.row}>
            <MGText variant="bodySmall" color="secondary" style={styles.label}>
              {row.label}
            </MGText>
            <MGText variant="bodySmall" style={styles.value}>
              {row.value}
            </MGText>
          </View>
        ))}
      </View>
      {totalLabel && totalValue ? (
        <>
          <MGDivider spacing={spacing.md} />
          <View style={styles.row}>
            <MGText variant="title">{totalLabel}</MGText>
            <MGText variant="title" color="brand" style={{ fontFamily: fonts.bold }}>
              {totalValue}
            </MGText>
          </View>
        </>
      ) : null}
      {footnote ? (
        <MGText variant="caption" color="secondary" style={{ marginTop: spacing.sm }}>
          {footnote}
        </MGText>
      ) : null}
    </MGCard>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    flexShrink: 0,
  },
  value: {
    flex: 1,
    textAlign: 'right',
  },
})
