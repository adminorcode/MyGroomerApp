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
  /**
   * CMP-08 / R7: bilhete em dois blocos com recorte tracejado.
   * Só no resumo da solicitação (tela 18) e no detalhe do agendamento (tela 20).
   */
  ticket?: boolean
}

const NOTCH = 22

export default function BookingSummary({
  title = 'Resumo',
  rows,
  totalLabel,
  totalValue,
  footnote,
  ticket = false,
}: Props) {
  const { colors, spacing, radius, fonts, elevation } = useMGTheme()

  const rowsBlock = (
    <>
      <MGText variant="heading3">{title}</MGText>
      {/* Sem linhas, não reserva espaço: evita o vazio entre o título e o recorte do bilhete. */}
      {rows.length > 0 ? <View style={{ marginTop: spacing.base, gap: spacing.md }}>
        {rows.map((row) => (
          <View key={`${row.label}-${row.value}`} accessibilityLabel={`${row.label}: ${row.value}`} style={styles.row}>
            <MGText variant="body" color="secondary" style={styles.label}>
              {row.label}
            </MGText>
            <MGText variant="body" style={[styles.value, { fontFamily: fonts.semibold }]}>
              {row.value}
            </MGText>
          </View>
        ))}
      </View> : null}
    </>
  )

  const totalBlock = totalLabel && totalValue ? (
    <View style={styles.row} accessibilityLabel={`${totalLabel}: ${totalValue}`}>
      <MGText variant="title">{totalLabel}</MGText>
      {/* No bilhete o total vira o destaque de preço (priceLarge, teal sobre branco: R5). */}
      <MGText variant={ticket ? 'priceLarge' : 'title'} color="teal" style={ticket ? undefined : { fontFamily: fonts.bold }}>
        {totalValue}
      </MGText>
    </View>
  ) : null

  const footnoteBlock = footnote ? (
    <MGText variant="caption" color="secondary" style={{ marginTop: spacing.sm }}>
      {footnote}
    </MGText>
  ) : null

  if (!ticket) {
    return (
      <MGCard>
        {rowsBlock}
        {totalBlock ? (
          <>
            <MGDivider spacing={spacing.md} />
            {totalBlock}
          </>
        ) : null}
        {footnoteBlock}
      </MGCard>
    )
  }

  // Bilhete: dois blocos, recorte tracejado entre eles e meias-luas na cor do canvas.
  return (
    <View
      style={[
        styles.ticket,
        elevation.low,
        { backgroundColor: colors.surface.default, borderColor: colors.border.default, borderRadius: radius.xl },
      ]}
    >
      <View style={{ padding: spacing.base }}>{rowsBlock}</View>
      <View style={styles.perforation} accessible={false}>
        <View style={[styles.notch, styles.notchLeft, { backgroundColor: colors.surface.canvas, borderColor: colors.border.default }]} />
        <View style={[styles.dash, { borderColor: colors.border.default }]} />
        <View style={[styles.notch, styles.notchRight, { backgroundColor: colors.surface.canvas, borderColor: colors.border.default }]} />
      </View>
      {totalBlock || footnoteBlock ? (
        <View style={{ padding: spacing.base, backgroundColor: colors.surface.default, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl }}>
          {totalBlock}
          {footnoteBlock}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    flexShrink: 1,
    maxWidth: '42%',
  },
  value: {
    flex: 1,
    textAlign: 'right',
  },
  ticket: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  perforation: {
    height: NOTCH,
    justifyContent: 'center',
  },
  dash: {
    marginHorizontal: NOTCH,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  notch: {
    position: 'absolute',
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    borderWidth: 1,
    top: 0,
  },
  notchLeft: { left: -NOTCH / 2 },
  notchRight: { right: -NOTCH / 2 },
})
