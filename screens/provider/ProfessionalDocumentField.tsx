import { useRef, useState } from 'react'
import { MGTextField } from '../../design-system/components'
import { editDocument, formatDocument } from './documentMask'

type Props = {
  value: string
  onChange: (digits: string) => void
  onBlur: () => void
  editable: boolean
  error?: string
}

export default function ProfessionalDocumentField({ value, onChange, onBlur, editable, error }: Props) {
  const [selection, setSelection] = useState<{ start: number; end: number }>()
  const lastKey = useRef('')
  return (
    <MGTextField
      required
      label="CPF / CNPJ"
      placeholder="Digite seu CPF ou CNPJ"
      value={formatDocument(value)}
      maxLength={18}
      keyboardType="number-pad"
      autoCorrect={false}
      editable={editable}
      selection={selection}
      onKeyPress={event => { lastKey.current = event.nativeEvent.key }}
      onSelectionChange={event => setSelection(event.nativeEvent.selection)}
      onChangeText={next => {
        const edited = editDocument(formatDocument(value), next, lastKey.current === 'Delete')
        lastKey.current = ''
        onChange(edited.digits)
        setSelection({ start: edited.caret, end: edited.caret })
      }}
      onBlur={onBlur}
      error={error}
    />
  )
}
