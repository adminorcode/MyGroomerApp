import { ProfessionalRegistrationDraft } from '../screens/provider/professionalRegistrationModel'

// IndexedDB supports evidence files without the small synchronous localStorage quota.
function openDraftDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mygroomer-professional-registration', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('drafts')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Não foi possível abrir o rascunho neste navegador.'))
    request.onblocked = () => reject(new Error('Feche outras abas do cadastro e tente novamente.'))
  })
}

async function draftOperation<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDraftDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('drafts', mode)
    const request = operation(transaction.objectStore('drafts'))
    transaction.oncomplete = () => { database.close(); resolve(request.result) }
    transaction.onerror = () => { database.close(); reject(new Error('Não foi possível salvar o rascunho. Verifique o espaço disponível e tente novamente.')) }
    transaction.onabort = () => { database.close(); reject(new Error('O rascunho não foi salvo. Tente novamente.')) }
  })
}

export async function loadRegistrationDraft(): Promise<ProfessionalRegistrationDraft | null> {
  return (await draftOperation('readonly', store => store.get('guest'))) ?? null
}

export async function saveRegistrationDraft(value: ProfessionalRegistrationDraft) {
  await draftOperation('readwrite', store => store.put(value, 'guest'))
}

export async function clearRegistrationDraft() {
  await draftOperation('readwrite', store => store.delete('guest'))
}
