import { TestataPagina, ElencoRighe } from '@/components/scheletro'

export default function Caricamento() {
  return (
    <div>
      <TestataPagina />
      <ElencoRighe righe={5} />
    </div>
  )
}
