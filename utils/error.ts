import axios from 'axios'

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Não foi possível conectar. Verifique sua internet e tente novamente.'
    return typeof error.response.data?.message === 'string' ? error.response.data.message : 'Não foi possível concluir a operação.'
  }
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação.'
}
