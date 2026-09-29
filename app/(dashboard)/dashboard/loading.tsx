import { TestataPagina, SchedeContatori, ElencoRighe } from '@/components/scheletro'

export default function Caricamento() {
  return (
    <div>
      <TestataPagina />
      <SchedeContatori quante={3} />
      <ElencoRighe righe={3} />
    </div>
  )
}
